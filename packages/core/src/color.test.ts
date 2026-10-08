import { describe, expect, it } from "vitest";
import { deltaE76, hexToRgb, median, rgbToHex, rgbToLab } from "./color";

describe("color", () => {
  it("hex <-> rgb 왕복", () => {
    expect(rgbToHex(hexToRgb("#3a3a40"))).toBe("#3A3A40");
    expect(() => hexToRgb("zzz")).toThrow();
  });
  it("흰색/검정 Lab", () => {
    expect(rgbToLab({ r: 255, g: 255, b: 255 }).l).toBeCloseTo(100, 0);
    expect(rgbToLab({ r: 0, g: 0, b: 0 }).l).toBeCloseTo(0, 0);
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
