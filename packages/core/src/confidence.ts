// 신뢰도 계산 구조 (02 "신뢰도", 결정 로그 M3-D4·M3-2-Q8). 가중치·척도는 [미정] — M3-3. 결정적.
// 다섯 요소를 각각 0~1 점수(클수록 믿을 만함)로 바꾼 뒤 가중 평균한다. 결과도 0~1.
// 대비와 "12톤 확신 낮음"은 넣지 않는다. lighting_fallback 은 품질 플래그 수(①)로 신뢰도를 낮춘다.
import { deltaE2000 } from "./color";
import { representativeLab } from "./features";
import type { ColorSample } from "./sample";
import type { CalibrationMode, InputType, Lab } from "./types";

export interface ConfidenceInputs {
  /** ① 품질 플래그 수 (ColorProfile.qualityFlags 의 길이. lighting_fallback·보정 의심 포함) */
  qualityFlagCount: number;
  /** ② 정밀 모드면 가산 */
  calibrationMode: CalibrationMode;
  /** ③ 촬영 > 업로드 */
  inputType: InputType;
  /** ④ 1·2순위 차이: judgeTone 의 축별 거리(÷척도) 중 가장 작은 값. 0이면 경계 위 */
  margin: number;
  /** ⑤ 영역 간 일관성: 피부 영역끼리의 최대 ΔE2000 (skinSpread). 피부 영역이 1개면 null (확인할 수 없음) */
  skinSpread: number | null;
}

export type ConfidenceComponent = "quality" | "calibration" | "inputType" | "margin" | "consistency";
export const CONFIDENCE_COMPONENTS: readonly ConfidenceComponent[] = ["quality", "calibration", "inputType", "margin", "consistency"];

export interface ConfidenceConfigDraft {
  /** 요소별 가중치 (0 이상, 합 > 0). null = 미정 */
  weights: Readonly<Record<ConfidenceComponent, number | null>>;
  /** ⑤ 의 척도: 피부 영역 차이가 이 ΔE2000 이면 일관성 점수 0.5. null = 미정 */
  consistencyScale: number | null;
}

/** 실제 설정. 숫자는 [미정] (M3-3). 추정으로 채우지 않는다. */
export const CONFIDENCE_CONFIG: ConfidenceConfigDraft = {
  weights: { quality: null, calibration: null, inputType: null, margin: null, consistency: null },
  consistencyScale: null,
};

export class ConfidenceConfigNotSetError extends Error {
  override name = "ConfidenceConfigNotSetError";
}

export interface ConfidenceResult {
  /** 0~1 */
  confidence: number;
  /** 요소별 점수 0~1 (개발용 화면·테스트용. ColorProfile 에는 넣지 않는다) */
  components: Readonly<Record<ConfidenceComponent, number>>;
}

/**
 * 피부 영역끼리의 최대 ΔE2000 (⑤ 영역 간 일관성의 입력). 이마·양 볼 중 하나가 가림·얼굴 경계에 걸리면 커진다
 * (13 [M3-2 숙제] 피부 영역 문제를 잡는 도구). 영역이 1개면 null.
 */
export function skinSpread(sample: ColorSample): number | null {
  if (sample.skin.length < 2) return null;
  const labs = sample.skin.map((c) => representativeLab([c]));
  let max = 0;
  for (let i = 0; i < labs.length; i++)
    for (let j = i + 1; j < labs.length; j++) max = Math.max(max, deltaE2000(labs[i] as Lab, labs[j] as Lab));
  return max;
}

/**
 * 요소별 점수 [임시 정의, M3-3 재검토]:
 * ① 1 / (1 + 플래그 수) ② 정밀 1, 일반 0 ③ 촬영 1, 업로드 0 ④ margin / (1 + margin)
 * ⑤ 1 / (1 + skinSpread / consistencyScale), 확인할 수 없으면(영역 1개) 0
 */
export function computeConfidence(input: ConfidenceInputs, draft: ConfidenceConfigDraft = CONFIDENCE_CONFIG): ConfidenceResult {
  const missing = [
    ...CONFIDENCE_COMPONENTS.filter((k) => draft.weights[k] === null).map((k) => `weights.${k}`),
    ...(draft.consistencyScale === null ? ["consistencyScale"] : []),
  ];
  if (missing.length) throw new ConfidenceConfigNotSetError(`신뢰도 설정 미설정: ${missing.join(", ")}. M3-3에서 정한다.`);
  const weights = draft.weights as Record<ConfidenceComponent, number>;
  const scale = draft.consistencyScale as number;
  const ws = CONFIDENCE_COMPONENTS.map((k) => weights[k]);
  if (!ws.every((w) => Number.isFinite(w) && w >= 0) || ws.reduce((a, b) => a + b, 0) <= 0 || !(scale > 0)) {
    throw new ConfidenceConfigNotSetError("신뢰도 설정 오류: 가중치는 0 이상이고 합이 0보다 커야 하며, 척도는 0보다 커야 해요");
  }
  if (!(input.qualityFlagCount >= 0) || !(input.margin >= 0) || (input.skinSpread !== null && !(input.skinSpread >= 0))) {
    throw new Error("신뢰도 입력이 잘못됐어요");
  }

  const components: Record<ConfidenceComponent, number> = {
    quality: 1 / (1 + input.qualityFlagCount),
    calibration: input.calibrationMode === "precise" ? 1 : 0,
    inputType: input.inputType === "camera" ? 1 : 0,
    margin: Number.isFinite(input.margin) ? input.margin / (1 + input.margin) : 1,
    consistency: input.skinSpread === null ? 0 : 1 / (1 + input.skinSpread / scale),
  };
  const total = ws.reduce((a, b) => a + b, 0);
  const confidence = CONFIDENCE_COMPONENTS.reduce((s, k) => s + weights[k] * components[k], 0) / total;
  return { confidence: Math.min(1, Math.max(0, confidence)), components };
}
