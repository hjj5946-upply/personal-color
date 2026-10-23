import { describe, expect, it } from "vitest";
import { TONES_16, TONE_THRESHOLDS, ToneConfigNotSetError, getTone, requireToneThresholds, toneIdOf } from "./tone-config";

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
    expect(getTone("warm_light_vivid")?.nameKo).toBe("봄 브라이트");
    expect(getTone("nope")).toBeUndefined();
  });
});

describe("톤 ID (결정 로그 M3-2-Q1, 완료 기준 14)", () => {
  it("ID = 축 위치(계열·명도·채도)에서 따온 이름", () => {
    for (const t of TONES_16) expect(t.id).toBe(toneIdOf(t.warmCool, t.lightness, t.chroma));
  });
  it("16개 ID 중복 없음", () => {
    expect(new Set(TONES_16.map((t) => t.id)).size).toBe(16);
  });
  it("ID 목록 고정 (M6부터 동결. 표시 이름·계절을 바꿔도 이 목록은 그대로여야 한다)", () => {
    expect(TONES_16.map((t) => t.id)).toEqual([
      "warm_light_vivid",
      "warm_light_muted",
      "warm_mid_high_vivid",
      "warm_mid_high_muted",
      "warm_mid_low_vivid",
      "warm_mid_low_muted",
      "warm_dark_vivid",
      "warm_dark_muted",
      "cool_light_vivid",
      "cool_light_muted",
      "cool_mid_high_vivid",
      "cool_mid_high_muted",
      "cool_mid_low_vivid",
      "cool_mid_low_muted",
      "cool_dark_vivid",
      "cool_dark_muted",
    ]);
  });
  it("표시 이름을 바꿔도 ID는 축 위치로만 정해진다", () => {
    for (const t of TONES_16) {
      const renamed = { ...t, nameKo: "다른 이름", season4: "winter" as const };
      expect(toneIdOf(renamed.warmCool, renamed.lightness, renamed.chroma)).toBe(t.id);
    }
  });
  it("ID에 계절 이름이 들어 있지 않다 (이름이 바뀌어도 어긋나지 않게)", () => {
    for (const t of TONES_16) expect(t.id).not.toMatch(/spring|summer|autumn|winter/);
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
