import { describe, expect, it } from "vitest";
import {
  QUALITY_CONFIG,
  QualityConfigInvalidError,
  QualityConfigNotSetError,
  RANGE_CHECK_IDS,
  requireQualityConfig,
} from "./quality-config";
import { TEST_QUALITY_CONFIG } from "./testing/quality-test-config";

const TEST_CONFIG = TEST_QUALITY_CONFIG;

describe("실제 품질 기준 (미설정 상태 보장)", () => {
  it("실제 기준에는 숫자가 하나도 없다 [미정]", () => {
    const text = JSON.stringify(QUALITY_CONFIG, (k, v) => (k === "dependsOnFace" || k === "onUnmeasured" ? undefined : v));
    expect(text).not.toMatch(/\d/);
  });
  it("02 기본 동작: 얼굴·밝기·선명도는 경고 꺼짐, 색 편향은 경고 미정(두 단계), 보정 의심은 실패 기준 없음", () => {
    for (const id of ["face_size", "face_angle", "sharpness"] as const) {
      expect(QUALITY_CONFIG[id].warn).toEqual({ min: "off", max: "off" });
    }
    // 밝기는 두 숫자, 각각 상한만 (M3-1b-Q2)
    for (const id of ["brightness_dark", "brightness_bright"] as const) {
      expect(QUALITY_CONFIG[id].fail).toEqual({ max: null });
      expect(QUALITY_CONFIG[id].warn).toEqual({ max: "off" });
    }
    expect(QUALITY_CONFIG.color_cast.warn).toEqual({ min: null, max: null });
    expect("fail" in QUALITY_CONFIG.filter_suspicion).toBe(false);
  });
  it("얼굴 기반 항목: 크기·각도·밝기·색 편향·선명도 (M3-1b-Q1·Q3)", () => {
    const faceBased = RANGE_CHECK_IDS.filter((id) => QUALITY_CONFIG[id].dependsOnFace);
    expect(faceBased).toEqual(["face_size", "face_angle", "brightness_dark", "brightness_bright", "color_cast", "sharpness"]);
  });
  it("못 재면 건너뜀: 색 편향만 (보정 의심은 경고만이라 항상 건너뜀), 나머지는 실패 (M3-1b-Q3)", () => {
    const skip = RANGE_CHECK_IDS.filter((id) => {
      const rule = QUALITY_CONFIG[id];
      return "onUnmeasured" in rule && rule.onUnmeasured === "skip";
    });
    expect(skip).toEqual(["color_cast"]);
    expect("onUnmeasured" in QUALITY_CONFIG.filter_suspicion).toBe(false);
  });
  it("비어 있는 채로 쓰면 '미설정' 오류 (비어 있는 위치를 알려줌)", () => {
    expect(() => requireQualityConfig()).toThrow(QualityConfigNotSetError);
    expect(() => requireQualityConfig()).toThrow(/미설정: face_size\.fail\.min, face_size\.fail\.max/);
    expect(() => requireQualityConfig()).toThrow(/filter_suspicion\.warn\.max/);
  });
});

describe("requireQualityConfig (테스트용 수치)", () => {
  it("모두 숫자 또는 off 면 통과", () => {
    expect(requireQualityConfig(TEST_CONFIG)).toBe(TEST_CONFIG);
  });
  it("하나만 비어도 미설정", () => {
    const c = { ...TEST_CONFIG, sharpness: { ...TEST_CONFIG.sharpness, fail: { min: 50, max: null } } };
    expect(() => requireQualityConfig(c)).toThrow(/미설정: sharpness\.fail\.max/);
  });
  it("min > max 는 잘못된 기준", () => {
    const c = { ...TEST_CONFIG, face_size: { ...TEST_CONFIG.face_size, fail: { min: 200, max: 100 } } };
    expect(() => requireQualityConfig(c)).toThrow(QualityConfigInvalidError);
  });
  it("상한만 있는 기준(밝기)도 비어 있으면 미설정, 경고 상한이 실패 상한보다 크면 잘못된 기준", () => {
    const c = { ...TEST_CONFIG, brightness_bright: { ...TEST_CONFIG.brightness_bright, fail: { max: null } } };
    expect(() => requireQualityConfig(c)).toThrow(/미설정: brightness_bright\.fail\.max/);
    const d = { ...TEST_CONFIG, brightness_dark: { ...TEST_CONFIG.brightness_dark, warn: { max: 0.5 } } };
    expect(() => requireQualityConfig(d)).toThrow(/brightness_dark: 경고 상한은 실패 상한 이하/);
  });
  it("경고 기준이 실패 기준보다 바깥이면 잘못된 기준", () => {
    const c = { ...TEST_CONFIG, color_cast: { ...TEST_CONFIG.color_cast, warn: { min: "off" as const, max: 40 } } };
    expect(() => requireQualityConfig(c)).toThrow(/경고 상한은 실패 상한 이하/);
    const d = { ...TEST_CONFIG, face_size: { ...TEST_CONFIG.face_size, warn: { min: 5, max: "off" as const } } };
    expect(() => requireQualityConfig(d)).toThrow(/경고 하한은 실패 하한 이상/);
  });
});
