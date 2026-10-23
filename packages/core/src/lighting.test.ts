// 조명 보정 (M3-2 완료 기준 3·15). 전부 지어낸 수치.
import { describe, expect, it } from "vitest";
import { labToLch, linearToSrgb, rgbToLab, srgbToLinear } from "./color";
import {
  LIGHTING_CONFIG,
  LightingConfigNotSetError,
  applyGains,
  applyLighting,
  grayWorldGains,
  requireLightingConfig,
  type LightingConfigDraft,
  type LightingReference,
} from "./lighting";
import type { ColorSample } from "./sample";
import type { Rgb } from "./types";

/** 테스트 전용 임시 설정 (실제 값은 [미정], M3-3) */
const GW: LightingConfigDraft = { mode: "gray_world", grayWorld: { minAreaRatio: 0.05, maxGain: 2 } };
const NONE: LightingConfigDraft = { mode: "none", grayWorld: { minAreaRatio: null, maxGain: null } };

// 지어낸 장면: 중립 조명에서의 피부색 SKIN, 회색 배경(선형 0.4), 노란 조명(선형 채널 배율 LIGHT)
const SKIN: Rgb = { r: 205, g: 160, b: 135 };
const HAIR: Rgb = { r: 60, g: 45, b: 40 };
const LIGHT = { r: 1.2, g: 1.0, b: 0.75 };
const underLight = (c: Rgb): Rgb => ({
  r: linearToSrgb(srgbToLinear(c.r) * LIGHT.r),
  g: linearToSrgb(srgbToLinear(c.g) * LIGHT.g),
  b: linearToSrgb(srgbToLinear(c.b) * LIGHT.b),
});
const LIT: ColorSample = { skin: [underLight(SKIN), underLight(SKIN), underLight(SKIN)], hair: [underLight(HAIR)] };
const REF: LightingReference = { linearMean: { r: 0.4 * LIGHT.r, g: 0.4 * LIGHT.g, b: 0.4 * LIGHT.b }, areaRatio: 0.3 };

const hue = (c: Rgb) => labToLch(rgbToLab(c)).h;

describe("설정 (미설정 상태 보장)", () => {
  it("실제 설정은 비어 있다 [미정]", () => {
    expect(LIGHTING_CONFIG).toEqual({ mode: null, grayWorld: { minAreaRatio: null, maxGain: null } });
  });
  it("방식이 비어 있으면 '미설정' 오류", () => {
    expect(() => requireLightingConfig()).toThrow(LightingConfigNotSetError);
    expect(() => applyLighting(LIT, REF)).toThrow(/미설정: mode/);
  });
  it("회색 세계 가정인데 한도·최소 영역이 비면 '미설정' 오류", () => {
    expect(() => requireLightingConfig({ mode: "gray_world", grayWorld: { minAreaRatio: null, maxGain: null } })).toThrow(
      /grayWorld.minAreaRatio, grayWorld.maxGain/,
    );
  });
  it("'보정 안 함'이면 회색 세계 값이 비어 있어도 된다", () => {
    expect(requireLightingConfig(NONE)).toEqual({ mode: "none" });
  });
  it("한도는 1 이상이어야 한다", () => {
    expect(() => requireLightingConfig({ mode: "gray_world", grayWorld: { minAreaRatio: 0, maxGain: 0.5 } })).toThrow(
      /1 이상/,
    );
  });
});

describe("보정 안 함", () => {
  it("값이 그대로이고 대체가 아니다 (lighting_fallback 없음)", () => {
    expect(applyLighting(LIT, REF, NONE)).toEqual({ sample: LIT, applied: "none", fallback: false });
    expect(applyLighting(LIT, undefined, NONE).fallback).toBe(false);
  });
});

describe("회색 세계 가정 (선형 색 공간)", () => {
  it("배율 = 세 채널 평균 ÷ 채널 평균 (선형값)", () => {
    const g = grayWorldGains(REF);
    const avg = (0.4 * (LIGHT.r + LIGHT.g + LIGHT.b)) / 3;
    expect(g?.r).toBeCloseTo(avg / (0.4 * LIGHT.r), 12);
    expect(g?.g).toBeCloseTo(avg / (0.4 * LIGHT.g), 12);
    expect(g?.b).toBeCloseTo(avg / (0.4 * LIGHT.b), 12);
  });
  it("지어낸 노란 조명을 없앤다: 보정 결과 = 원래 색 × 같은 배율(선형), 색상각이 원래대로", () => {
    const r = applyLighting(LIT, REF, GW);
    expect(r).toMatchObject({ applied: "gray_world", fallback: false });
    const k = (LIGHT.r + LIGHT.g + LIGHT.b) / 3; // 전체 밝기 배율
    const out = r.sample.skin[0] as Rgb;
    expect(srgbToLinear(out.r)).toBeCloseTo(srgbToLinear(SKIN.r) * k, 9);
    expect(srgbToLinear(out.g)).toBeCloseTo(srgbToLinear(SKIN.g) * k, 9);
    expect(srgbToLinear(out.b)).toBeCloseTo(srgbToLinear(SKIN.b) * k, 9);
    expect(hue(out)).toBeCloseTo(hue(SKIN), 6);
    // 조명이 걸린 상태에서는 색상각이 노란 쪽(큰 쪽)으로 밀려 있었다
    expect(hue(LIT.skin[0] as Rgb)).toBeGreaterThan(hue(SKIN) + 1);
  });
  it("머리카락·눈동자 영역도 같은 배율로 보정된다", () => {
    const r = applyLighting(LIT, REF, GW);
    expect(hue(r.sample.hair?.[0] as Rgb)).toBeCloseTo(hue(HAIR), 6);
    expect(r.sample.iris).toBeUndefined();
  });
  it("감마가 걸린 값에 배율을 곱하는 방식과 결과가 다르다 (선형에서 한다는 증거)", () => {
    const gains = { r: 1.3, g: 1, b: 0.8 };
    const c = { r: 120, g: 100, b: 90 };
    const linear = applyGains(c, gains);
    expect(linear.r).toBeCloseTo(linearToSrgb(srgbToLinear(120) * 1.3), 12);
    expect(Math.abs(linear.r - 120 * 1.3)).toBeGreaterThan(1);
  });
  it("보정 결과는 0~255 안 (1을 넘는 선형값은 1로 자름)", () => {
    const r = applyGains({ r: 250, g: 250, b: 250 }, { r: 1.9, g: 1, b: 0.5 });
    for (const v of [r.r, r.g, r.b]) expect(v >= 0 && v <= 255).toBe(true);
  });
  it("한도 '사용 안 함'이면 배율이 커도 적용한다", () => {
    const strong: LightingReference = { linearMean: { r: 0.9, g: 0.3, b: 0.05 }, areaRatio: 0.3 };
    const r = applyLighting(LIT, strong, { mode: "gray_world", grayWorld: { minAreaRatio: 0.05, maxGain: "off" } });
    expect(r).toMatchObject({ applied: "gray_world", fallback: false });
  });
});

describe("'보정 안 함'으로 대체 + lighting_fallback (완료 기준 15)", () => {
  it("보정 한도 초과: 자르지 않고 원래 값 그대로", () => {
    const strong: LightingReference = { linearMean: { r: 0.9, g: 0.3, b: 0.05 }, areaRatio: 0.3 };
    expect(applyLighting(LIT, strong, GW)).toEqual({
      sample: LIT,
      applied: "none",
      fallback: true,
      fallbackReason: "gain_limit",
    });
  });
  it("한도와 같은 배율은 통과 (경계값과 같으면 통과)", () => {
    // 배율 g = 2 가 되도록: 평균 0.4, 초록 채널 0.2 → r·b 는 0.5
    const edge: LightingReference = { linearMean: { r: 0.5, g: 0.2, b: 0.5 }, areaRatio: 0.3 };
    expect(grayWorldGains(edge)?.g).toBeCloseTo(2, 12);
    expect(applyLighting(LIT, edge, { mode: "gray_world", grayWorld: { minAreaRatio: 0.05, maxGain: 2.0000001 } }).fallback).toBe(false);
  });
  it("기준 영역이 작을 때", () => {
    expect(applyLighting(LIT, { ...REF, areaRatio: 0.01 }, GW)).toMatchObject({
      sample: LIT,
      applied: "none",
      fallback: true,
      fallbackReason: "small_area",
    });
  });
  it("기준 영역을 못 잴 때 (통계 없음·채널 0·잘못된 값)", () => {
    for (const ref of [
      undefined,
      { linearMean: { r: 0.4, g: 0, b: 0.4 }, areaRatio: 0.3 },
      { linearMean: { r: Number.NaN, g: 0.4, b: 0.4 }, areaRatio: 0.3 },
      { linearMean: { r: 0.4, g: 0.4, b: 0.4 }, areaRatio: 2 },
    ]) {
      expect(applyLighting(LIT, ref, GW)).toMatchObject({
        sample: LIT,
        applied: "none",
        fallback: true,
        fallbackReason: "no_reference",
      });
    }
  });
});

describe("결정성", () => {
  it("같은 입력이면 같은 결과", () => {
    expect(applyLighting(LIT, REF, GW)).toStrictEqual(applyLighting(LIT, REF, GW));
  });
});
