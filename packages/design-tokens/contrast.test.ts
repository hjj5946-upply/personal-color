// 글자색 토큰 × 배경 토큰 대비가 WCAG 2.1 AA(일반 글자 4.5:1)를 넘는지 검사한다 (04 접근성, 06 토큰).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokens = JSON.parse(readFileSync(new URL("./tokens.json", import.meta.url), "utf8")) as {
  color: Record<string, string>;
};
const MIN_TEXT_CONTRAST = 4.5;
const TEXT_TOKENS = ["text", "textStrong", "textSub"] as const;
const BG_TOKENS = ["bg", "bgSub", "colorStage"] as const;

/** WCAG 2.1 상대 휘도 */
function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m || !m[1]) throw new Error(`Invalid hex color: ${hex}`);
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("대비 계산", () => {
  it("검정/흰색은 21:1, 같은 색은 1:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#6B6B73", "#6B6B73")).toBe(1);
  });
});

describe("글자색 토큰 대비 (WCAG AA 4.5:1 이상)", () => {
  for (const fg of TEXT_TOKENS) {
    for (const bg of BG_TOKENS) {
      it(`${fg} on ${bg}`, () => {
        const f = tokens.color[fg];
        const b = tokens.color[bg];
        expect(f, `토큰 color.${fg} 없음`).toBeDefined();
        expect(b, `토큰 color.${bg} 없음`).toBeDefined();
        expect(contrastRatio(f!, b!)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      });
    }
  }
});
