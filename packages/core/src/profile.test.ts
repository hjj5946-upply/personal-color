// ColorProfile 생성 (M3-2 완료 기준 2·8·9·10·11·15). 전부 지어낸 수치, 설정은 테스트 전용 임시 값.
import { describe, expect, it } from "vitest";
import type { ConfidenceConfigDraft } from "./confidence";
import type { LightingConfigDraft, LightingReference } from "./lighting";
import { buildColorProfile, type ProfileConfigs, type ProfileInput } from "./profile";
import { PIPELINE_WARNING_CODES, QUALITY_REASON_CODES, evaluateQuality } from "./quality";
import type { QualityMeasurements } from "./quality-measurements";
import type { ColorSample } from "./sample";
import { TEST_QUALITY_CONFIG } from "./testing/quality-test-config";
import { CONFIG_VERSION, ToneConfigNotSetError, getTone, toTone12, type ToneThresholdsDraft } from "./tone-config";
import type { ColorProfile } from "./types";

const TONE: ToneThresholdsDraft = {
  warmCoolSplit: 55,
  lightnessCuts: [55, 62, 70],
  chromaSplit: 20,
  secondScale: { warmCool: 10, lightness: 5, chroma: 4 },
};
const GW: LightingConfigDraft = { mode: "gray_world", grayWorld: { minAreaRatio: 0.05, maxGain: 2 } };
const NONE: LightingConfigDraft = { mode: "none", grayWorld: { minAreaRatio: null, maxGain: null } };
const CONF: ConfidenceConfigDraft = {
  weights: { quality: 2, calibration: 1, inputType: 1, margin: 2, consistency: 2 },
  consistencyScale: 3,
};
const CFG: ProfileConfigs = { tone: TONE, lighting: GW, confidence: CONF };

const GOOD: QualityMeasurements = {
  faceCount: 1,
  faceSize: 50,
  faceAngle: 0,
  brightnessDark: 0.01,
  brightnessBright: 0.01,
  colorCast: 0,
  sharpness: 100,
  filterSuspicion: 0.1,
};
const quality = (m: QualityMeasurements) => evaluateQuality(m, TEST_QUALITY_CONFIG);
const withoutColorCast = (): QualityMeasurements => {
  const m = { ...GOOD };
  delete m.colorCast;
  return m;
};
const SAMPLE: ColorSample = {
  skin: [
    { r: 214, g: 168, b: 142 },
    { r: 210, g: 165, b: 140 },
    { r: 212, g: 166, b: 143 },
  ],
  hair: [{ r: 55, g: 42, b: 38 }],
  iris: [{ r: 70, g: 50, b: 40 }],
};
/** 무채색 기준 통계 → 배율 1 (보정해도 색이 그대로). 대체 여부만 비교하기 위한 기준 */
const NEUTRAL: LightingReference = { linearMean: { r: 0.3, g: 0.3, b: 0.3 }, areaRatio: 0.4 };
const CREATED = "2026-10-23T16:00:00+09:00";
const input = (p: Partial<ProfileInput> = {}): ProfileInput => ({
  sample: SAMPLE,
  lightingReference: NEUTRAL,
  quality: quality(GOOD),
  inputType: "camera",
  calibrationMode: "normal",
  createdAt: CREATED,
  ...p,
});
const build = (p: Partial<ProfileInput> = {}, cfg: ProfileConfigs = CFG): ColorProfile => {
  const r = buildColorProfile(input(p), cfg);
  if (!r.ok) throw new Error(r.reason);
  return r.profile;
};

describe("만들지 않는 경우·미설정", () => {
  it("품질 결과가 실패면 만들지 않는다", () => {
    expect(buildColorProfile(input({ quality: quality({ ...GOOD, faceCount: 0 }) }), CFG)).toEqual({
      ok: false,
      reason: "quality_failed",
    });
  });
  it("실제 설정(비어 있음)으로는 '미설정' 오류", () => {
    expect(() => buildColorProfile(input())).toThrow(/미설정/);
    expect(() => buildColorProfile(input(), { ...CFG, tone: { ...TONE, chromaSplit: null } })).toThrow(
      ToneConfigNotSetError,
    );
  });
  it("createdAt 은 시간대 있는 ISO 8601, 정밀 모드는 M5, 잘못된 샘플은 오류", () => {
    expect(() => build({ createdAt: "2026-10-23 16:00" })).toThrow(/ISO 8601/);
    expect(() => build({ calibrationMode: "precise" })).toThrow(/M5/);
    expect(() => build({ sample: { skin: [], landmarks: [1, 2] } })).toThrow(/ColorSample 오류/);
  });
});

describe("내용 (완료 기준 2·8)", () => {
  it("필드는 02 ColorProfile 과 정확히 같다 (tone12_second·확신 낮음 없음)", () => {
    const p = build();
    expect(Object.keys(p).sort()).toEqual(
      [
        "axes",
        "calibrationMode",
        "confidence",
        "configVersion",
        "createdAt",
        "inputType",
        "qualityFlags",
        "season4",
        "tone12",
        "tone16",
        "tone16_second",
      ].sort(),
    );
    expect(Object.keys(p.axes).sort()).toEqual(["chroma", "contrast", "lightness", "warmCool"]);
  });
  it("4계절·12톤은 1순위 16톤에서 파생, 2순위 12톤은 같은 함수로", () => {
    const p = build();
    expect(p.season4).toBe(getTone(p.tone16)?.season4);
    expect(p.tone12).toBe(toTone12(p.tone16).id);
    expect(p.tone16_second).not.toBe(p.tone16);
    expect(toTone12(p.tone16_second).season4).toBe(getTone(p.tone16_second)?.season4);
  });
  it("configVersion·createdAt·입력 방식이 그대로 들어간다, 신뢰도 0~1", () => {
    const p = build({ inputType: "upload" });
    expect(p.configVersion).toBe(CONFIG_VERSION);
    expect(p.createdAt).toBe(CREATED);
    expect(p.inputType).toBe("upload");
    expect(p.calibrationMode).toBe("normal");
    expect(p.confidence >= 0 && p.confidence <= 1).toBe(true);
  });
  it("qualityFlags 에는 경고 코드만 (건너뜀 코드 없음)", () => {
    const p = build({ quality: quality({ ...withoutColorCast(), filterSuspicion: 0.9 }) });
    expect(p.qualityFlags).toEqual(["filter_suspicion_high"]);
  });
  it("O-2: 측정값·기준 통계·판정 중간값이 들어가지 않는다", () => {
    const m: QualityMeasurements = { ...GOOD, faceSize: 41.2345, faceAngle: 3.4567, sharpness: 123.4567 };
    const ref: LightingReference = { linearMean: { r: 0.3123, g: 0.3456, b: 0.2789 }, areaRatio: 0.4321 };
    const text = JSON.stringify(build({ quality: quality(m), lightingReference: ref }));
    for (const v of ["41.2345", "3.4567", "123.4567", "0.3123", "0.3456", "0.2789", "0.4321"]) {
      expect(text).not.toContain(v);
    }
    expect(text).not.toMatch(/margin|component|landmark|"x"|"y"|faceSize|linearMean|areaRatio|lowConfidence/i);
  });
});

describe("결정성 (완료 기준 9)", () => {
  it("같은 입력이면 같은 결과", () => {
    expect(build()).toStrictEqual(build());
    expect(build({}, { ...CFG, lighting: NONE })).toStrictEqual(build({}, { ...CFG, lighting: NONE }));
  });
});

describe("대비는 판정·신뢰도에 쓰지 않는다 (완료 기준 10)", () => {
  it("머리카락·눈동자가 바뀌어 대비가 바뀌어도 axes.contrast 만 바뀐다", () => {
    const base = build();
    const others: ColorSample[] = [
      { ...SAMPLE, hair: [{ r: 200, g: 190, b: 180 }] },
      { ...SAMPLE, iris: [{ r: 10, g: 10, b: 10 }], hair: [{ r: 240, g: 230, b: 220 }] },
      { skin: SAMPLE.skin }, // 대비 null
    ];
    for (const sample of others) {
      const p = build({ sample });
      expect(p.axes.contrast).not.toBe(base.axes.contrast);
      const { axes: a1, ...rest1 } = p;
      const { axes: a0, ...rest0 } = base;
      expect(rest1).toStrictEqual(rest0);
      expect({ ...a1, contrast: null }).toStrictEqual({ ...a0, contrast: null });
    }
    expect(build({ sample: { skin: SAMPLE.skin } }).axes.contrast).toBeNull();
  });
});

describe("색 편향을 못 재도 진단이 막히지 않는다 (완료 기준 11)", () => {
  it("두 보정 방식 모두, 기준 통계가 있든 없든 ColorProfile 이 만들어진다", () => {
    const q = quality(withoutColorCast());
    expect(q.status).toBe("pass");
    for (const lighting of [GW, NONE]) {
      for (const lightingReference of [NEUTRAL, undefined]) {
        expect(buildColorProfile(input({ quality: q, lightingReference }), { ...CFG, lighting }).ok).toBe(true);
      }
    }
  });
});

describe("보정 대체 → lighting_fallback + 신뢰도 하락 (완료 기준 15)", () => {
  const ok = build();
  it("기준(무채색 통계)에서는 대체가 없다", () => {
    expect(ok.qualityFlags).not.toContain("lighting_fallback");
  });
  const cases: [string, LightingReference | undefined][] = [
    ["보정 한도 초과", { linearMean: { r: 0.9, g: 0.3, b: 0.05 }, areaRatio: 0.4 }],
    ["기준 영역이 작음", { ...NEUTRAL, areaRatio: 0.01 }],
    ["기준 영역을 못 잼", undefined],
  ];
  for (const [name, ref] of cases) {
    it(`${name}: 보정 안 함 + lighting_fallback, 신뢰도가 낮아짐`, () => {
      const p = build({ lightingReference: ref });
      expect(p.qualityFlags).toEqual(["lighting_fallback"]);
      expect(p.confidence).toBeLessThan(ok.confidence);
      // 보정 안 함 = 원래 색 그대로 → 무채색 기준(배율 1)과 판정이 같다
      expect(p.axes.warmCool).toBeCloseTo(ok.axes.warmCool, 9);
      expect(p.tone16).toBe(ok.tone16);
    });
  }
  it("설정이 '보정 안 함'이면 대체가 아니다 (lighting_fallback 없음)", () => {
    const p = build({ lightingReference: undefined }, { ...CFG, lighting: NONE });
    expect(p.qualityFlags).toEqual([]);
    expect(p.confidence).toBeCloseTo(ok.confidence, 9);
  });
  it("보정 한도 '사용 안 함'이면 큰 배율도 적용되고 lighting_fallback 이 붙지 않는다 (완료 기준 15 세 번째 경우)", () => {
    const strong: LightingReference = { linearMean: { r: 0.9, g: 0.3, b: 0.05 }, areaRatio: 0.4 };
    const noLimit: LightingConfigDraft = { mode: "gray_world", grayWorld: { minAreaRatio: 0.05, maxGain: "off" } };
    const p = build({ lightingReference: strong }, { ...CFG, lighting: noLimit });
    expect(p.qualityFlags).toEqual([]);
    // 배율이 실제로 적용돼 특징값이 원래 색(무채색 기준)과 달라졌다
    expect(Math.abs(p.axes.warmCool - ok.axes.warmCool)).toBeGreaterThan(1);
    // 같은 기준 통계도 한도가 있으면 대체된다
    expect(build({ lightingReference: strong }).qualityFlags).toEqual(["lighting_fallback"]);
  });
  it("다른 경고와 함께면 둘 다 들어간다", () => {
    const p = build({ quality: quality({ ...GOOD, colorCast: 20 }), lightingReference: undefined });
    expect(p.qualityFlags).toEqual(["color_cast_high", "lighting_fallback"]);
  });
  it("파이프라인 경고 코드는 약속된 목록 안에 있고 실제로 나온다", () => {
    for (const c of PIPELINE_WARNING_CODES) expect(QUALITY_REASON_CODES).toContain(c);
    expect(build({ lightingReference: undefined }).qualityFlags).toEqual([...PIPELINE_WARNING_CODES]);
  });
});
