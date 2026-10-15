// 품질 검사 기준 (02 품질 검사 규칙). O-6: 기준값은 설정으로 분리, 결과에 configVersion.
// 실제 수치는 [미정] — M3에서 샘플 사진으로 정한다. 추정으로 채우지 않는다. 테스트에서만 임시 수치를 넣는다.
import type { QualityMeasurements } from "./quality-measurements";

/** 경계값: 숫자, "off"(사용 안 함), null(미정) */
export type Bound = number | "off" | null;
export type ResolvedBound = number | "off";

/** 하한·상한. 값이 경계값과 같으면 통과. */
export interface Range<B> {
  min: B;
  max: B;
}
/** 상한만 (비율처럼 "너무 많음"만 문제인 값). 값이 경계값과 같으면 통과. */
export interface Ceiling<B> {
  max: B;
}
/** 측정값이 없을 때: 실패(진행 차단) 또는 건너뜀 (결정 로그 M3-1b-Q3) */
export type OnUnmeasured = "fail" | "skip";

/** 실패 기준 + 선택적 경고 기준 (경고는 실패보다 안쪽) */
export interface Rule<B> {
  /** true 면 얼굴 수가 실패일 때 이 항목은 건너뜀 */
  dependsOnFace: boolean;
  onUnmeasured: OnUnmeasured;
  fail: Range<B>;
  warn: Range<B>;
}
/** 상한만 있는 항목 (밝기 두 숫자, 결정 로그 M3-1b-Q2) */
export interface CeilingRule<B> {
  dependsOnFace: boolean;
  onUnmeasured: OnUnmeasured;
  fail: Ceiling<B>;
  warn: Ceiling<B>;
}
/** 경고만 있는 항목 (차단하지 않음). 못 재면 항상 건너뜀. */
export interface WarnOnlyRule<B> {
  dependsOnFace: boolean;
  warn: Range<B>;
}
export interface QualityRules<B> {
  face_size: Rule<B>;
  face_angle: Rule<B>;
  /** 밝기: 어두운 쪽으로 뭉개진 비율 → brightness_low */
  brightness_dark: CeilingRule<B>;
  /** 밝기: 밝은 쪽으로 날아간 비율 → brightness_high */
  brightness_bright: CeilingRule<B>;
  color_cast: Rule<B>;
  sharpness: Rule<B>;
  filter_suspicion: WarnOnlyRule<B>;
}
export type QualityConfigDraft = QualityRules<Bound>;
export type QualityConfig = QualityRules<ResolvedBound>;
export type RangeCheckId = keyof QualityRules<Bound>;

/** 판정 순서 (결과 순서가 항상 같도록 고정) */
export const RANGE_CHECK_IDS = [
  "face_size",
  "face_angle",
  "brightness_dark",
  "brightness_bright",
  "color_cast",
  "sharpness",
  "filter_suspicion",
] as const satisfies readonly RangeCheckId[];

/** 항목 → 측정값 이름 */
export const RANGE_CHECK_MEASUREMENT: Readonly<Record<RangeCheckId, Exclude<keyof QualityMeasurements, "faceCount">>> = {
  face_size: "faceSize",
  face_angle: "faceAngle",
  brightness_dark: "brightnessDark",
  brightness_bright: "brightnessBright",
  color_cast: "colorCast",
  sharpness: "sharpness",
  filter_suspicion: "filterSuspicion",
};

const OFF: Range<Bound> = { min: "off", max: "off" };
const UNSET: Range<Bound> = { min: null, max: null };

/**
 * 실제 기준. 02 기본 동작: 얼굴·밝기·선명도는 실패만(경고 꺼짐), 색 편향은 경고/실패 두 단계,
 * 보정·필터 의심은 경고만. 숫자는 전부 미정(null).
 * 얼굴 기반: 크기·각도·밝기·선명도(얼굴 상자 안), 색 편향(얼굴 밖을 재므로 얼굴 위치가 필요) — M3-1b-Q1·Q3.
 * 못 재면 건너뜀: 색 편향(기준 픽셀이 없는 셀카가 많음, M3-1b-Q3)·보정·필터 의심. 그 밖은 실패.
 */
export const QUALITY_CONFIG: QualityConfigDraft = {
  face_size: { dependsOnFace: true, onUnmeasured: "fail", fail: UNSET, warn: OFF },
  face_angle: { dependsOnFace: true, onUnmeasured: "fail", fail: UNSET, warn: OFF },
  brightness_dark: { dependsOnFace: true, onUnmeasured: "fail", fail: { max: null }, warn: { max: "off" } },
  brightness_bright: { dependsOnFace: true, onUnmeasured: "fail", fail: { max: null }, warn: { max: "off" } },
  color_cast: { dependsOnFace: true, onUnmeasured: "skip", fail: UNSET, warn: UNSET },
  sharpness: { dependsOnFace: true, onUnmeasured: "fail", fail: UNSET, warn: OFF },
  filter_suspicion: { dependsOnFace: false, warn: UNSET },
};

export class QualityConfigNotSetError extends Error {
  override name = "QualityConfigNotSetError";
}
export class QualityConfigInvalidError extends Error {
  override name = "QualityConfigInvalidError";
}

type AnyRule = Rule<Bound> | CeilingRule<Bound> | WarnOnlyRule<Bound>;
const rangesOf = (rule: AnyRule) =>
  ("fail" in rule ? [["fail", rule.fail], ["warn", rule.warn]] : [["warn", rule.warn]]) as [
    string,
    Partial<Range<Bound>>,
  ][];

/** 판정 전에 부른다. 미정(null)이 하나라도 있으면 "미설정" 오류, 앞뒤가 안 맞으면 "잘못된 기준" 오류. */
export function requireQualityConfig(draft: QualityConfigDraft = QUALITY_CONFIG): QualityConfig {
  const missing: string[] = [];
  const invalid: string[] = [];
  for (const id of RANGE_CHECK_IDS) {
    const rule: AnyRule = draft[id];
    for (const [kind, r] of rangesOf(rule)) {
      if (r.min === null) missing.push(`${id}.${kind}.min`);
      if (r.max === null) missing.push(`${id}.${kind}.max`);
      if (typeof r.min === "number" && typeof r.max === "number" && r.min > r.max) {
        invalid.push(`${id}.${kind}: min 이 max 보다 커요`);
      }
    }
    if ("fail" in rule) {
      const fail: Partial<Range<Bound>> = rule.fail;
      const warn: Partial<Range<Bound>> = rule.warn;
      if (typeof fail.min === "number" && typeof warn.min === "number" && warn.min < fail.min) {
        invalid.push(`${id}: 경고 하한은 실패 하한 이상이어야 해요`);
      }
      if (typeof fail.max === "number" && typeof warn.max === "number" && warn.max > fail.max) {
        invalid.push(`${id}: 경고 상한은 실패 상한 이하여야 해요`);
      }
    }
  }
  if (missing.length) throw new QualityConfigNotSetError(`품질 기준 미설정: ${missing.join(", ")}. M3에서 샘플로 정한다.`);
  if (invalid.length) throw new QualityConfigInvalidError(`품질 기준 오류: ${invalid.join("; ")}`);
  return draft as QualityConfig;
}
