// ColorProfile 생성 (파이프라인 ③~⑥, 02 "ColorProfile"). 결정적: 시각(createdAt)은 밖에서 받는다.
// O-2: 좌표·얼굴 측정값·기준 통계·판정 중간값(축별 거리, 신뢰도 요소)은 넣지 않는다.
import { CONFIDENCE_CONFIG, computeConfidence, skinSpread } from "./confidence";
import type { ConfidenceConfigDraft } from "./confidence";
import { computeFeatures } from "./features";
import { LIGHTING_CONFIG, applyLighting } from "./lighting";
import type { LightingConfigDraft, LightingReference } from "./lighting";
import type { QualityReasonCode, QualityResult } from "./quality";
import { validateColorSample } from "./sample";
import { judgeTone } from "./tone";
import { CONFIG_VERSION, TONE_THRESHOLDS, getTone, toTone12 } from "./tone-config";
import type { ToneThresholdsDraft } from "./tone-config";
import type { CalibrationMode, ColorProfile, InputType } from "./types";

/** 판정에 쓰는 설정 묶음. 실제 값은 전부 [미정] — 비어 있으면 각 단계에서 "미설정" 오류 */
export interface ProfileConfigs {
  tone: ToneThresholdsDraft;
  lighting: LightingConfigDraft;
  confidence: ConfidenceConfigDraft;
}
export const PROFILE_CONFIGS: ProfileConfigs = { tone: TONE_THRESHOLDS, lighting: LIGHTING_CONFIG, confidence: CONFIDENCE_CONFIG };

export interface ProfileInput {
  /** 브라우저가 뽑은 영역 색 (조명 보정 전). validateColorSample 로 다시 검사한다 */
  sample: unknown;
  /** 회색 세계 가정의 기준 통계 (못 재면 없음) */
  lightingReference?: LightingReference | undefined;
  /** evaluateQuality 결과 (보정 전 이미지의 측정값으로 판정한 것) */
  quality: QualityResult;
  inputType: InputType;
  calibrationMode: CalibrationMode;
  /** ISO 8601, 시간대 포함 (예: 2026-10-23T16:00:00+09:00). core 는 시계를 쓰지 않는다 */
  createdAt: string;
}

export type ProfileOutcome = { ok: true; profile: ColorProfile } | { ok: false; reason: "quality_failed" };

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * 품질 결과 → 조명 보정(③) → 특징값(④) → 16톤 1·2순위(⑤) → 신뢰도 → ColorProfile(⑥).
 * 품질 결과가 "실패"면 만들지 않는다. qualityFlags = 품질 경고 코드 + (대체됐으면) lighting_fallback.
 */
export function buildColorProfile(input: ProfileInput, configs: ProfileConfigs = PROFILE_CONFIGS): ProfileOutcome {
  if (input.quality.status === "fail") return { ok: false, reason: "quality_failed" };
  if (input.calibrationMode === "precise") throw new Error("정밀 모드(흰 기준 보정)는 M5에서 만든다");
  if (!ISO_8601.test(input.createdAt)) throw new Error("createdAt 은 시간대가 있는 ISO 8601 이어야 해요");
  const checked = validateColorSample(input.sample);
  if (!checked.ok) throw new Error(`ColorSample 오류: ${checked.errors.join("; ")}`);

  const lighting = applyLighting(checked.sample, input.lightingReference, configs.lighting);
  const { axes } = computeFeatures(lighting.sample);
  const judged = judgeTone(axes, configs.tone);
  const qualityFlags: QualityReasonCode[] = [...input.quality.qualityFlags];
  if (lighting.fallback) qualityFlags.push("lighting_fallback");
  const { confidence } = computeConfidence(
    {
      qualityFlagCount: qualityFlags.length,
      calibrationMode: input.calibrationMode,
      inputType: input.inputType,
      margin: judged.margins[judged.secondAxis],
      skinSpread: skinSpread(lighting.sample),
    },
    configs.confidence,
  );

  const tone = getTone(judged.tone16);
  if (!tone) throw new Error("16톤 표에 없는 칸이에요"); // 일어나면 안 됨
  return {
    ok: true,
    profile: {
      tone16: judged.tone16,
      tone16_second: judged.tone16Second,
      season4: tone.season4,
      tone12: toTone12(judged.tone16).id,
      axes,
      confidence,
      inputType: input.inputType,
      qualityFlags,
      calibrationMode: input.calibrationMode,
      configVersion: CONFIG_VERSION,
      createdAt: input.createdAt,
    },
  };
}
