// 사진 한 장 → ColorSample + 얼굴 측정값 (M3-1a). 사진은 브라우저 안에서만 다룬다 (O-1).
// 결과에는 랜드마크 좌표를 넣지 않는다 (O-2). 끝나면(성공·실패·취소 모두) 사진 관련 자원을 해제한다.
import {
  validateQualityMeasurements,
  type ColorSample,
  type QualityMeasurements,
} from "@personal-color/core";
import { Disposables } from "./disposables";
import { extractFace } from "./face-regions";
import { loadNormalizedImage } from "./image";
import { loadFaceLandmarker } from "./landmarker";

export interface ExtractionResult {
  /** 얼굴이 정확히 1명이고 피부를 뽑았을 때만 값이 있다 */
  sample: ColorSample | null;
  /** M3-1a: faceCount·faceSize·faceAngle. 밝기 등은 M3-1b */
  measurements: QualityMeasurements;
  /** 개발용 확인 화면 표시용 (ms) */
  timings: { modelLoad: number; decode: number; detect: number; extract: number };
  /** 분석에 쓴 크기 */
  size: { width: number; height: number; originalWidth: number; originalHeight: number };
}

export class ExtractionCancelled extends Error {
  override name = "ExtractionCancelled";
}

export async function extractFromPhoto(
  file: Blob,
  opts: { maxLongSide?: number; signal?: AbortSignal } = {},
): Promise<ExtractionResult> {
  const bag = new Disposables();
  const checkCancel = () => {
    if (opts.signal?.aborted) throw new ExtractionCancelled("cancelled");
  };
  opts.signal?.addEventListener("abort", () => bag.dispose(), { once: true });
  try {
    const t0 = performance.now();
    const landmarker = await loadFaceLandmarker();
    const t1 = performance.now();
    checkCancel();
    const img = await loadNormalizedImage(file, bag, opts.maxLongSide);
    const t2 = performance.now();
    checkCancel();
    const result = landmarker.detect(img.canvas);
    const t3 = performance.now();

    const faceCount = result.faceLandmarks.length;
    const measurements: QualityMeasurements = { faceCount };
    let sample: ColorSample | null = null;
    if (faceCount === 1) {
      const face = extractFace(img.pixels, result.faceLandmarks[0] ?? [], result.facialTransformationMatrixes?.[0]);
      sample = face.sample;
      measurements.faceSize = face.faceSize;
      if (face.faceAngle !== undefined) measurements.faceAngle = face.faceAngle;
    }
    const t4 = performance.now();

    const checked = validateQualityMeasurements(measurements);
    if (!checked.ok) throw new Error("invalid_measurements");
    return {
      sample,
      measurements: checked.measurements,
      timings: { modelLoad: t1 - t0, decode: t2 - t1, detect: t3 - t2, extract: t4 - t3 },
      size: {
        width: img.pixels.width,
        height: img.pixels.height,
        originalWidth: img.original.width,
        originalHeight: img.original.height,
      },
    };
  } finally {
    // 결과(색 값·숫자)만 남기고 사진·캔버스는 즉시 해제
    bag.dispose();
  }
}
