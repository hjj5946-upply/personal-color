// 16톤 판정·2순위 (M3-2 완료 기준 5·6·10). 경계값·척도는 테스트 전용 임시 값 (실제는 [미정], M3-3).
import { describe, expect, it } from "vitest";
import { TONES_16, ToneConfigNotSetError, getTone, type ToneThresholdsDraft } from "./tone-config";
import { SECOND_TIE_ORDER, ToneInputError, judgeTone } from "./tone";
import type { ColorAxes } from "./types";

const T: ToneThresholdsDraft = {
  warmCoolSplit: 50,
  lightnessCuts: [55, 62, 70],
  chromaSplit: 20,
  secondScale: { warmCool: 10, lightness: 5, chroma: 4 },
};
const axes = (warmCool: number, lightness: number, chroma: number, contrast: number | null = 30): ColorAxes => ({
  warmCool,
  lightness,
  chroma,
  contrast,
});
const judge = (a: ColorAxes) => judgeTone(a, T);
const no = (id: string) => getTone(id)?.no;
const L_ORDER = ["dark", "mid_low", "mid_high", "light"];

describe("미설정", () => {
  it("실제 경계값이 비어 있으면 '미설정' 오류", () => {
    expect(() => judgeTone(axes(60, 65, 25))).toThrow(ToneConfigNotSetError);
  });
  it("특징값이 숫자가 아니면 오류", () => {
    expect(() => judge(axes(Number.NaN, 65, 25))).toThrow(ToneInputError);
  });
});

describe("1순위 (완료 기준 5)", () => {
  it("격자대로 판정", () => {
    expect(no(judge(axes(60, 75, 25)).tone16)).toBe(1); // 웜·밝음·선명
    expect(no(judge(axes(60, 50, 10)).tone16)).toBe(8); // 웜·어두움·탁함
    expect(no(judge(axes(40, 75, 25)).tone16)).toBe(9); // 쿨·밝음·선명 (겨울 브라이트)
    expect(no(judge(axes(40, 58, 10)).tone16)).toBe(14); // 쿨·중하·탁함 (여름 소프트)
  });
  it("경계와 같은 값은 '이상' 쪽", () => {
    expect(getTone(judge(axes(50, 65, 25)).tone16)?.warmCool).toBe("warm");
    expect(getTone(judge(axes(60, 65, 20)).tone16)?.chroma).toBe("vivid");
    expect(getTone(judge(axes(60, 55, 25)).tone16)?.lightness).toBe("mid_low");
    expect(getTone(judge(axes(60, 62, 25)).tone16)?.lightness).toBe("mid_high");
    expect(getTone(judge(axes(60, 70, 25)).tone16)?.lightness).toBe("light");
    expect(getTone(judge(axes(60, 54.999, 25)).tone16)?.lightness).toBe("dark");
  });
  it("16칸 모두 나올 수 있다", () => {
    const seen = new Set<string>();
    for (const w of [40, 60]) for (const l of [50, 58, 66, 75]) for (const c of [10, 25]) seen.add(judge(axes(w, l, c)).tone16);
    expect([...seen].sort()).toEqual(TONES_16.map((t) => t.id).sort());
  });
});

describe("2순위 (결정 로그 M3-D5·M3-2-Q6, 완료 기준 6)", () => {
  it("항상 1순위의 이웃: 한 축만 한 칸 다르다 (여러 값에서)", () => {
    for (let w = 20; w <= 80; w += 3.7)
      for (let l = 40; l <= 85; l += 2.3)
        for (let c = 5; c <= 35; c += 2.9) {
          const r = judge(axes(w, l, c));
          const a = getTone(r.tone16);
          const b = getTone(r.tone16Second);
          if (!a || !b) throw new Error("없는 톤");
          const diffs = [
            a.warmCool !== b.warmCool,
            Math.abs(L_ORDER.indexOf(a.lightness) - L_ORDER.indexOf(b.lightness)),
            a.chroma !== b.chroma,
          ];
          expect(Number(diffs[0]) + (diffs[1] as number) + Number(diffs[2])).toBe(1);
          // 바뀐 축 = secondAxis
          const changed = diffs[0] ? "warmCool" : diffs[1] ? "lightness" : "chroma";
          expect(changed).toBe(r.secondAxis);
        }
  });
  it("척도로 나눈 거리가 가장 작은 축을 고른다", () => {
    // 웜/쿨 거리 8/10=0.8, 명도 거리 min(66-62, 70-66)=4/5=0.8 → 동점, 채도 거리 1/4=0.25 → 채도
    expect(judge(axes(58, 66, 21)).secondAxis).toBe("chroma");
    // 웜/쿨 1/10=0.1 가장 작음
    expect(judge(axes(51, 66, 30)).secondAxis).toBe("warmCool");
    // 명도 0.5/5=0.1 vs 웜/쿨 3/10=0.3 → 명도
    expect(judge(axes(53, 69.5, 30)).secondAxis).toBe("lightness");
  });
  it("동점 순서는 웜/쿨 > 명도 > 채도", () => {
    expect(SECOND_TIE_ORDER).toEqual(["warmCool", "lightness", "chroma"]);
    // 세 축 모두 거리 1 (10/10, 밝음 칸의 아래 경계까지 5/5, 4/4)
    expect(judge(axes(60, 75, 24)).secondAxis).toBe("warmCool");
    // 명도·채도 동점(1), 웜/쿨은 2
    expect(judge(axes(70, 75, 24)).secondAxis).toBe("lightness");
  });
  it("명도는 가까운 경계 쪽 이웃 (그림의 예: 1순위 13번 겨울 트루)", () => {
    // 쿨·중하·선명. 웜/쿨·채도는 멀게 둔다
    expect(no(judge(axes(10, 61, 35)).tone16)).toBe(13);
    expect(no(judge(axes(10, 61, 35)).tone16Second)).toBe(11); // c2(62)에 가까움 → 여름 트루
    expect(no(judge(axes(10, 56, 35)).tone16Second)).toBe(15); // c1(55)에 가까움 → 겨울 딥
    expect(no(judge(axes(10, 58.5, 20.5)).tone16Second)).toBe(14); // 채도가 가장 애매 → 여름 소프트
    expect(no(judge(axes(49, 58.5, 35)).tone16Second)).toBe(5); // 웜/쿨이 가장 애매 → 가을 스트롱
  });
  it("명도 맨 끝 칸은 경계가 하나뿐 (밝음 → 중상, 어두움 → 중하)", () => {
    // 웜/쿨·채도는 아주 멀게 두어 명도가 고르게 한다
    expect(getTone(judge(axes(-1000, 99, 99)).tone16Second)?.lightness).toBe("mid_high");
    expect(getTone(judge(axes(-1000, 0, 99)).tone16Second)?.lightness).toBe("mid_low");
  });
  it("두 명도 경계까지 거리가 같으면 어두운 쪽", () => {
    expect(getTone(judge(axes(10, 66, 99)).tone16Second)?.lightness).toBe("mid_low");
  });
});

describe("대비는 판정에 쓰지 않는다 (회의-대비, 완료 기준 10)", () => {
  it("대비 값이 바뀌거나 null 이어도 1순위·2순위·축·거리가 같다", () => {
    for (const base of [axes(51, 66, 30), axes(10, 58.5, 20.5), axes(70, 67, 24)]) {
      const ref = judge(base);
      for (const contrast of [0, 5, 80, null]) expect(judge({ ...base, contrast })).toStrictEqual(ref);
    }
  });
});

describe("결정성", () => {
  it("같은 입력이면 같은 결과", () => {
    expect(judge(axes(53.3, 61.2, 19.9))).toStrictEqual(judge(axes(53.3, 61.2, 19.9)));
  });
});
