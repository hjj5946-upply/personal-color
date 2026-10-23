// 조명 보정 (파이프라인 ③, 결정 로그 M3-D3·M3-2-Q4·Q5·Q7). 결정적. 숫자만 받는다 (O-5).
// 두 방식: "보정 안 함"(none) / "회색 세계 가정"(gray_world). 어느 쪽을 쓸지와 한도 숫자는 [미정] — M3-3.
// 보정은 감마가 걸린 sRGB 값이 아니라 **선형 색 공간**에서 채널별 배율을 곱한다 (02 "조명 보정").
import { linearToSrgb, srgbToLinear } from "./color";
import type { ColorSample } from "./sample";
import type { Rgb } from "./types";

export type LightingMode = "none" | "gray_world";

/**
 * 회색 세계 가정의 기준 통계. 브라우저가 **색 편향 측정과 같은 영역**(얼굴·목 밖)에서 잰 숫자만 담는다.
 * 좌표·이미지는 담지 않는다 (O-1·O-2).
 */
export interface LightingReference {
  /** 기준 영역 픽셀의 채널별 **선형값 평균** (0~1) */
  linearMean: Rgb;
  /** 기준 영역에서 쓴 픽셀 수 ÷ 전체 이미지 픽셀 수 (0~1) */
  areaRatio: number;
}

export interface LightingConfigDraft {
  /** 일반 모드에서 쓸 방식. null = 미정 (M3-3에서 결정, M3-D3) */
  mode: LightingMode | null;
  grayWorld: {
    /** 기준 영역이 이 비율보다 작으면 "보정 안 함"으로 대체 (M3-2-Q4). null = 미정 */
    minAreaRatio: number | null;
    /**
     * 채널 배율 한도. 배율이 이 값보다 크거나 1/이 값보다 작으면 자르지 않고 "보정 안 함"으로 대체 (M3-2-Q7).
     * "off" = 한도 사용 안 함. null = 미정
     */
    maxGain: number | "off" | null;
  };
}
export type LightingConfig =
  | { mode: "none" }
  | { mode: "gray_world"; grayWorld: { minAreaRatio: number; maxGain: number | "off" } };

/** 실제 설정. 숫자는 [미정] — 추정으로 채우지 않는다. 테스트에서만 임시 값을 넣는다. */
export const LIGHTING_CONFIG: LightingConfigDraft = {
  mode: null,
  grayWorld: { minAreaRatio: null, maxGain: null },
};

export class LightingConfigNotSetError extends Error {
  override name = "LightingConfigNotSetError";
}

/** 보정 전에 부른다. 고른 방식에 필요한 값이 비어 있으면 "미설정" 오류. "보정 안 함"이면 회색 세계 값은 필요 없다. */
export function requireLightingConfig(draft: LightingConfigDraft = LIGHTING_CONFIG): LightingConfig {
  if (draft.mode === null) throw new LightingConfigNotSetError("조명 보정 방식 미설정: mode. M3-3에서 정한다.");
  if (draft.mode === "none") return { mode: "none" };
  const { minAreaRatio, maxGain } = draft.grayWorld;
  const missing = [minAreaRatio === null && "grayWorld.minAreaRatio", maxGain === null && "grayWorld.maxGain"].filter(Boolean);
  if (missing.length) throw new LightingConfigNotSetError(`조명 보정 미설정: ${missing.join(", ")}. M3-3에서 정한다.`);
  if (typeof maxGain === "number" && !(maxGain >= 1)) throw new LightingConfigNotSetError("maxGain 은 1 이상이어야 해요");
  return { mode: "gray_world", grayWorld: { minAreaRatio: minAreaRatio as number, maxGain: maxGain as number | "off" } };
}

/**
 * 회색 세계 가정의 채널 배율: 기준 영역의 평균이 무채색(세 채널 평균값)이 되도록 한다.
 * 배율 = (R̄+Ḡ+B̄)/3 ÷ 채널 평균 (선형값). 전체 밝기는 대략 유지된다. 채널 평균이 0이면 계산 불가(undefined).
 */
export function grayWorldGains(ref: LightingReference): Rgb | undefined {
  const { r, g, b } = ref.linearMean;
  if (!(r > 0 && g > 0 && b > 0)) return undefined;
  const gray = (r + g + b) / 3;
  return { r: gray / r, g: gray / g, b: gray / b };
}

/** 색 하나에 선형 배율을 곱한다 (sRGB → 선형 → ×배율 → sRGB). 1을 넘는 값은 1로 자른다. */
export function applyGains(c: Rgb, gains: Rgb): Rgb {
  return {
    r: linearToSrgb(srgbToLinear(c.r) * gains.r),
    g: linearToSrgb(srgbToLinear(c.g) * gains.g),
    b: linearToSrgb(srgbToLinear(c.b) * gains.b),
  };
}

/** 샘플의 모든 영역 색에 배율을 곱한다 */
export function correctSample(sample: ColorSample, gains: Rgb): ColorSample {
  const out: ColorSample = { skin: sample.skin.map((c) => applyGains(c, gains)) };
  if (sample.hair) out.hair = sample.hair.map((c) => applyGains(c, gains));
  if (sample.iris) out.iris = sample.iris.map((c) => applyGains(c, gains));
  return out;
}

export interface LightingResult {
  /** 보정이 끝난 샘플 (특징값 계산 ④ 의 입력) */
  sample: ColorSample;
  /** 실제로 적용한 방식 */
  applied: LightingMode;
  /** 회색 세계 가정을 고르고도 "보정 안 함"으로 대체됐으면 true → lighting_fallback (M3-2-Q5) */
  fallback: boolean;
  /** 대체 이유 (개발용 화면·테스트용. ColorProfile 에는 넣지 않는다) */
  fallbackReason?: "no_reference" | "small_area" | "gain_limit";
}

const isValidRef = (ref: LightingReference) =>
  [ref.linearMean.r, ref.linearMean.g, ref.linearMean.b, ref.areaRatio].every((v) => Number.isFinite(v) && v >= 0 && v <= 1);

/**
 * 조명 보정 ③. 설정이 "보정 안 함"이면 그대로 돌려준다(대체가 아님).
 * "회색 세계 가정"인데 ① 기준 통계가 없거나 ② 기준 영역이 작거나 ③ 배율이 한도를 넘으면
 * **자르지 않고** "보정 안 함"으로 대체하고 fallback=true.
 */
export function applyLighting(
  sample: ColorSample,
  ref: LightingReference | undefined,
  draft: LightingConfigDraft = LIGHTING_CONFIG,
): LightingResult {
  const config = requireLightingConfig(draft);
  if (config.mode === "none") return { sample, applied: "none", fallback: false };
  const fallback = (fallbackReason: LightingResult["fallbackReason"]): LightingResult => ({
    sample,
    applied: "none",
    fallback: true,
    fallbackReason,
  });
  if (!ref || !isValidRef(ref)) return fallback("no_reference");
  if (ref.areaRatio < config.grayWorld.minAreaRatio) return fallback("small_area");
  const gains = grayWorldGains(ref);
  if (!gains) return fallback("no_reference");
  const max = config.grayWorld.maxGain;
  if (max !== "off" && [gains.r, gains.g, gains.b].some((k) => k > max || k < 1 / max)) return fallback("gain_limit");
  return { sample: correctSample(sample, gains), applied: "gray_world", fallback: false };
}
