// 품질 검사 판정 (02 품질 검사 규칙). 결정적. 측정값 숫자는 결과에 담지 않는다 (O-2).
import { QUALITY_CONFIG, RANGE_CHECK_IDS, RANGE_CHECK_MEASUREMENT, requireQualityConfig } from "./quality-config";
import type { Ceiling, QualityConfigDraft, Range, RangeCheckId, ResolvedBound } from "./quality-config";
import type { QualityMeasurements } from "./quality-measurements";
import { CONFIG_VERSION } from "./tone-config";

export type QualityStatus = "pass" | "warn" | "fail";
export type QualityCheckStatus = QualityStatus | "skipped";
export type QualityCheckId = "face_count" | RangeCheckId;

/** 품질 이유 코드 [확정]. DB에 저장되는 약속이므로 바꾸지 않는다 (목록: docs/spec/02 "품질 이유 코드"). */
export const QUALITY_REASON_CODES = [
  "face_not_found",
  "face_multiple",
  "face_count_unmeasured",
  "face_size_low",
  "face_size_high",
  "face_size_unmeasured",
  "face_angle_low",
  "face_angle_high",
  "face_angle_unmeasured",
  "brightness_low",
  "brightness_high",
  "brightness_unmeasured",
  "color_cast_low",
  "color_cast_high",
  "color_cast_unmeasured",
  "sharpness_low",
  "sharpness_high",
  "sharpness_unmeasured",
  "filter_suspicion_low",
  "filter_suspicion_high",
  "skipped_no_face",
  "skipped_unmeasured",
] as const;
export type QualityReasonCode = (typeof QUALITY_REASON_CODES)[number];

export interface QualityCheckResult {
  id: QualityCheckId;
  status: QualityCheckStatus;
  /** 통과면 없음 */
  reason?: QualityReasonCode;
}

export interface QualityResult {
  /** 실패 하나라도 → fail(진행 차단) / 실패 없이 경고 → warn(진행) / 그 외 pass */
  status: QualityStatus;
  checks: QualityCheckResult[];
  /** ColorProfile.qualityFlags 에 넣는 값: 경고 이유 코드만 */
  qualityFlags: QualityReasonCode[];
  /** 보정·필터 의심이 경고면 true (신뢰도 하향, 계산식은 M3) */
  lowersConfidence: boolean;
  configVersion: string;
}

/** 범위를 벗어난 쪽. 경계값과 같으면 통과. 상한만 있는 기준은 "high" 만 나온다. */
function outside(v: number, r: Range<ResolvedBound> | Ceiling<ResolvedBound>): "low" | "high" | null {
  if ("min" in r && typeof r.min === "number" && v < r.min) return "low";
  if (typeof r.max === "number" && v > r.max) return "high";
  return null;
}

/**
 * 항목 → 이유 코드. 밝기는 두 숫자가 각각 brightness_low(어두운 쪽)·brightness_high(밝은 쪽)에 연결된다
 * (결정 로그 M3-1b-Q2). 상한만 있는 항목은 low 가 나오지 않으므로 low 를 두지 않는다.
 */
const REASONS: Readonly<
  Record<RangeCheckId, { low?: QualityReasonCode; high: QualityReasonCode; unmeasured?: QualityReasonCode }>
> = {
  face_size: { low: "face_size_low", high: "face_size_high", unmeasured: "face_size_unmeasured" },
  face_angle: { low: "face_angle_low", high: "face_angle_high", unmeasured: "face_angle_unmeasured" },
  brightness_dark: { high: "brightness_low", unmeasured: "brightness_unmeasured" },
  brightness_bright: { high: "brightness_high", unmeasured: "brightness_unmeasured" },
  color_cast: { low: "color_cast_low", high: "color_cast_high", unmeasured: "color_cast_unmeasured" },
  sharpness: { low: "sharpness_low", high: "sharpness_high", unmeasured: "sharpness_unmeasured" },
  // 경고만 있는 항목: 못 재면 항상 건너뜀이라 unmeasured 코드가 없다
  filter_suspicion: { low: "filter_suspicion_low", high: "filter_suspicion_high" },
};

const reasonFor = (id: RangeCheckId, side: "low" | "high"): QualityReasonCode =>
  (side === "low" ? REASONS[id].low : undefined) ?? REASONS[id].high;

/**
 * 측정값을 품질 기준으로 판정한다. 기준이 미정이면 QualityConfigNotSetError.
 * 측정값은 validateQualityMeasurements 를 통과한 값을 넣는다.
 */
export function evaluateQuality(m: QualityMeasurements, draft: QualityConfigDraft = QUALITY_CONFIG): QualityResult {
  const config = requireQualityConfig(draft);
  const checks: QualityCheckResult[] = [];

  // 얼굴 수: 정확히 1명 (고정 규칙)
  if (m.faceCount === undefined) checks.push({ id: "face_count", status: "fail", reason: "face_count_unmeasured" });
  else if (m.faceCount === 0) checks.push({ id: "face_count", status: "fail", reason: "face_not_found" });
  else if (m.faceCount > 1) checks.push({ id: "face_count", status: "fail", reason: "face_multiple" });
  else checks.push({ id: "face_count", status: "pass" });
  const faceOk = checks[0]?.status === "pass";

  for (const id of RANGE_CHECK_IDS) {
    const rule = config[id];
    const v = m[RANGE_CHECK_MEASUREMENT[id]];
    if (rule.dependsOnFace && !faceOk) {
      checks.push({ id, status: "skipped", reason: "skipped_no_face" });
    } else if (v === undefined) {
      // 못 재면 항목별 설정대로 실패 또는 건너뜀 (경고만 있는 항목은 항상 건너뜀, M3-1b-Q3)
      const onUnmeasured = "onUnmeasured" in rule ? rule.onUnmeasured : "skip";
      const unmeasured = REASONS[id].unmeasured;
      checks.push(
        onUnmeasured === "fail" && unmeasured
          ? { id, status: "fail", reason: unmeasured }
          : { id, status: "skipped", reason: "skipped_unmeasured" },
      );
    } else {
      const failSide = "fail" in rule ? outside(v, rule.fail) : null;
      const warnSide = failSide ? null : outside(v, rule.warn);
      if (failSide) checks.push({ id, status: "fail", reason: reasonFor(id, failSide) });
      else if (warnSide) checks.push({ id, status: "warn", reason: reasonFor(id, warnSide) });
      else checks.push({ id, status: "pass" });
    }
  }

  const status: QualityStatus = checks.some((c) => c.status === "fail")
    ? "fail"
    : checks.some((c) => c.status === "warn")
      ? "warn"
      : "pass";
  const qualityFlags = checks.flatMap((c) => (c.status === "warn" && c.reason ? [c.reason] : []));
  const lowersConfidence = checks.some((c) => c.id === "filter_suspicion" && c.status === "warn");
  return { status, checks, qualityFlags, lowersConfidence, configVersion: CONFIG_VERSION };
}
