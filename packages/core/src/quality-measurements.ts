// 품질 검사 입력: 브라우저가 이미지에서 계산해 온 측정값 숫자 (02 품질 검사 규칙).
// 측정값마다 숫자 하나. 단위·측정 방법은 M3에서 샘플로 정한다. 측정하지 못한 값은 빼고 보낸다.
// O-1·O-2: 사진·좌표는 받지 않는다. 얼굴에서 나온 측정값은 판정에만 쓰고 결과·저장소·로그에 남기지 않는다.

export interface QualityMeasurements {
  /** 얼굴 수 (0 이상 정수) */
  faceCount?: number;
  faceSize?: number;
  faceAngle?: number;
  brightness?: number;
  colorCast?: number;
  sharpness?: number;
  filterSuspicion?: number;
}

export const MEASUREMENT_KEYS = [
  "faceCount",
  "faceSize",
  "faceAngle",
  "brightness",
  "colorCast",
  "sharpness",
  "filterSuspicion",
] as const satisfies readonly (keyof QualityMeasurements)[];

export type MeasurementValidation =
  | { ok: true; measurements: QualityMeasurements }
  | { ok: false; errors: string[] };

const ALLOWED: ReadonlySet<string> = new Set(MEASUREMENT_KEYS);
/** 들어오면 특히 위험한 필드 이름. 차단 자체는 허용 목록이 한다. */
const FORBIDDEN_HINT = /landmark|image|photo|pixel|coord|point|mesh|bbox|box|canvas|blob|url|base64|embedding|descriptor/i;

/**
 * 외부에서 들어온 값을 검사하고, 허용된 필드만 담은 새 객체를 돌려준다.
 * O-2: 오류 메시지에 측정값 숫자를 넣지 않는다(로그에 남지 않게).
 */
export function validateQualityMeasurements(input: unknown): MeasurementValidation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: ["measurements: 객체여야 해요"] };
  }
  const src = input as Record<string, unknown>;
  const errors: string[] = [];
  const out: QualityMeasurements = {};

  for (const k of Object.keys(src)) {
    if (ALLOWED.has(k)) continue;
    errors.push(
      FORBIDDEN_HINT.test(k)
        ? `${k}: 금지 필드예요 (사진·좌표·얼굴 데이터는 받지 않아요, O-1·O-2)`
        : `${k}: 허용되지 않은 필드예요`,
    );
  }
  for (const k of MEASUREMENT_KEYS) {
    const v = src[k];
    if (v === undefined) continue; // 측정 못 함
    if (typeof v !== "number" || !Number.isFinite(v)) {
      errors.push(`${k}: 숫자여야 해요`);
      continue;
    }
    if (k === "faceCount" && !(Number.isInteger(v) && v >= 0)) {
      errors.push(`${k}: 0 이상 정수여야 해요`);
      continue;
    }
    out[k] = v;
  }
  return errors.length ? { ok: false, errors } : { ok: true, measurements: out };
}
