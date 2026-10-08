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
    const text = JSON.stringify(QUALITY_CONFIG, (k, v) => (k === "dependsOnFace" ? undefined : v));
    expect(text).not.toMatch(/\d/);
  });
  it("02 기본 동작: 얼굴·밝기·선명도는 경고 꺼짐, 색 편향은 경고 미정(두 단계), 보정 의심은 실패 기준 없음", () => {
    for (const id of ["face_size", "face_angle", "brightness", "sharpness"] as const) {
      expect(QUALITY_CONFIG[id].warn).toEqual({ min: "off", max: "off" });
    }
    expect(QUALITY_CONFIG.color_cast.warn).toEqual({ min: null, max: null });
    expect("fail" in QUALITY_CONFIG.filter_suspicion).toBe(false);
  });
  it("얼굴 기반 항목은 얼굴 크기·각도", () => {
    const faceBased = RANGE_CHECK_IDS.filter((id) => QUALITY_CONFIG[id].dependsOnFace);
    expect(faceBased).toEqual(["face_size", "face_angle"]);
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
    const c = { ...TEST_CONFIG, brightness: { ...TEST_CONFIG.brightness, fail: { min: 200, max: 100 } } };
    expect(() => requireQualityConfig(c)).toThrow(QualityConfigInvalidError);
  });
  it("경고 기준이 실패 기준보다 바깥이면 잘못된 기준", () => {
    const c = { ...TEST_CONFIG, color_cast: { ...TEST_CONFIG.color_cast, warn: { min: "off" as const, max: 40 } } };
    expect(() => requireQualityConfig(c)).toThrow(/경고 상한은 실패 상한 이하/);
    const d = { ...TEST_CONFIG, brightness: { ...TEST_CONFIG.brightness, warn: { min: 30, max: "off" as const } } };
    expect(() => requireQualityConfig(d)).toThrow(/경고 하한은 실패 하한 이상/);
  });
});
