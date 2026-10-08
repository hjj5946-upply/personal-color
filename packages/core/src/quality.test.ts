import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { QualityConfigNotSetError, type QualityConfigDraft } from "./quality-config";
import type { QualityMeasurements } from "./quality-measurements";
import { evaluateQuality, QUALITY_REASON_CODES, type QualityCheckId, type QualityResult } from "./quality";
import { TEST_QUALITY_CONFIG as T } from "./testing/quality-test-config";

// 테스트용 기준(T): face_size 10~90, face_angle -20~20, brightness 40~220,
// color_cast 실패 >30 · 경고 >15, sharpness 실패 <50, filter_suspicion 경고 >0.5
const GOOD: Required<QualityMeasurements> = {
  faceCount: 1,
  faceSize: 50,
  faceAngle: 0,
  brightness: 120,
  colorCast: 5,
  sharpness: 100,
  filterSuspicion: 0.1,
};
const run = (m: QualityMeasurements, c: QualityConfigDraft = T) => evaluateQuality(m, c);
const check = (r: QualityResult, id: QualityCheckId) => r.checks.find((c) => c.id === id);
const without = (k: keyof QualityMeasurements): QualityMeasurements => {
  const m: QualityMeasurements = { ...GOOD };
  delete m[k];
  return m;
};

describe("evaluateQuality — 기본", () => {
  it("모두 정상이면 통과, 플래그 없음, 항목 순서 고정", () => {
    const r = run(GOOD);
    expect(r.status).toBe("pass");
    expect(r.qualityFlags).toEqual([]);
    expect(r.lowersConfidence).toBe(false);
    expect(r.checks.map((c) => c.id)).toEqual([
      "face_count",
      "face_size",
      "face_angle",
      "brightness",
      "color_cast",
      "sharpness",
      "filter_suspicion",
    ]);
    expect(r.checks.every((c) => c.status === "pass" && c.reason === undefined)).toBe(true);
  });
  it("실제 기준(미정)으로 판정하면 '미설정' 오류", () => {
    expect(() => evaluateQuality(GOOD)).toThrow(QualityConfigNotSetError);
  });
});

describe("항목별: 통과·실패·경고·경계값 (테스트용 수치)", () => {
  const cases: [QualityCheckId, keyof QualityMeasurements, number, "pass" | "warn" | "fail", string?][] = [
    // 얼굴 크기 10~90
    ["face_size", "faceSize", 10, "pass"],
    ["face_size", "faceSize", 90, "pass"],
    ["face_size", "faceSize", 9.99, "fail", "face_size_low"],
    ["face_size", "faceSize", 90.01, "fail", "face_size_high"],
    // 얼굴 각도 -20~20
    ["face_angle", "faceAngle", -20, "pass"],
    ["face_angle", "faceAngle", 20.5, "fail", "face_angle_high"],
    ["face_angle", "faceAngle", -21, "fail", "face_angle_low"],
    // 밝기 40~220 (어두움 / 과다 노출)
    ["brightness", "brightness", 40, "pass"],
    ["brightness", "brightness", 220, "pass"],
    ["brightness", "brightness", 39, "fail", "brightness_low"],
    ["brightness", "brightness", 221, "fail", "brightness_high"],
    // 색 편향: 15 이하 통과, 15 초과 경고, 30 초과 실패 (두 단계)
    ["color_cast", "colorCast", 15, "pass"],
    ["color_cast", "colorCast", 15.01, "warn", "color_cast_high"],
    ["color_cast", "colorCast", 30, "warn", "color_cast_high"],
    ["color_cast", "colorCast", 30.01, "fail", "color_cast_high"],
    // 선명도 50 이상
    ["sharpness", "sharpness", 50, "pass"],
    ["sharpness", "sharpness", 49.9, "fail", "sharpness_low"],
    // 보정·필터 의심: 0.5 초과 경고, 아무리 커도 실패는 없음
    ["filter_suspicion", "filterSuspicion", 0.5, "pass"],
    ["filter_suspicion", "filterSuspicion", 0.51, "warn", "filter_suspicion_high"],
    ["filter_suspicion", "filterSuspicion", 1e9, "warn", "filter_suspicion_high"],
  ];
  for (const [id, key, value, status, reason] of cases) {
    it(`${id}: ${value} → ${status}${reason ? ` (${reason})` : ""}`, () => {
      const r = run({ ...GOOD, [key]: value });
      expect(check(r, id)).toEqual(reason ? { id, status, reason } : { id, status });
      // 다른 항목은 영향을 받지 않음
      expect(r.checks.filter((c) => c.id !== id).every((c) => c.status === "pass")).toBe(true);
    });
  }
  it("경고 기준을 켜면 어느 항목이든 경고 단계를 가질 수 있다 (예: 밝기)", () => {
    const c: QualityConfigDraft = { ...T, brightness: { ...T.brightness, warn: { min: 60, max: 200 } } };
    expect(check(run({ ...GOOD, brightness: 50 }, c), "brightness")).toEqual({
      id: "brightness",
      status: "warn",
      reason: "brightness_low",
    });
    expect(check(run({ ...GOOD, brightness: 30 }, c), "brightness")?.status).toBe("fail");
  });
});

describe("전체 결과 합산", () => {
  it("실패 + 경고 → 실패", () => {
    expect(run({ ...GOOD, brightness: 10, colorCast: 20 }).status).toBe("fail");
  });
  it("경고만 → 경고 (진행 가능)", () => {
    expect(run({ ...GOOD, colorCast: 20 }).status).toBe("warn");
  });
  it("통과 + 건너뜀 → 통과", () => {
    const r = run(without("filterSuspicion"));
    expect(check(r, "filter_suspicion")).toEqual({
      id: "filter_suspicion",
      status: "skipped",
      reason: "skipped_unmeasured",
    });
    expect(r.status).toBe("pass");
  });
  it("보정·필터 의심 경고면 신뢰도 하향 표시, 다른 경고는 아님", () => {
    expect(run({ ...GOOD, filterSuspicion: 0.9 }).lowersConfidence).toBe(true);
    expect(run({ ...GOOD, colorCast: 20 }).lowersConfidence).toBe(false);
  });
});

describe("얼굴 수와 측정 불가", () => {
  it("0명 → 실패(face_not_found), 얼굴 기반 항목은 측정값이 있어도 건너뜀", () => {
    const r = run({ ...GOOD, faceCount: 0 });
    expect(r.status).toBe("fail");
    expect(check(r, "face_count")).toEqual({ id: "face_count", status: "fail", reason: "face_not_found" });
    expect(check(r, "face_size")).toEqual({ id: "face_size", status: "skipped", reason: "skipped_no_face" });
    expect(check(r, "face_angle")).toEqual({ id: "face_angle", status: "skipped", reason: "skipped_no_face" });
    expect(check(r, "brightness")?.status).toBe("pass"); // 얼굴 기반이 아닌 항목은 그대로 판정
  });
  it("2명 이상 → 실패(face_multiple)", () => {
    for (const n of [2, 5]) expect(check(run({ ...GOOD, faceCount: n }), "face_count")?.reason).toBe("face_multiple");
  });
  it("얼굴 수를 못 재면 → 실패(face_count_unmeasured), 얼굴 기반 항목 건너뜀", () => {
    const r = run(without("faceCount"));
    expect(check(r, "face_count")).toEqual({ id: "face_count", status: "fail", reason: "face_count_unmeasured" });
    expect(check(r, "face_size")?.status).toBe("skipped");
  });
  it("그 밖에 못 잰 항목은 실패 (_unmeasured)", () => {
    const pairs = [
      ["faceSize", "face_size"],
      ["faceAngle", "face_angle"],
      ["brightness", "brightness"],
      ["colorCast", "color_cast"],
      ["sharpness", "sharpness"],
    ] as const;
    for (const [key, id] of pairs) {
      const r = run(without(key));
      expect(check(r, id)).toEqual({ id, status: "fail", reason: `${id}_unmeasured` });
      expect(r.status).toBe("fail");
    }
  });
  it("측정값이 하나도 없으면 실패, 보정·필터 의심만 측정 불가 건너뜀", () => {
    const r = run({});
    expect(r.status).toBe("fail");
    expect(check(r, "filter_suspicion")?.reason).toBe("skipped_unmeasured");
  });
  it("얼굴 기반 여부는 설정으로 바꿀 수 있다 (예: 밝기를 얼굴 영역에서 잰다면)", () => {
    const c: QualityConfigDraft = { ...T, brightness: { ...T.brightness, dependsOnFace: true } };
    expect(check(run({ ...GOOD, faceCount: 0 }, c), "brightness")?.status).toBe("skipped");
  });
});

describe("qualityFlags 와 O-2", () => {
  it("qualityFlags 에는 경고 이유 코드만 (실패·건너뜀 코드는 없음)", () => {
    const r = run({ ...without("filterSuspicion"), brightness: 10, colorCast: 20 });
    expect(r.qualityFlags).toEqual(["color_cast_high"]);
  });
  it("결과에는 측정값 숫자가 들어가지 않는다", () => {
    const m = {
      faceCount: 1,
      faceSize: 12.3456,
      faceAngle: 7.8912,
      brightness: 123.4567,
      colorCast: 16.789,
      sharpness: 98.7654,
      filterSuspicion: 0.4321,
    };
    const r = run(m);
    const text = JSON.stringify(r);
    for (const v of Object.values(m).filter((v) => v !== 1)) expect(text).not.toContain(String(v));
    expect(Object.keys(r).sort()).toEqual(["checks", "configVersion", "lowersConfidence", "qualityFlags", "status"]);
    for (const c of r.checks) expect(Object.keys(c).every((k) => ["id", "status", "reason"].includes(k))).toBe(true);
  });
  it("나올 수 있는 이유 코드는 모두 약속된 목록 안에 있다", () => {
    const samples: QualityMeasurements[] = [GOOD, {}, { ...GOOD, faceCount: 0 }, { ...GOOD, faceCount: 3 }];
    for (const k of ["faceSize", "faceAngle", "brightness", "colorCast", "sharpness", "filterSuspicion"] as const) {
      samples.push({ ...GOOD, [k]: -1e9 }, { ...GOOD, [k]: 1e9 }, without(k));
    }
    // 모든 하한·상한·경고를 켠 기준도 함께 확인
    const all: QualityConfigDraft = { ...T };
    for (const id of ["face_size", "face_angle", "brightness", "color_cast", "sharpness"] as const) {
      all[id] = { ...T[id], fail: { min: -1, max: 1 }, warn: { min: -0.5, max: 0.5 } };
    }
    all.filter_suspicion = { dependsOnFace: false, warn: { min: -1, max: 1 } };
    const seen = new Set<string>();
    for (const c of [T, all]) {
      for (const m of samples) {
        for (const ch of run(m, c).checks) if (ch.reason) seen.add(ch.reason);
      }
    }
    for (const r of seen) expect(QUALITY_REASON_CODES as readonly string[]).toContain(r);
    // 목록의 모든 코드가 실제로 나올 수 있다 (안 쓰는 코드 없음)
    expect([...seen].sort()).toEqual([...QUALITY_REASON_CODES].sort());
  });
});

describe("이유 코드 목록 = docs/spec/02 표 (DB 저장 약속)", () => {
  it("코드 목록과 문서 목록이 정확히 같다", () => {
    const doc = readFileSync(new URL("../../../docs/spec/02-diagnosis.md", import.meta.url), "utf8");
    const section = doc.split("### 품질 이유 코드")[1]?.split(/\n#{2,3} /)[0] ?? "";
    const firstCells = [...section.matchAll(/^\|([^|\n]*)\|/gm)].map((m) => m[1] ?? "");
    const inDoc = firstCells.flatMap((cell) => [...cell.matchAll(/`([a-z_]+)`/g)].map((x) => x[1] ?? "")).sort();
    expect(inDoc).toEqual([...QUALITY_REASON_CODES].sort());
  });
});
