// 픽셀 버퍼에서 영역의 대표색을 뽑는 순수 함수 (파이프라인 ② 영역 샘플링). 브라우저 API 를 쓰지 않는다.
import { median, type Rgb } from "@personal-color/core";

/** ImageData 와 같은 모양 (RGBA 순서, 한 픽셀 4바이트, sRGB) */
export interface PixelBuffer {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * 원(또는 고리) 안의 픽셀을 채널별 중앙값으로 묶는다. 이미지 밖 픽셀은 제외하고, 픽셀이 너무 적으면 null.
 * 중심이 이미지 밖이면 null (가장자리 몇 픽셀만 잡혀 엉뚱한 색이 되는 것을 막는다).
 */
export function regionMedianRgb(
  buf: PixelBuffer,
  center: Point,
  radius: number,
  opts: { innerRadius?: number; minPixels?: number } = {},
): Rgb | null {
  const inner = opts.innerRadius ?? 0;
  const minPixels = opts.minPixels ?? 9;
  if (!(radius > 0) || !Number.isFinite(center.x) || !Number.isFinite(center.y)) return null;
  if (center.x < 0 || center.y < 0 || center.x > buf.width || center.y > buf.height) return null;

  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  const x0 = Math.max(0, Math.floor(center.x - radius));
  const x1 = Math.min(buf.width - 1, Math.ceil(center.x + radius));
  const y0 = Math.max(0, Math.floor(center.y - radius));
  const y1 = Math.min(buf.height - 1, Math.ceil(center.y + radius));
  const r2 = radius * radius;
  const i2 = inner * inner;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      // 픽셀 중심 기준 거리
      const dx = x + 0.5 - center.x;
      const dy = y + 0.5 - center.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2 || d2 < i2) continue;
      const i = (y * buf.width + x) * 4;
      r.push(buf.data[i] as number);
      g.push(buf.data[i + 1] as number);
      b.push(buf.data[i + 2] as number);
    }
  }
  if (r.length < minPixels) return null;
  return { r: median(r), g: median(g), b: median(b) };
}

/** 긴 변이 maxLongSide 를 넘으면 비율을 유지해 줄인 크기. 상한이 없으면 원래 크기 (축소 상한은 M3-1b 실측 후 결정, M3-D6). */
export function fitWithin(width: number, height: number, maxLongSide?: number): { width: number; height: number } {
  const long = Math.max(width, height);
  if (!maxLongSide || long <= maxLongSide) return { width, height };
  const s = maxLongSide / long;
  return { width: Math.max(1, Math.round(width * s)), height: Math.max(1, Math.round(height * s)) };
}
