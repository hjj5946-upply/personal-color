import { describe, expect, it } from "vitest";
import {
  CONFIG_VERSION,
  TONES_12,
  TONES_16,
  TONE_THRESHOLDS,
  ToneConfigNotSetError,
  getTone,
  requireToneThresholds,
  toTone12,
  toneIdOf,
} from "./tone-config";

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

const SCALE = { warmCool: 1, lightness: 1, chroma: 1 };

describe("16톤 경계값 (미설정 상태 보장)", () => {
  it("실제 경계값은 아직 비어 있다 [미정]", () => {
    expect(TONE_THRESHOLDS).toEqual({ warmCoolSplit: null, lightnessCuts: null, chromaSplit: null, secondScale: null });
  });
  it("비어 있는 채로 쓰려고 하면 '미설정' 오류", () => {
    expect(() => requireToneThresholds()).toThrow(ToneConfigNotSetError);
    expect(() => requireToneThresholds()).toThrow(/미설정: warmCoolSplit, lightnessCuts, chromaSplit, secondScale/);
  });
  it("하나만 비어도 오류 (테스트용 값)", () => {
    expect(() =>
      requireToneThresholds({ warmCoolSplit: 1, lightnessCuts: [1, 2, 3], chromaSplit: null, secondScale: SCALE }),
    ).toThrow(/미설정: chromaSplit/);
  });
  it("모두 채워지면 통과, 명도 경계는 오름차순이어야 함 (테스트용 값)", () => {
    const t = { warmCoolSplit: 1, lightnessCuts: [1, 2, 3] as const, chromaSplit: 1, secondScale: SCALE };
    expect(requireToneThresholds(t)).toEqual(t);
    expect(() => requireToneThresholds({ ...t, lightnessCuts: [3, 2, 1] })).toThrow(ToneConfigNotSetError);
    expect(() => requireToneThresholds({ ...t, secondScale: { ...SCALE, chroma: 0 } })).toThrow(/0보다 커야/);
  });
});

describe("표시 이름·4계절 (결정 로그 회의-톤이름, 완료 기준 1)", () => {
  const SEASON_PREFIX = { 봄: "spring", 여름: "summer", 가을: "autumn", 겨울: "winter" } as const;
  it("16톤 전부 4계절 = 이름 앞글자", () => {
    for (const t of TONES_16) {
      const prefix = t.nameKo.split(" ")[0] as keyof typeof SEASON_PREFIX;
      expect(SEASON_PREFIX[prefix], t.nameKo).toBe(t.season4);
    }
  });
  it("9번 = 겨울 브라이트, 14번 = 여름 소프트 (ID·축은 그대로)", () => {
    expect(getTone("cool_light_vivid")).toMatchObject({ no: 9, nameKo: "겨울 브라이트", season4: "winter" });
    expect(getTone("cool_mid_low_muted")).toMatchObject({ no: 14, nameKo: "여름 소프트", season4: "summer" });
  });
  it("configVersion 이 뼈대 값에서 올라감", () => {
    expect(CONFIG_VERSION).not.toBe("0.0.1-skeleton");
  });
});

describe("12톤 대응표 (결정 로그 회의-12톤, 완료 기준 2)", () => {
  it("12톤은 12개, ID 유일, 계절마다 3개", () => {
    expect(TONES_12).toHaveLength(12);
    expect(new Set(TONES_12.map((t) => t.id)).size).toBe(12);
    for (const s of ["spring", "summer", "autumn", "winter"]) {
      expect(TONES_12.filter((t) => t.season4 === s)).toHaveLength(3);
    }
  });
  it("16톤이 모두 대응되고, 16톤과 12톤의 계절이 같다", () => {
    for (const t of TONES_16) expect(toTone12(t.id).season4, t.nameKo).toBe(t.season4);
  });
  it("12톤 12개가 모두 쓰인다", () => {
    expect(new Set(TONES_16.map((t) => toTone12(t.id).id)).size).toBe(12);
  });
  it("대응표가 기획 회의 결정과 같다", () => {
    expect(TONES_16.map((t) => `${t.no}:${toTone12(t.id).nameKo}`)).toEqual([
      "1:봄 브라이트",
      "2:봄 라이트",
      "3:봄 트루",
      "4:봄 트루",
      "5:가을 트루",
      "6:가을 뮤트",
      "7:가을 딥",
      "8:가을 딥",
      "9:겨울 브라이트",
      "10:여름 라이트",
      "11:여름 트루",
      "12:여름 뮤트",
      "13:겨울 트루",
      "14:여름 뮤트",
      "15:겨울 딥",
      "16:겨울 딥",
    ]);
  });
  it("확신 낮음은 4번·14번뿐 (설정에만 있음)", () => {
    expect(TONES_16.filter((t) => t.tone12LowConfidence).map((t) => t.no)).toEqual([4, 14]);
  });
  it("모르는 ID는 오류", () => {
    expect(() => toTone12("summer_bright")).toThrow(/알 수 없는 16톤 ID/);
  });
});
