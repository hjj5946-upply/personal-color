import { describe, expect, it } from "vitest";
import {
  applyLighting,
  evaluateQuality,
  labToLch,
  rgbToLab,
  srgbToLinear,
  validateQualityMeasurements,
  type QualityConfigDraft,
} from "@personal-color/core";
import type { PixelBuffer } from "./pixels";
import {
  MEASURE,
  measureBrightness,
  measureColorCast,
  measureImageQuality,
  measureLightingReference,
  measureSharpness,
  pixelLab,
  resizeGray,
  type PixelRect,
} from "./quality-measure";

// 전부 코드로 만든 가짜 픽셀 (사진 아님, 지어낸 숫자)
type Rgb3 = [number, number, number];
const make = (w: number, h: number, fill: (x: number, y: number) => Rgb3): PixelBuffer => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set([...fill(x, y), 255], (y * w + x) * 4);
  return { data, width: w, height: h };
};
const inRect = (x: number, y: number, r: PixelRect) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1;
/** 결정적인 작은 무늬 (피부 결 흉내, 난수 아님) */
const texture = (x: number, y: number) => ((x * 7 + y * 13) % 9) - 4;
const tint = ([r, g, b]: Rgb3, d: number): Rgb3 => [r + d, g + d, b + d];

const W = 200;
const H = 200;
const FACE: PixelRect = { x0: 70, y0: 50, x1: 130, y1: 130 };

/** 품질 기준 (이 테스트 전용 임시 수치. 실제 기준은 [미정], M3-3) */
const LOCAL: QualityConfigDraft = {
  face_size: { dependsOnFace: true, onUnmeasured: "fail", fail: { min: "off", max: "off" }, warn: { min: "off", max: "off" } },
  face_angle: { dependsOnFace: true, onUnmeasured: "fail", fail: { min: "off", max: "off" }, warn: { min: "off", max: "off" } },
  brightness_dark: { dependsOnFace: true, onUnmeasured: "fail", fail: { max: 0.05 }, warn: { max: "off" } },
  brightness_bright: { dependsOnFace: true, onUnmeasured: "fail", fail: { max: 0.05 }, warn: { max: "off" } },
  color_cast: { dependsOnFace: true, onUnmeasured: "skip", fail: { min: -30, max: 30 }, warn: { min: -15, max: 15 } },
  sharpness: { dependsOnFace: true, onUnmeasured: "fail", fail: { min: "off", max: "off" }, warn: { min: "off", max: "off" } },
  filter_suspicion: { dependsOnFace: false, warn: { min: "off", max: "off" } },
};
const judge = (buf: PixelBuffer) => {
  const checked = validateQualityMeasurements({ faceCount: 1, faceSize: 0.2, faceAngle: 0, ...measureImageQuality(buf, FACE) });
  if (!checked.ok) throw new Error(checked.errors.join());
  return evaluateQuality(checked.measurements, LOCAL);
};

describe("pixelLab — core rgbToLab 과 같은 값", () => {
  it("여러 색에서 일치", () => {
    for (const [r, g, b] of [
      [0, 0, 0],
      [255, 255, 255],
      [220, 180, 160],
      [70, 45, 35],
      [10, 200, 30],
      [128, 128, 128],
    ] as Rgb3[]) {
      const [l, a, bb] = pixelLab(r, g, b);
      const ref = rgbToLab({ r, g, b });
      expect(l).toBeCloseTo(ref.l, 10);
      expect(a).toBeCloseTo(ref.a, 10);
      expect(bb).toBeCloseTo(ref.b, 10);
    }
  });
});

describe("밝기 두 비율 (M3-1b-Q2)", () => {
  const face = (skin: Rgb3, bg: Rgb3 = [128, 128, 128]) =>
    make(W, H, (x, y) => (inRect(x, y, FACE) ? tint(skin, texture(x, y)) : bg));

  it("고른 회색 얼굴 → 둘 다 0", () => {
    expect(measureBrightness(face([128, 128, 128]), FACE)).toEqual({ brightnessDark: 0, brightnessBright: 0 });
  });
  it("피부색이 어두워도 뭉개지지 않았으면 0 → 밝기 실패가 아님 (완료 기준 4)", () => {
    for (const deep of [
      [70, 45, 35],
      [52, 36, 30],
      [40, 28, 24],
    ] as Rgb3[]) {
      const buf = face(deep);
      expect(measureBrightness(buf, FACE)).toEqual({ brightnessDark: 0, brightnessBright: 0 });
      const r = judge(buf);
      expect(r.checks.find((c) => c.id === "brightness_dark")?.status).toBe("pass");
      expect(r.status).not.toBe("fail");
    }
  });
  it("피부색이 밝아도 날아가지 않았으면 0", () => {
    expect(measureBrightness(face([240, 215, 200]), FACE).brightnessBright).toBe(0);
  });
  it("얼굴 상자 밖은 세지 않는다 (배경이 새까매도 0)", () => {
    expect(measureBrightness(face([128, 128, 128], [0, 0, 0]), FACE).brightnessDark).toBe(0);
  });
  it("노출 부족: 얼굴 아래쪽 절반이 검게 뭉개지면 어두운 쪽 0.5", () => {
    const buf = make(W, H, (x, y) => (inRect(x, y, FACE) ? (y >= 90 ? [8, 6, 5] : [150, 120, 100]) : [128, 128, 128]));
    expect(measureBrightness(buf, FACE)).toEqual({ brightnessDark: 0.5, brightnessBright: 0 });
  });
  it("과다 노출: 한 채널만 포화돼도 날아간 것으로 센다 (색 정보가 잘림)", () => {
    const buf = make(W, H, (x, y) => (inRect(x, y, FACE) ? (x < 85 ? [255, 210, 190] : [200, 160, 140]) : [128, 128, 128]));
    expect(measureBrightness(buf, FACE)).toEqual({ brightnessDark: 0, brightnessBright: 0.25 });
  });
  it("어두운 쪽·밝은 쪽이 동시에 있으면 둘 다 잡히고 서로 상쇄되지 않는다 (완료 기준 11)", () => {
    // 위 30% 날아감, 아래 30% 뭉개짐: 평균 밝기는 보통이지만 나쁜 사진
    const buf = make(W, H, (x, y) => {
      if (!inRect(x, y, FACE)) return [128, 128, 128];
      if (y < 74) return [255, 255, 255];
      if (y >= 106) return [3, 3, 3];
      return [150, 120, 100];
    });
    const m = measureBrightness(buf, FACE);
    expect(m.brightnessDark).toBeCloseTo(0.3, 10);
    expect(m.brightnessBright).toBeCloseTo(0.3, 10);
    const r = judge(buf);
    expect(r.status).toBe("fail");
    expect(r.checks.filter((c) => c.status === "fail").map((c) => c.reason)).toEqual(["brightness_low", "brightness_high"]);
  });
  it("얼굴 상자가 이미지 밖이면 측정 못 함 → 값이 빠진다", () => {
    expect(measureBrightness(face([128, 128, 128]), { x0: 300, y0: 300, x1: 400, y1: 400 })).toEqual({});
  });
  it("경계값: darkLevel 은 뭉개짐, darkLevel+1 은 아님 / brightLevel 은 날아감, -1 은 아님", () => {
    const at = (v: number) => measureBrightness(make(W, H, () => [v, v, v]), FACE);
    expect(at(MEASURE.darkLevel).brightnessDark).toBe(1);
    expect(at(MEASURE.darkLevel + 1).brightnessDark).toBe(0);
    expect(at(MEASURE.brightLevel).brightnessBright).toBe(1);
    expect(at(MEASURE.brightLevel - 1).brightnessBright).toBe(0);
  });
});

describe("색 편향 (M3-1b-Q3): 얼굴 밖 무채색에 가까운 밝은 픽셀의 b*", () => {
  const scene = (bg: Rgb3, below?: Rgb3) =>
    make(W, H, (x, y) => {
      if (inRect(x, y, FACE)) return tint([200, 160, 140], texture(x, y));
      if (below && x >= 70 && x < 130 && y >= 130 && y < 170) return below; // 목
      return tint(bg, texture(x, y) >> 1);
    });

  it("중립 흰 벽 → 0 근처", () => {
    expect(Math.abs(measureColorCast(scene([200, 200, 200]), FACE) ?? 99)).toBeLessThan(0.5);
  });
  it("노란 조명 → 양수, 파란 조명 → 음수 (방향)", () => {
    expect(measureColorCast(scene([215, 200, 165]), FACE)).toBeGreaterThan(10);
    expect(measureColorCast(scene([180, 196, 222]), FACE)).toBeLessThan(-10);
  });
  it("목 피부는 빼고 잰다 (노란 쪽으로 끌리지 않음)", () => {
    expect(Math.abs(measureColorCast(scene([200, 200, 200], [230, 190, 160]), FACE) ?? 99)).toBeLessThan(0.5);
  });
  it("기준 픽셀이 없으면(진한 색 배경·어두운 배경·포화된 흰색) 측정 불가 → undefined", () => {
    expect(measureColorCast(scene([30, 160, 60]), FACE)).toBeUndefined();
    expect(measureColorCast(scene([60, 60, 60]), FACE)).toBeUndefined();
    expect(measureColorCast(make(W, H, (x, y) => (inRect(x, y, FACE) ? [200, 160, 140] : [255, 255, 255])), FACE)).toBeUndefined();
  });
  it("기준 픽셀이 측정 영역의 castMinRatio 미만이면 측정 불가", () => {
    // 진한 초록 배경에 흰 점 몇 개
    const buf = make(W, H, (x, y) => (inRect(x, y, FACE) ? [200, 160, 140] : x < 3 && y < 3 ? [210, 210, 210] : [30, 160, 60]));
    expect(measureColorCast(buf, FACE)).toBeUndefined();
  });
  it("초록·자홍 편향은 잡지 못한다 (알려진 한계: a* 쪽 치우침은 값에 반영되지 않음)", () => {
    for (const bg of [
      [190, 210, 190], // 초록 쪽
      [210, 188, 208], // 자홍 쪽
    ] as Rgb3[]) {
      const lab = rgbToLab({ r: bg[0], g: bg[1], b: bg[2] });
      const cast = measureColorCast(scene(bg), FACE) ?? 99;
      expect(Math.abs(lab.a)).toBeGreaterThan(8); // 실제로는 초록·자홍으로 꽤 치우친 조명
      expect(cast).toBeCloseTo(lab.b, 0); // 값은 b*(파랑↔노랑) 성분뿐
    }
  });
  it("못 재면 측정값에서 빠지고, 판정은 건너뜀이라 진단이 막히지 않는다 (완료 기준 10)", () => {
    const buf = scene([30, 160, 60]);
    expect("colorCast" in measureImageQuality(buf, FACE)).toBe(false);
    const r = judge(buf);
    expect(r.checks.find((c) => c.id === "color_cast")).toEqual({ id: "color_cast", status: "skipped", reason: "skipped_unmeasured" });
    expect(r.status).not.toBe("fail");
  });
});

describe("선명도 (M3-1b-Q4): 크기를 맞춘 라플라시안 분산", () => {
  const checker = (cell: number) => (x: number, y: number): Rgb3 =>
    (Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? [200, 200, 200] : [60, 60, 60];
  /** 바둑판을 상자 흐림 */
  const blurred = (cell: number, k: number) => (x: number, y: number): Rgb3 => {
    let s = 0;
    for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) s += checker(cell)(x + dx, y + dy)[0];
    const v = Math.round(s / (2 * k + 1) ** 2);
    return [v, v, v];
  };

  it("평평한 면 → 0", () => {
    expect(measureSharpness(make(W, H, () => [120, 120, 120]), FACE)).toBe(0);
  });
  it("또렷한 무늬 > 흐린 무늬", () => {
    const sharp = measureSharpness(make(W, H, checker(10)), FACE) ?? 0;
    const blur = measureSharpness(make(W, H, blurred(10, 3)), FACE) ?? 0;
    expect(sharp).toBeGreaterThan(blur * 2);
    expect(blur).toBeGreaterThan(0);
  });
  it("같은 장면을 다른 해상도로 그려도 값이 크게 변하지 않는다 (얼굴 상자가 sharpSize 이상일 때, 축소 상한과 무관)", () => {
    // 얼굴 상자 크기에 비례하는 무늬를 해상도 3가지로 그린다 (얼굴 상자 긴 변 256·400·640px)
    const values = [3.2, 5, 8].map((scale) => {
      const w = Math.round(W * scale);
      const h = Math.round(H * scale);
      const box: PixelRect = { x0: FACE.x0 * scale, y0: FACE.y0 * scale, x1: FACE.x1 * scale, y1: FACE.y1 * scale };
      const buf = make(w, h, (x, y) => {
        const u = (x + 0.5 - box.x0) / (box.x1 - box.x0);
        const v = (y + 0.5 - box.y0) / (box.y1 - box.y0);
        const g = Math.round(128 + 60 * Math.sin(2 * Math.PI * 9 * u) * Math.cos(2 * Math.PI * 7 * v));
        return [g, g, g];
      });
      return measureSharpness(buf, box) ?? 0;
    });
    const [a, b, c] = values as [number, number, number];
    expect(c).toBeGreaterThan(0);
    // 크기를 맞추지 않으면 해상도에 따라 수십 배 달라진다. 맞춘 뒤에는 ±10% 안
    for (const ratio of [a / c, b / c]) {
      expect(ratio).toBeGreaterThan(0.9);
      expect(ratio).toBeLessThan(1.1);
    }
  });
  it("resizeGray: 줄여도 키워도 평균 밝기를 유지", () => {
    const src = { data: Float64Array.from({ length: 64 }, (_, i) => (i % 8) * 10), width: 8, height: 8 };
    const mean = (a: Float64Array) => a.reduce((s, v) => s + v, 0) / a.length;
    expect(mean(resizeGray(src, 4, 4))).toBeCloseTo(mean(src.data), 10);
    expect(mean(resizeGray(src, 3, 5))).toBeCloseTo(mean(src.data), 0);
    expect(mean(resizeGray(src, 16, 16))).toBeCloseTo(mean(src.data), 0);
  });
  it("얼굴 상자가 이미지 밖이면 측정 못 함", () => {
    expect(measureSharpness(make(W, H, () => [1, 1, 1]), { x0: -50, y0: -50, x1: -10, y1: -10 })).toBeUndefined();
  });
});

describe("결정성과 O-2", () => {
  const buf = make(W, H, (x, y) => (inRect(x, y, FACE) ? tint([180, 140, 120], texture(x, y)) : tint([205, 200, 190], texture(x, y))));
  it("같은 입력 → 같은 값", () => {
    expect(measureImageQuality(buf, FACE)).toEqual(measureImageQuality(buf, FACE));
  });
  it("결과에는 숫자 측정값 4개만 (얼굴 상자·좌표 없음), core 입력 검사 통과", () => {
    const m = measureImageQuality(buf, FACE);
    expect(Object.keys(m).sort()).toEqual(["brightnessBright", "brightnessDark", "colorCast", "sharpness"]);
    expect(Object.values(m).every((v) => typeof v === "number" && Number.isFinite(v))).toBe(true);
    expect(validateQualityMeasurements(m).ok).toBe(true);
  });
  it("보정·필터 의심은 재지 않는다 (측정값에 없음 → 판정에서 건너뜀, 완료 기준 2)", () => {
    expect("filterSuspicion" in measureImageQuality(buf, FACE)).toBe(false);
    expect(judge(buf).checks.find((c) => c.id === "filter_suspicion")).toEqual({
      id: "filter_suspicion",
      status: "skipped",
      reason: "skipped_unmeasured",
    });
  });
});

describe("조명 보정 기준 통계 (M3-2-Q4, 완료 기준 4)", () => {
  // 회색 배경 + 얼굴(피부색) — 얼굴·목 밖만 세야 한다
  const scene = (bg: Rgb3, skin: Rgb3 = [205, 160, 135]) => make(W, H, (x, y) => (inRect(x, y, FACE) ? skin : bg));
  const lin = (c: number) => srgbToLinear(c);

  it("얼굴·목 밖 픽셀의 채널별 선형값 평균과 영역 비율", () => {
    const ref = measureLightingReference(scene([180, 170, 140]), FACE);
    expect(ref?.linearMean.r).toBeCloseTo(lin(180), 12);
    expect(ref?.linearMean.g).toBeCloseTo(lin(170), 12);
    expect(ref?.linearMean.b).toBeCloseTo(lin(140), 12);
    // 제외 영역: 얼굴 60×80 을 좌우·위 25%, 아래 60% 넓힘 → x 55~145, y 30~178 → 90×148
    expect(ref?.areaRatio).toBeCloseTo((W * H - 90 * 148) / (W * H), 12);
  });
  it("피부색이 바뀌어도 값이 같다 (얼굴은 세지 않음)", () => {
    expect(measureLightingReference(scene([150, 150, 150], [90, 60, 50]), FACE)).toEqual(
      measureLightingReference(scene([150, 150, 150], [230, 190, 170]), FACE),
    );
  });
  it("색 편향과 같은 영역을 쓴다: 제외 영역 경계 바로 안쪽 픽셀은 둘 다 세지 않는다", () => {
    // 제외 영역 안(목 쪽, y 170)에만 강한 노란 띠 → 두 측정 모두 영향 없음
    const base = scene([200, 200, 200]);
    const banded = make(W, H, (x, y) => (inRect(x, y, FACE) ? [205, 160, 135] : y >= 165 && y < 178 && x >= 60 && x < 140 ? [240, 200, 60] : [200, 200, 200]));
    expect(measureLightingReference(banded, FACE)).toEqual(measureLightingReference(base, FACE));
    expect(measureColorCast(banded, FACE)).toBe(measureColorCast(base, FACE));
  });
  it("잘린 픽셀(한 채널이라도 250 이상)은 뺀다", () => {
    const half = make(W, H, (x, y) => (inRect(x, y, FACE) ? [205, 160, 135] : x < 100 ? [255, 255, 255] : [100, 120, 140]));
    const ref = measureLightingReference(half, FACE);
    expect(ref?.linearMean.r).toBeCloseTo(lin(100), 12);
    expect(ref?.linearMean.b).toBeCloseTo(lin(140), 12);
  });
  it("쓸 픽셀이 없으면 undefined (얼굴이 화면을 꽉 채움 / 전부 잘림)", () => {
    expect(measureLightingReference(scene([128, 128, 128]), { x0: 10, y0: 30, x1: 190, y1: 170 })).toBeUndefined();
    expect(measureLightingReference(scene([255, 255, 255]), FACE)).toBeUndefined();
  });
  it("노란 조명 장면 → core 회색 세계 가정으로 피부 색상각이 중립 조명 때와 같아진다", () => {
    const light = [1.2, 1.0, 0.75] as const;
    const lit = (c: Rgb3): Rgb3 =>
      c.map((v, i) => {
        const x = Math.min(1, lin(v) * (light[i] as number));
        return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
      }) as unknown as Rgb3;
    const skin: Rgb3 = [205, 160, 135];
    // 지어낸 픽셀은 0~255 정수로 저장되므로 반올림 오차가 생긴다
    const buf = scene(lit([150, 150, 150]).map(Math.round) as unknown as Rgb3, lit(skin).map(Math.round) as unknown as Rgb3);
    const ref = measureLightingReference(buf, FACE);
    const litSkin = lit(skin).map(Math.round);
    const r = applyLighting(
      { skin: [{ r: litSkin[0] as number, g: litSkin[1] as number, b: litSkin[2] as number }] },
      ref,
      { mode: "gray_world", grayWorld: { minAreaRatio: 0.1, maxGain: 2 } },
    );
    const h = (c: { r: number; g: number; b: number }) => labToLch(rgbToLab(c)).h;
    expect(r.applied).toBe("gray_world");
    expect(h(r.sample.skin[0] as { r: number; g: number; b: number })).toBeCloseTo(h({ r: 205, g: 160, b: 135 }), 0);
  });
});
