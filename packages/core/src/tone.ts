// 16톤 판정 (파이프라인 ⑤)과 2순위 (결정 로그 M3-D5·M3-2-Q6). 결정적.
// 판정에는 warmCool·lightness·chroma 만 쓴다. 대비(contrast)는 쓰지 않는다 (회의-대비).
import { TONE_THRESHOLDS, getTone, requireToneThresholds, toneIdOf } from "./tone-config";
import type { ToneThresholdsDraft } from "./tone-config";
import type { ColorAxes, LightnessLevel, Tone16Id } from "./types";

export type ToneAxis = "warmCool" | "lightness" | "chroma";

/** 2순위 동점일 때 먼저 고르는 순서: 웜/쿨 > 명도 > 채도 (웜/쿨이 조명에 가장 흔들리고 틀리면 가장 치명적, M3-2-Q6) */
export const SECOND_TIE_ORDER: readonly ToneAxis[] = ["warmCool", "lightness", "chroma"];

/** 어두움 → 밝음 순서 (lightnessCuts 와 같은 방향) */
const LIGHTNESS_LEVELS: readonly LightnessLevel[] = ["dark", "mid_low", "mid_high", "light"];

export interface ToneJudgement {
  tone16: Tone16Id;
  /** 2순위: 가장 애매했던 축의 경계를 건넌 이웃 칸. 항상 1순위와 한 축만 한 칸 다르다 */
  tone16Second: Tone16Id;
  /** 2순위를 고른 축 */
  secondAxis: ToneAxis;
  /**
   * 축별 "가장 가까운 경계까지 거리 ÷ 척도". 작을수록 애매하다. 신뢰도 ④(1·2순위 차이)에 쓴다.
   * 판정 과정의 값이며 ColorProfile 에는 넣지 않는다.
   */
  margins: Readonly<Record<ToneAxis, number>>;
}

export class ToneInputError extends Error {
  override name = "ToneInputError";
}

/**
 * 특징값 → 16톤 1순위·2순위. 경계값·척도가 비어 있으면 ToneConfigNotSetError ("미설정").
 * - 경계와 **같은 값은 "이상" 쪽**: warmCool ≥ warmCoolSplit → 웜, chroma ≥ chromaSplit → 선명, lightness ≥ 경계 → 한 칸 밝은 쪽
 * - 2순위: 축마다 가장 가까운 경계까지 거리를 척도로 나눠, 가장 작은 축의 경계를 건넌 칸. 동점이면 SECOND_TIE_ORDER
 * - 명도는 경계가 둘일 수 있어 가까운 쪽을 고른다. 두 경계까지 거리가 같으면 어두운 쪽
 */
export function judgeTone(axes: ColorAxes, draft: ToneThresholdsDraft = TONE_THRESHOLDS): ToneJudgement {
  const t = requireToneThresholds(draft);
  const { warmCool, lightness, chroma } = axes;
  if (![warmCool, lightness, chroma].every(Number.isFinite)) throw new ToneInputError("특징값이 숫자가 아니에요");

  const isWarm = warmCool >= t.warmCoolSplit;
  const isVivid = chroma >= t.chromaSplit;
  const li = t.lightnessCuts.filter((c) => lightness >= c).length; // 0 어두움 ~ 3 밝음

  // 명도: 아래 경계(cuts[li-1])와 위 경계(cuts[li]) 중 가까운 쪽
  const down = li > 0 ? lightness - (t.lightnessCuts[li - 1] as number) : Infinity;
  const up = li < 3 ? (t.lightnessCuts[li] as number) - lightness : Infinity;
  const lightnessStep = down <= up ? -1 : 1;

  const margins: Record<ToneAxis, number> = {
    warmCool: Math.abs(warmCool - t.warmCoolSplit) / t.secondScale.warmCool,
    lightness: Math.min(down, up) / t.secondScale.lightness,
    chroma: Math.abs(chroma - t.chromaSplit) / t.secondScale.chroma,
  };
  // 가장 작은 거리. 같으면 SECOND_TIE_ORDER 에서 앞선 축 (엄격히 작을 때만 바꾼다)
  let secondAxis: ToneAxis = SECOND_TIE_ORDER[0] as ToneAxis;
  for (const a of SECOND_TIE_ORDER) if (margins[a] < margins[secondAxis]) secondAxis = a;

  const cell = (warm: boolean, lIdx: number, vivid: boolean) =>
    toneIdOf(warm ? "warm" : "cool", LIGHTNESS_LEVELS[lIdx] as LightnessLevel, vivid ? "vivid" : "muted");
  const tone16 = cell(isWarm, li, isVivid);
  const tone16Second =
    secondAxis === "warmCool"
      ? cell(!isWarm, li, isVivid)
      : secondAxis === "chroma"
        ? cell(isWarm, li, !isVivid)
        : cell(isWarm, li + lightnessStep, isVivid);
  if (!getTone(tone16) || !getTone(tone16Second)) throw new Error("16톤 표에 없는 칸이에요"); // 일어나면 안 됨
  return { tone16, tone16Second, secondAxis, margins };
}
