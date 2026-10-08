import { describe, expect, it } from "vitest";
import { TONES_16, TONE_THRESHOLDS, ToneConfigNotSetError, getTone, requireToneThresholds } from "./tone-config";

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

describe("16톤 경계값 (미설정 상태 보장)", () => {
  it("실제 경계값은 아직 비어 있다 [미정]", () => {
    expect(TONE_THRESHOLDS).toEqual({ warmCoolSplit: null, lightnessCuts: null, chromaSplit: null });
  });
  it("비어 있는 채로 쓰려고 하면 '미설정' 오류", () => {
    expect(() => requireToneThresholds()).toThrow(ToneConfigNotSetError);
    expect(() => requireToneThresholds()).toThrow(/미설정: warmCoolSplit, lightnessCuts, chromaSplit/);
  });
  it("하나만 비어도 오류 (테스트용 값)", () => {
    expect(() => requireToneThresholds({ warmCoolSplit: 1, lightnessCuts: [1, 2, 3], chromaSplit: null })).toThrow(
      /미설정: chromaSplit/,
    );
  });
  it("모두 채워지면 통과, 명도 경계는 오름차순이어야 함 (테스트용 값)", () => {
    const t = { warmCoolSplit: 1, lightnessCuts: [1, 2, 3] as const, chromaSplit: 1 };
    expect(requireToneThresholds(t)).toEqual(t);
    expect(() => requireToneThresholds({ ...t, lightnessCuts: [3, 2, 1] })).toThrow(ToneConfigNotSetError);
  });
});
