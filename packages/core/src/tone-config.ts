// 16톤 구조 [확정] / 이름·경계값 [미정, 튜닝 대상]. O-6: 결과에 configVersion 을 남긴다.
// 4계절 = 이름 앞글자, 12톤 = 대응표로 파생 (결정 로그 회의-톤이름·회의-12톤). 드문 칸(4, 8, 14, 16번)은 M3-3 샘플 분포를 보고 합칠지 정한다.
import type { ChromaLevel, LightnessLevel, Season4, WarmCool } from "./types";

/** 기준값·이름·대응표가 바뀌면 올린다 (O-6) */
export const CONFIG_VERSION = "0.1.0";

/**
 * 톤 ID = 구조에서 따온 이름 `{계열}_{명도}_{채도}` (결정 로그 M3-2-Q1). 구조는 [확정]이라 ID도 바뀌지 않는다.
 * 표시 이름(nameKo)은 [미정, 튜닝 대상]이므로 ID에 쓰지 않는다. DB를 만드는 M6부터 ID 동결.
 */
export function toneIdOf(warmCool: WarmCool, lightness: LightnessLevel, chroma: ChromaLevel): string {
  return `${warmCool}_${lightness}_${chroma}`;
}

export interface ToneDef {
  /** toneIdOf(warmCool, lightness, chroma) 와 같다 (테스트로 보장) */
  id: string;
  no: number;
  nameKo: string;
  season4: Season4;
  warmCool: WarmCool;
  lightness: LightnessLevel;
  chroma: ChromaLevel;
  /** 12톤 대응 (TONES_12 의 id) */
  tone12: Tone12Id;
  /** 대응이 특히 불확실함. 설정에만 두고 ColorProfile 에는 넣지 않는다 (M3-2-Q3, 화면 표시는 M4) */
  tone12LowConfidence: boolean;
}

/**
 * 12톤 [설계안, 업계 표준 아님 — 최종 이름은 사람 검수 대상]. 16톤에서 파생해 보여줄 때만 쓴다.
 * ID는 계절_이름. 판정·2순위·신뢰도는 16톤 기준 (02 "12톤 대응표").
 */
export const TONES_12 = [
  { id: "spring_bright", nameKo: "봄 브라이트", season4: "spring" },
  { id: "spring_light", nameKo: "봄 라이트", season4: "spring" },
  { id: "spring_true", nameKo: "봄 트루", season4: "spring" },
  { id: "summer_light", nameKo: "여름 라이트", season4: "summer" },
  { id: "summer_true", nameKo: "여름 트루", season4: "summer" },
  { id: "summer_mute", nameKo: "여름 뮤트", season4: "summer" },
  { id: "autumn_true", nameKo: "가을 트루", season4: "autumn" },
  { id: "autumn_mute", nameKo: "가을 뮤트", season4: "autumn" },
  { id: "autumn_deep", nameKo: "가을 딥", season4: "autumn" },
  { id: "winter_bright", nameKo: "겨울 브라이트", season4: "winter" },
  { id: "winter_true", nameKo: "겨울 트루", season4: "winter" },
  { id: "winter_deep", nameKo: "겨울 딥", season4: "winter" },
] as const satisfies readonly { id: string; nameKo: string; season4: Season4 }[];
export type Tone12Id = (typeof TONES_12)[number]["id"];
export type Tone12Def = (typeof TONES_12)[number];

export const TONES_16: readonly ToneDef[] = [
  { id: "warm_light_vivid", no: 1, nameKo: "봄 브라이트", season4: "spring", warmCool: "warm", lightness: "light", chroma: "vivid", tone12: "spring_bright", tone12LowConfidence: false },
  { id: "warm_light_muted", no: 2, nameKo: "봄 라이트", season4: "spring", warmCool: "warm", lightness: "light", chroma: "muted", tone12: "spring_light", tone12LowConfidence: false },
  { id: "warm_mid_high_vivid", no: 3, nameKo: "봄 트루", season4: "spring", warmCool: "warm", lightness: "mid_high", chroma: "vivid", tone12: "spring_true", tone12LowConfidence: false },
  { id: "warm_mid_high_muted", no: 4, nameKo: "봄 소프트", season4: "spring", warmCool: "warm", lightness: "mid_high", chroma: "muted", tone12: "spring_true", tone12LowConfidence: true },
  { id: "warm_mid_low_vivid", no: 5, nameKo: "가을 스트롱", season4: "autumn", warmCool: "warm", lightness: "mid_low", chroma: "vivid", tone12: "autumn_true", tone12LowConfidence: false },
  { id: "warm_mid_low_muted", no: 6, nameKo: "가을 뮤트", season4: "autumn", warmCool: "warm", lightness: "mid_low", chroma: "muted", tone12: "autumn_mute", tone12LowConfidence: false },
  { id: "warm_dark_vivid", no: 7, nameKo: "가을 딥", season4: "autumn", warmCool: "warm", lightness: "dark", chroma: "vivid", tone12: "autumn_deep", tone12LowConfidence: false },
  { id: "warm_dark_muted", no: 8, nameKo: "가을 딥뮤트", season4: "autumn", warmCool: "warm", lightness: "dark", chroma: "muted", tone12: "autumn_deep", tone12LowConfidence: false },
  { id: "cool_light_vivid", no: 9, nameKo: "겨울 브라이트", season4: "winter", warmCool: "cool", lightness: "light", chroma: "vivid", tone12: "winter_bright", tone12LowConfidence: false },
  { id: "cool_light_muted", no: 10, nameKo: "여름 라이트", season4: "summer", warmCool: "cool", lightness: "light", chroma: "muted", tone12: "summer_light", tone12LowConfidence: false },
  { id: "cool_mid_high_vivid", no: 11, nameKo: "여름 트루", season4: "summer", warmCool: "cool", lightness: "mid_high", chroma: "vivid", tone12: "summer_true", tone12LowConfidence: false },
  { id: "cool_mid_high_muted", no: 12, nameKo: "여름 뮤트", season4: "summer", warmCool: "cool", lightness: "mid_high", chroma: "muted", tone12: "summer_mute", tone12LowConfidence: false },
  { id: "cool_mid_low_vivid", no: 13, nameKo: "겨울 트루", season4: "winter", warmCool: "cool", lightness: "mid_low", chroma: "vivid", tone12: "winter_true", tone12LowConfidence: false },
  { id: "cool_mid_low_muted", no: 14, nameKo: "여름 소프트", season4: "summer", warmCool: "cool", lightness: "mid_low", chroma: "muted", tone12: "summer_mute", tone12LowConfidence: true },
  { id: "cool_dark_vivid", no: 15, nameKo: "겨울 딥", season4: "winter", warmCool: "cool", lightness: "dark", chroma: "vivid", tone12: "winter_deep", tone12LowConfidence: false },
  { id: "cool_dark_muted", no: 16, nameKo: "겨울 딥뮤트", season4: "winter", warmCool: "cool", lightness: "dark", chroma: "muted", tone12: "winter_deep", tone12LowConfidence: false },
] as const;

/** 16톤 경계값. 단위는 특징값과 같다 (02 특징값 정의). */
export interface ToneThresholds {
  /** warmCool(피부 h°) 이 값 이상이면 웜 */
  warmCoolSplit: number;
  /** lightness(피부 L*) 경계 3개, 오름차순: 어두움 | 중하 | 중상 | 밝음 */
  lightnessCuts: readonly [number, number, number];
  /** chroma(피부 C*) 이 값 이상이면 선명 */
  chromaSplit: number;
  /**
   * 2순위 비교용 축별 척도 (M3-2-Q6). 경계까지 거리를 이 값으로 나눠 단위가 다른 축(°, L*, C*)을 비교한다.
   * 모두 0보다 커야 한다. 대비(contrast)는 판정에 쓰지 않으므로 없다 (회의-대비).
   */
  secondScale: { readonly warmCool: number; readonly lightness: number; readonly chroma: number };
}

/** 아직 정하지 않은 상태를 포함한 경계값 */
export type ToneThresholdsDraft = { readonly [K in keyof ToneThresholds]: ToneThresholds[K] | null };

/** 경계값·2순위 척도 자리표시자. 실제 수치는 M3에서 샘플 사진으로 1차 설정하고 지인 피드백으로 튜닝 [미정]. 추정으로 채우지 않는다. */
export const TONE_THRESHOLDS: ToneThresholdsDraft = {
  warmCoolSplit: null,
  lightnessCuts: null,
  chromaSplit: null,
  secondScale: null,
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
  const sc = t.secondScale;
  if (![sc.warmCool, sc.lightness, sc.chroma].every((v) => Number.isFinite(v) && v > 0)) {
    throw new ToneConfigNotSetError("secondScale 은 모두 0보다 커야 해요");
  }
  return t;
}

export function getTone(id: string): ToneDef | undefined {
  return TONES_16.find((t) => t.id === id);
}

/** 16톤 → 12톤 (대응표). 1순위·2순위 모두 이 함수로 (M3-2-Q2: tone12_second 필드는 두지 않음) */
export function toTone12(tone16Id: string): Tone12Def {
  const t = getTone(tone16Id);
  if (!t) throw new Error(`알 수 없는 16톤 ID: ${tone16Id}`);
  const t12 = TONES_12.find((x) => x.id === t.tone12);
  if (!t12) throw new Error(`12톤 대응표 오류: ${t.tone12}`);
  return t12;
}
