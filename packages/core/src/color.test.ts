import { describe, expect, it } from "vitest";
import { deltaE76, hexToRgb, hueToSigned, labToLch, median, rgbToHex, rgbToLab } from "./color";

describe("color", () => {
  it("hex <-> rgb 왕복", () => {
    expect(rgbToHex(hexToRgb("#3a3a40"))).toBe("#3A3A40");
    expect(() => hexToRgb("zzz")).toThrow();
  });
  it("흰색/검정 Lab", () => {
    expect(rgbToLab({ r: 255, g: 255, b: 255 }).l).toBeCloseTo(100, 0);
    expect(rgbToLab({ r: 0, g: 0, b: 0 }).l).toBeCloseTo(0, 0);
  });
  it("sRGB 원색 Lab 참고값 (D65, 소수 둘째 자리)", () => {
    const red = rgbToLab({ r: 255, g: 0, b: 0 });
    expect(red.l).toBeCloseTo(53.24, 2);
    expect(red.a).toBeCloseTo(80.09, 2);
    expect(red.b).toBeCloseTo(67.2, 2);
    const blue = rgbToLab({ r: 0, g: 0, b: 255 });
    expect(blue.l).toBeCloseTo(32.3, 2);
    expect(blue.a).toBeCloseTo(79.19, 2);
    expect(blue.b).toBeCloseTo(-107.86, 2);
  });
  it("같은 색은 색차 0, 결정적", () => {
    const a = rgbToLab(hexToRgb("#C46A5B"));
    expect(deltaE76(a, a)).toBe(0);
    expect(rgbToLab(hexToRgb("#C46A5B"))).toEqual(a);
  });
  it("중앙값", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 10])).toBe(2.5);
    expect(() => median([])).toThrow();
  });
});

describe("labToLch", () => {
  it("무채색(회색·흰색·검정)은 C*=0, h=0", () => {
    for (const v of [0, 1, 64, 128, 200, 255]) {
      const lch = labToLch(rgbToLab({ r: v, g: v, b: v }));
      expect(lch.c).toBe(0);
      expect(lch.h).toBe(0);
    }
  });
  it("축 방향 색상각: +a=0°, +b=90°, -a=180°, -b=270°", () => {
    expect(labToLch({ l: 50, a: 10, b: 0 }).h).toBeCloseTo(0, 10);
    expect(labToLch({ l: 50, a: 0, b: 10 }).h).toBeCloseTo(90, 10);
    expect(labToLch({ l: 50, a: -10, b: 0 }).h).toBeCloseTo(180, 10);
    expect(labToLch({ l: 50, a: 0, b: -10 }).h).toBeCloseTo(270, 10);
  });
  it("C* = √(a²+b²), L* 유지", () => {
    const lch = labToLch({ l: 42, a: 3, b: 4 });
    expect(lch.l).toBe(42);
    expect(lch.c).toBeCloseTo(5, 12);
  });
  it("색상각은 항상 0 이상 360 미만 (여러 색)", () => {
    for (let r = 0; r <= 255; r += 51)
      for (let g = 0; g <= 255; g += 51)
        for (let b = 0; b <= 255; b += 51) {
          const { h } = labToLch(rgbToLab({ r, g, b }));
          expect(h).toBeGreaterThanOrEqual(0);
          expect(h).toBeLessThan(360);
        }
  });
});

describe("hueToSigned", () => {
  it("-180 초과 180 이하로 바꾼다", () => {
    expect(hueToSigned(0)).toBe(0);
    expect(hueToSigned(45)).toBe(45);
    expect(hueToSigned(180)).toBe(180);
    expect(hueToSigned(355)).toBe(-5);
    expect(hueToSigned(360)).toBe(0);
    expect(hueToSigned(-10)).toBe(-10);
  });
});
