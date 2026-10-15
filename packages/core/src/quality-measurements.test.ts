import { describe, expect, it } from "vitest";
import { validateQualityMeasurements } from "./quality-measurements";

const errorsOf = (input: unknown) => {
  const r = validateQualityMeasurements(input);
  return r.ok ? [] : r.errors;
};

describe("validateQualityMeasurements — 통과", () => {
  it("모든 측정값", () => {
    const m = {
      faceCount: 1,
      faceSize: 0.4,
      faceAngle: -3,
      brightnessDark: 0.02,
      brightnessBright: 0,
      colorCast: -2.5,
      sharpness: 80,
      filterSuspicion: 0.1,
    };
    expect(validateQualityMeasurements(m)).toEqual({ ok: true, measurements: m });
  });
  it("측정 못 한 값은 빠져도 통과 (빈 객체 포함)", () => {
    expect(validateQualityMeasurements({ faceCount: 0 })).toEqual({ ok: true, measurements: { faceCount: 0 } });
    expect(validateQualityMeasurements({})).toEqual({ ok: true, measurements: {} });
  });
  it("돌려주는 값은 새 객체", () => {
    const m = { brightnessDark: 1 };
    const r = validateQualityMeasurements(m);
    if (!r.ok) throw new Error("unexpected");
    expect(r.measurements).not.toBe(m);
  });
});

describe("validateQualityMeasurements — 거부", () => {
  it("객체가 아니면 거부", () => {
    for (const v of [null, undefined, 3, "x", []]) expect(errorsOf(v).length).toBeGreaterThan(0);
  });
  it("숫자가 아니거나 NaN·Infinity·null 이면 거부", () => {
    for (const bad of ["1", NaN, Infinity, -Infinity, null, true, [1]]) {
      expect(errorsOf({ sharpness: bad })).toEqual(["sharpness: 숫자여야 해요"]);
    }
  });
  it("밝기 두 숫자는 0~1 비율만 (M3-1b-Q2)", () => {
    for (const bad of [-0.01, 1.01]) {
      expect(errorsOf({ brightnessDark: bad })).toEqual(["brightnessDark: 0~1 비율이어야 해요"]);
      expect(errorsOf({ brightnessBright: bad })).toEqual(["brightnessBright: 0~1 비율이어야 해요"]);
    }
    expect(errorsOf({ brightnessDark: 0, brightnessBright: 1 })).toEqual([]);
  });
  it("예전 밝기 측정값 이름(brightness)은 더 이상 받지 않는다", () => {
    expect(errorsOf({ brightness: 0.5 })).toEqual(["brightness: 허용되지 않은 필드예요"]);
  });
  it("faceCount 는 0 이상 정수만", () => {
    for (const bad of [-1, 1.5]) expect(errorsOf({ faceCount: bad })).toEqual(["faceCount: 0 이상 정수여야 해요"]);
  });
  it("O-1·O-2: 좌표·이미지 필드는 금지 필드로 거부", () => {
    for (const k of ["landmarks", "image", "imageData", "faceBox", "bbox", "coordinates", "points", "faceMesh"]) {
      expect(errorsOf({ faceCount: 1, [k]: [1, 2] })).toContain(
        `${k}: 금지 필드예요 (사진·좌표·얼굴 데이터는 받지 않아요, O-1·O-2)`,
      );
    }
  });
  it("모르는 필드는 거부 (허용 목록 방식)", () => {
    expect(errorsOf({ exposure: 1 })).toEqual(["exposure: 허용되지 않은 필드예요"]);
  });
  it("O-2: 오류 메시지에 측정값 숫자가 들어가지 않는다", () => {
    const msgs = errorsOf({ faceCount: 2.71828, faceAngle: "31.4159" }).join(" ");
    expect(msgs).not.toMatch(/2\.71828|31\.4159/);
  });
});
