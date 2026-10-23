// 신뢰도 구조 (M3-2 완료 기준 7). 가중치·척도는 테스트 전용 임시 값 (실제는 [미정], M3-3).
import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_COMPONENTS,
  CONFIDENCE_CONFIG,
  ConfidenceConfigNotSetError,
  computeConfidence,
  skinSpread,
  type ConfidenceConfigDraft,
  type ConfidenceInputs,
} from "./confidence";

const C: ConfidenceConfigDraft = {
  weights: { quality: 2, calibration: 1, inputType: 1, margin: 2, consistency: 2 },
  consistencyScale: 3,
};
const BASE: ConfidenceInputs = { qualityFlagCount: 0, calibrationMode: "normal", inputType: "camera", margin: 1, skinSpread: 1 };
const conf = (p: Partial<ConfidenceInputs> = {}) => computeConfidence({ ...BASE, ...p }, C).confidence;

describe("설정 (미설정 상태 보장)", () => {
  it("실제 설정은 비어 있다 [미정]", () => {
    expect(Object.values(CONFIDENCE_CONFIG.weights).every((w) => w === null)).toBe(true);
    expect(CONFIDENCE_CONFIG.consistencyScale).toBeNull();
  });
  it("비어 있으면 '미설정' 오류", () => {
    expect(() => computeConfidence(BASE)).toThrow(ConfidenceConfigNotSetError);
    expect(() => computeConfidence(BASE)).toThrow(/weights.quality.*consistencyScale/);
  });
  it("가중치 음수·합 0·척도 0 은 오류", () => {
    expect(() => computeConfidence(BASE, { ...C, weights: { ...C.weights, margin: -1 } })).toThrow(ConfidenceConfigNotSetError);
    expect(() =>
      computeConfidence(BASE, { ...C, weights: { quality: 0, calibration: 0, inputType: 0, margin: 0, consistency: 0 } }),
    ).toThrow(ConfidenceConfigNotSetError);
    expect(() => computeConfidence(BASE, { ...C, consistencyScale: 0 })).toThrow(ConfidenceConfigNotSetError);
  });
});

describe("다섯 요소 (02 신뢰도)", () => {
  it("요소는 다섯 개뿐: 대비·12톤 확신 낮음은 없다 (M3-2-Q8)", () => {
    expect(CONFIDENCE_COMPONENTS).toEqual(["quality", "calibration", "inputType", "margin", "consistency"]);
    expect(Object.keys(computeConfidence(BASE, C).components).sort()).toEqual([...CONFIDENCE_COMPONENTS].sort());
  });
  it("항상 0~1", () => {
    for (const q of [0, 1, 5, 100])
      for (const m of [0, 0.3, 5, Infinity])
        for (const s of [null, 0, 2, 50])
          for (const cal of ["normal", "precise"] as const)
            for (const it of ["camera", "upload"] as const) {
              const v = conf({ qualityFlagCount: q, margin: m, skinSpread: s, calibrationMode: cal, inputType: it });
              expect(v >= 0 && v <= 1).toBe(true);
            }
  });
  it("① 품질 플래그(lighting_fallback 포함)가 늘면 낮아진다", () => {
    expect(conf({ qualityFlagCount: 1 })).toBeLessThan(conf({ qualityFlagCount: 0 }));
    expect(conf({ qualityFlagCount: 2 })).toBeLessThan(conf({ qualityFlagCount: 1 }));
  });
  it("② 정밀 모드면 높아진다, ③ 촬영이 업로드보다 높다", () => {
    expect(conf({ calibrationMode: "precise" })).toBeGreaterThan(conf());
    expect(conf({ inputType: "upload" })).toBeLessThan(conf());
  });
  it("④ 경계에서 멀수록 높아진다", () => {
    expect(conf({ margin: 0 })).toBeLessThan(conf({ margin: 0.5 }));
    expect(conf({ margin: 0.5 })).toBeLessThan(conf({ margin: 3 }));
  });
  it("⑤ 피부 영역끼리 차이가 클수록 낮아지고, 확인할 수 없으면(영역 1개) 가장 낮다", () => {
    expect(conf({ skinSpread: 10 })).toBeLessThan(conf({ skinSpread: 1 }));
    expect(conf({ skinSpread: null })).toBeLessThan(conf({ skinSpread: 1000 }));
  });
});

describe("영역 간 일관성 skinSpread (13 피부 영역 숙제를 잡는 도구)", () => {
  const skin = { r: 205, g: 160, b: 135 };
  it("세 영역이 같으면 0, 하나만 다르면(가림 흉내) 커진다", () => {
    expect(skinSpread({ skin: [skin, skin, skin] })).toBe(0);
    const near = skinSpread({ skin: [skin, { r: 207, g: 161, b: 136 }, skin] }) as number;
    const occluded = skinSpread({ skin: [skin, { r: 90, g: 80, b: 75 }, skin] }) as number;
    expect(near).toBeLessThan(2);
    expect(occluded).toBeGreaterThan(10);
  });
  it("영역이 1개면 null", () => {
    expect(skinSpread({ skin: [skin] })).toBeNull();
  });
  it("머리카락·눈동자는 보지 않는다", () => {
    expect(skinSpread({ skin: [skin, skin], hair: [{ r: 0, g: 0, b: 0 }] })).toBe(0);
  });
});

describe("결정성", () => {
  it("같은 입력이면 같은 결과", () => {
    expect(computeConfidence(BASE, C)).toStrictEqual(computeConfidence(BASE, C));
  });
});
