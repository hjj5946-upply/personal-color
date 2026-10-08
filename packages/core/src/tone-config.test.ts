import { describe, expect, it } from "vitest";
import { TONES_16, getTone } from "./tone-config";

describe("16톤 구조", () => {
  it("정확히 16개, ID·번호 유일", () => {
    expect(TONES_16).toHaveLength(16);
    expect(new Set(TONES_16.map((t) => t.id)).size).toBe(16);
    expect(TONES_16.map((t) => t.no)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });
  it("웜/쿨 × 명도4 × 채도2 격자를 빠짐없이 채운다", () => {
    const keys = new Set(TONES_16.map((t) => `${t.warmCool}-${t.lightness}-${t.chroma}`));
    expect(keys.size).toBe(16);
  });
  it("조회", () => {
    expect(getTone("spring_bright")?.nameKo).toBe("봄 브라이트");
    expect(getTone("nope")).toBeUndefined();
  });
});
