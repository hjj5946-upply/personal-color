// 사진 정규화 (04 색 정확도 규칙): EXIF 회전 적용, sRGB 로 변환, 필요하면 축소.
// 만든 비트맵·캔버스는 Disposables 에 등록해 분석이 끝나거나 취소되면 바로 해제한다.
import type { Disposables } from "./disposables";
import { fitWithin, type PixelBuffer } from "./pixels";

export interface NormalizedImage {
  /** MediaPipe 에 넘길 캔버스 (픽셀과 좌표가 일치) */
  canvas: HTMLCanvasElement;
  pixels: PixelBuffer;
  /** 원본 크기 (EXIF 회전 후) */
  original: { width: number; height: number };
}

export class ImageDecodeError extends Error {
  override name = "ImageDecodeError";
}

/**
 * @param maxLongSide 긴 변 상한(px). 없으면 축소하지 않음. 실제 상한은 M3-1b 실측 후 결정 (M3-D6).
 */
export async function loadNormalizedImage(
  file: Blob,
  bag: Disposables,
  maxLongSide?: number,
): Promise<NormalizedImage> {
  let bitmap: ImageBitmap;
  try {
    // imageOrientation "from-image": EXIF 방향대로 회전. colorSpaceConversion "default": 내장 색 프로필을 반영
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image", colorSpaceConversion: "default" });
  } catch {
    // 예: PC Chrome·Edge 의 HEIC
    throw new ImageDecodeError("image_decode_failed");
  }
  bag.add(() => bitmap.close());

  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxLongSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  bag.add(() => {
    canvas.width = 0;
    canvas.height = 0;
  });
  const ctx = canvas.getContext("2d", { colorSpace: "srgb", willReadFrequently: true });
  if (!ctx) throw new ImageDecodeError("canvas_unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height, { colorSpace: "srgb" });

  return {
    canvas,
    pixels: { data: imageData.data, width, height },
    original: { width: bitmap.width, height: bitmap.height },
  };
}
