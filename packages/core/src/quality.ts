// 품질 검사 판정 (02 품질 검사 규칙). 결정적. 측정값 숫자는 결과에 담지 않는다 (O-2).
import { QUALITY_CONFIG, RANGE_CHECK_IDS, RANGE_CHECK_MEASUREMENT, requireQualityConfig } from "./quality-config";
import type { QualityConfigDraft, Range, RangeCheckId, ResolvedBound } from "./quality-config";
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

/** 범위를 벗어난 쪽. 경계값과 같으면 통과. */
function outside(v: number, r: Range<ResolvedBound>): "low" | "high" | null {
  if (typeof r.min === "number" && v < r.min) return "low";
  if (typeof r.max === "number" && v > r.max) return "high";
  return null;
}

// 항목 id 와 low/high/unmeasured 를 이어 붙인 값은 항상 QUALITY_REASON_CODES 안에 있다 (테스트로 보장).
const code = (s: string) => s as QualityReasonCode;

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
      // 보정·필터 의심은 못 재면 건너뜀(진단을 막지 않음). 그 밖은 실패.
      checks.push(
        id === "filter_suspicion"
          ? { id, status: "skipped", reason: "skipped_unmeasured" }
          : { id, status: "fail", reason: code(`${id}_unmeasured`) },
      );
    } else {
      const failSide = "fail" in rule ? outside(v, rule.fail) : null;
      const warnSide = failSide ? null : outside(v, rule.warn);
      if (failSide) checks.push({ id, status: "fail", reason: code(`${id}_${failSide}`) });
      else if (warnSide) checks.push({ id, status: "warn", reason: code(`${id}_${warnSide}`) });
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
