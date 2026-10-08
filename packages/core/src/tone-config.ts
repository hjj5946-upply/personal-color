// 16톤 구조 [확정] / 이름·경계값 [미정, 튜닝 대상]. O-6: 결과에 configVersion 을 남긴다.
// 드문 칸(4, 8, 14, 16번)은 지인 데이터를 보고 합치거나 이름을 바꾼다.
import type { ChromaLevel, LightnessLevel, Season4, WarmCool } from "./types";

export const CONFIG_VERSION = "0.0.1-skeleton";

export interface ToneDef {
  id: string;
  no: number;
  nameKo: string;
  season4: Season4;
  warmCool: WarmCool;
  lightness: LightnessLevel;
  chroma: ChromaLevel;
}

export const TONES_16: readonly ToneDef[] = [
  { id: "spring_bright", no: 1, nameKo: "봄 브라이트", season4: "spring", warmCool: "warm", lightness: "light", chroma: "vivid" },
  { id: "spring_light", no: 2, nameKo: "봄 라이트", season4: "spring", warmCool: "warm", lightness: "light", chroma: "muted" },
  { id: "spring_true", no: 3, nameKo: "봄 트루", season4: "spring", warmCool: "warm", lightness: "mid_high", chroma: "vivid" },
  { id: "spring_soft", no: 4, nameKo: "봄 소프트", season4: "spring", warmCool: "warm", lightness: "mid_high", chroma: "muted" },
  { id: "autumn_strong", no: 5, nameKo: "가을 스트롱", season4: "autumn", warmCool: "warm", lightness: "mid_low", chroma: "vivid" },
  { id: "autumn_mute", no: 6, nameKo: "가을 뮤트", season4: "autumn", warmCool: "warm", lightness: "mid_low", chroma: "muted" },
  { id: "autumn_deep", no: 7, nameKo: "가을 딥", season4: "autumn", warmCool: "warm", lightness: "dark", chroma: "vivid" },
  { id: "autumn_deepmute", no: 8, nameKo: "가을 딥뮤트", season4: "autumn", warmCool: "warm", lightness: "dark", chroma: "muted" },
  { id: "summer_bright", no: 9, nameKo: "여름 브라이트", season4: "summer", warmCool: "cool", lightness: "light", chroma: "vivid" },
  { id: "summer_light", no: 10, nameKo: "여름 라이트", season4: "summer", warmCool: "cool", lightness: "light", chroma: "muted" },
  { id: "summer_true", no: 11, nameKo: "여름 트루", season4: "summer", warmCool: "cool", lightness: "mid_high", chroma: "vivid" },
  { id: "summer_mute", no: 12, nameKo: "여름 뮤트", season4: "summer", warmCool: "cool", lightness: "mid_high", chroma: "muted" },
  { id: "winter_true", no: 13, nameKo: "겨울 트루", season4: "winter", warmCool: "cool", lightness: "mid_low", chroma: "vivid" },
  { id: "winter_soft", no: 14, nameKo: "겨울 소프트", season4: "winter", warmCool: "cool", lightness: "mid_low", chroma: "muted" },
  { id: "winter_deep", no: 15, nameKo: "겨울 딥", season4: "winter", warmCool: "cool", lightness: "dark", chroma: "vivid" },
  { id: "winter_deepmute", no: 16, nameKo: "겨울 딥뮤트", season4: "winter", warmCool: "cool", lightness: "dark", chroma: "muted" },
] as const;

/** 16톤 경계값. 단위는 특징값과 같다 (02 특징값 정의). */
export interface ToneThresholds {
  /** warmCool(피부 h°) 이 값 이상이면 웜 */
  warmCoolSplit: number;
  /** lightness(피부 L*) 경계 3개, 오름차순: 어두움 | 중하 | 중상 | 밝음 */
  lightnessCuts: readonly [number, number, number];
  /** chroma(피부 C*) 이 값 이상이면 선명 */
  chromaSplit: number;
}

/** 아직 정하지 않은 상태를 포함한 경계값 */
export type ToneThresholdsDraft = { readonly [K in keyof ToneThresholds]: ToneThresholds[K] | null };

/** 경계값 자리표시자. 실제 수치는 M3에서 샘플 사진으로 1차 설정하고 지인 피드백으로 튜닝 [미정]. 추정으로 채우지 않는다. */
export const TONE_THRESHOLDS: ToneThresholdsDraft = {
  warmCoolSplit: null,
  lightnessCuts: null,
  chromaSplit: null,
};

/** 경계값이 아직 설정되지 않았거나 잘못됐을 때 */
export class ToneConfigNotSetError extends Error {
  override name = "ToneConfigNotSetError";
}

/** 판정(M3)에서 경계값을 쓰기 전에 부른다. 하나라도 비어 있으면 "미설정" 오류. */
export function requireToneThresholds(draft: ToneThresholdsDraft = TONE_THRESHOLDS): ToneThresholds {
  const missing = (Object.keys(draft) as (keyof ToneThresholds)[]).filter((k) => draft[k] === null);
  if (missing.length) {
    throw new ToneConfigNotSetError(
      `16톤 경계값 미설정: ${missing.join(", ")} (configVersion ${CONFIG_VERSION}). M3에서 샘플로 정한다.`,
    );
  }
  const t = draft as ToneThresholds;
  const [c1, c2, c3] = t.lightnessCuts;
  if (!(c1 < c2 && c2 < c3)) throw new ToneConfigNotSetError("lightnessCuts 는 오름차순 3개여야 해요");
  return t;
}

export function getTone(id: string): ToneDef | undefined {
  return TONES_16.find((t) => t.id === id);
}
