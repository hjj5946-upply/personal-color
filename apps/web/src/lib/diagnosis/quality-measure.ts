// 품질 측정값 계산 (M3-1b): 밝기 두 비율·색 편향·선명도. 픽셀 버퍼만 받는 순수 함수 (브라우저 API 없음).
// 측정 방법은 [임시 정의, M3-3 재검토] — 02 "품질 측정 방법", 결정 로그 M3-1b-Q1~Q4.
// O-2: 얼굴 상자는 이 파일 안에서만 쓰고 결과에 넣지 않는다. 결과는 숫자 측정값뿐이며 판정에만 쓴다.
// 보정·필터 의심은 측정 방법이 정해지지 않아 재지 않는다 → 측정값에서 빠지고 판정은 "건너뜀".
import type { LightingReference, QualityMeasurements } from "@personal-color/core";
import type { PixelBuffer } from "./pixels";

/** 픽셀 단위 사각형. x1·y1 은 포함하지 않는다 (x0 ≤ x < x1). */
export interface PixelRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** 측정 방법의 세부 값 [임시, M3-3 재검토]. 품질 기준(통과/실패 경계)이 아니라 "무엇을 셀지"의 정의다. */
export const MEASURE = {
  /** 밝기: 세 채널 모두 이 값 이하면 "어두운 쪽으로 뭉개짐" (0~255) */
  darkLevel: 16,
  /** 밝기: 한 채널이라도 이 값 이상이면 "밝은 쪽으로 날아감" (0~255, 색 정보가 잘림) */
  brightLevel: 250,
  /** 색 편향 기준 픽셀: 밝기 L* 하한 */
  castMinL: 70,
  /** 색 편향 기준 픽셀: 채도 C* 상한 (무채색에 가까움) */
  castMaxChroma: 30,
  /** 색 편향 기준 픽셀: 한 채널이라도 이 값 이상이면 제외 (포화된 픽셀은 조명 색을 잃음) */
  castClipLevel: 250,
  /** 색 편향: 얼굴 상자를 좌우·위로 이만큼(얼굴 크기 비율) 넓혀서 뺀다 (머리카락·귀) */
  castExcludeSide: 0.25,
  /** 색 편향: 얼굴 상자 아래로 이만큼(얼굴 높이 비율) 더 뺀다 (목 피부가 노란 쪽으로 끌지 않게) */
  castExcludeBelow: 0.6,
  /** 색 편향: 기준 픽셀이 측정 영역 픽셀의 이 비율 미만이면 측정 불가 */
  castMinRatio: 0.01,
  /** 선명도: 얼굴 상자를 긴 변 이 크기(px)로 맞춘 뒤 잰다 (축소 상한과 무관하게) */
  sharpSize: 256,
} as const;

const clampRect = (r: PixelRect, buf: PixelBuffer): PixelRect | null => {
  const x0 = Math.max(0, Math.floor(r.x0));
  const y0 = Math.max(0, Math.floor(r.y0));
  const x1 = Math.min(buf.width, Math.ceil(r.x1));
  const y1 = Math.min(buf.height, Math.ceil(r.y1));
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null;
};

/**
 * 밝기 두 비율 (M3-1b-Q2). 피부 밝기 자체가 아니라 노출 문제를 센다:
 * - brightnessDark: 세 채널 모두 darkLevel 이하인 픽셀 비율 (검게 뭉개짐) → brightness_low
 * - brightnessBright: 한 채널이라도 brightLevel 이상인 픽셀 비율 (하얗게 날아감) → brightness_high
 * 피부색이 어두워도 뭉개지지 않았으면 brightnessDark 는 0 이다.
 */
export function measureBrightness(
  buf: PixelBuffer,
  face: PixelRect,
): Pick<QualityMeasurements, "brightnessDark" | "brightnessBright"> {
  const r = clampRect(face, buf);
  if (!r) return {};
  let dark = 0;
  let bright = 0;
  for (let y = r.y0; y < r.y1; y++) {
    for (let x = r.x0; x < r.x1; x++) {
      const i = (y * buf.width + x) * 4;
      const max = Math.max(buf.data[i] as number, buf.data[i + 1] as number, buf.data[i + 2] as number);
      if (max <= MEASURE.darkLevel) dark++;
      if (max >= MEASURE.brightLevel) bright++;
    }
  }
  const n = (r.x1 - r.x0) * (r.y1 - r.y0);
  return { brightnessDark: dark / n, brightnessBright: bright / n };
}

// sRGB(0~255) → 선형값 표 (core rgbToLab 과 같은 식)
const LINEAR = Float64Array.from({ length: 256 }, (_, c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
});
const labF = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);

/** 픽셀 하나의 L*·a*·b* (core rgbToLab 과 같은 값, 객체를 만들지 않는 빠른 판) */
export function pixelLab(r: number, g: number, b: number): [number, number, number] {
  const R = LINEAR[r] as number;
  const G = LINEAR[g] as number;
  const B = LINEAR[b] as number;
  const fx = labF((R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047);
  const fy = labF(R * 0.2126729 + G * 0.7151522 + B * 0.072175);
  const fz = labF((R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * 색 편향·조명 보정 기준 영역: 얼굴 상자를 좌우·위로 castExcludeSide, 아래로 castExcludeBelow 만큼 넓힌 영역을 **뺀** 나머지.
 * 두 측정이 같은 영역을 쓰도록 한 곳에서 정한다 (결정 로그 M3-2-Q4).
 */
function forEachOutsideFace(buf: PixelBuffer, face: PixelRect, visit: (r: number, g: number, b: number) => void): void {
  const w = face.x1 - face.x0;
  const h = face.y1 - face.y0;
  const ex = {
    x0: face.x0 - w * MEASURE.castExcludeSide,
    y0: face.y0 - h * MEASURE.castExcludeSide,
    x1: face.x1 + w * MEASURE.castExcludeSide,
    y1: face.y1 + h * MEASURE.castExcludeBelow,
  };
  for (let y = 0; y < buf.height; y++) {
    const rowInside = y + 0.5 >= ex.y0 && y + 0.5 < ex.y1;
    for (let x = 0; x < buf.width; x++) {
      if (rowInside && x + 0.5 >= ex.x0 && x + 0.5 < ex.x1) continue;
      const i = (y * buf.width + x) * 4;
      visit(buf.data[i] as number, buf.data[i + 1] as number, buf.data[i + 2] as number);
    }
  }
}

/**
 * 색 편향 (M3-1b-Q3): 얼굴(과 목) 밖에서 밝고 무채색에 가까운 픽셀의 b* 중앙값.
 * 음수 = 파란 조명 쪽, 양수 = 노란 조명 쪽. 초록·자홍 편향(형광등 등)은 잡지 못한다.
 * 기준 픽셀이 부족하면 undefined (측정 불가 → 판정에서 건너뜀).
 */
export function measureColorCast(buf: PixelBuffer, face: PixelRect): number | undefined {
  const bs: number[] = [];
  let area = 0;
  forEachOutsideFace(buf, face, (r, g, b) => {
    area++;
    if (Math.max(r, g, b) >= MEASURE.castClipLevel) return;
    const [L, A, B] = pixelLab(r, g, b);
    if (L < MEASURE.castMinL || Math.hypot(A, B) > MEASURE.castMaxChroma) return;
    bs.push(B);
  });
  if (area === 0 || bs.length < Math.max(1, area * MEASURE.castMinRatio)) return undefined;
  bs.sort((p, q) => p - q);
  const mid = bs.length >> 1;
  return bs.length % 2 ? (bs[mid] as number) : ((bs[mid - 1] as number) + (bs[mid] as number)) / 2;
}

/**
 * 조명 보정(회색 세계 가정)의 기준 통계 (M3-2-Q4): 색 편향과 **같은 영역**(얼굴·목 밖)에서,
 * 한 채널이라도 castClipLevel 이상인 픽셀(색 정보가 잘림)을 뺀 **모든 픽셀**의 채널별 선형값 평균과
 * 쓴 픽셀 수 ÷ 전체 픽셀 수. 쓸 픽셀이 없으면 undefined (core 에서 "보정 안 함"으로 대체).
 * 결과는 숫자 4개뿐이다 (좌표·이미지 없음, O-2). 영역이 충분히 큰지는 core 가 설정값으로 판단한다.
 */
export function measureLightingReference(buf: PixelBuffer, face: PixelRect): LightingReference | undefined {
  let n = 0;
  let sr = 0;
  let sg = 0;
  let sb = 0;
  forEachOutsideFace(buf, face, (r, g, b) => {
    if (Math.max(r, g, b) >= MEASURE.castClipLevel) return;
    n++;
    sr += LINEAR[r] as number;
    sg += LINEAR[g] as number;
    sb += LINEAR[b] as number;
  });
  if (n === 0) return undefined;
  return { linearMean: { r: sr / n, g: sg / n, b: sb / n }, areaRatio: n / (buf.width * buf.height) };
}

/** 회색조(0~255, Rec.601 가중치) 사각형 영역 */
function grayOf(buf: PixelBuffer, r: PixelRect): { data: Float64Array; width: number; height: number } {
  const width = r.x1 - r.x0;
  const height = r.y1 - r.y0;
  const data = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = ((y + r.y0) * buf.width + (x + r.x0)) * 4;
      data[y * width + x] =
        0.299 * (buf.data[i] as number) + 0.587 * (buf.data[i + 1] as number) + 0.114 * (buf.data[i + 2] as number);
    }
  }
  return { data, width, height };
}

/**
 * 회색조 이미지를 정해진 크기로 맞춘다. 줄일 때는 영역 평균(겹치는 넓이만큼 가중), 키울 때는 쌍선형 보간.
 * 키울 때 계단이 생기면 흐린 사진이 선명하게 잡히므로 최근접 방식은 쓰지 않는다.
 */
export function resizeGray(
  src: { data: Float64Array; width: number; height: number },
  width: number,
  height: number,
): Float64Array {
  const out = new Float64Array(width * height);
  const sx = src.width / width;
  const sy = src.height / height;
  const at = (x: number, y: number) => src.data[y * src.width + x] as number;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v: number;
      if (sx >= 1 && sy >= 1) {
        // 영역 평균
        const fx0 = x * sx;
        const fx1 = fx0 + sx;
        const fy0 = y * sy;
        const fy1 = fy0 + sy;
        let sum = 0;
        let wsum = 0;
        for (let yy = Math.floor(fy0); yy < Math.min(src.height, Math.ceil(fy1)); yy++) {
          const wy = Math.min(fy1, yy + 1) - Math.max(fy0, yy);
          for (let xx = Math.floor(fx0); xx < Math.min(src.width, Math.ceil(fx1)); xx++) {
            const wgt = wy * (Math.min(fx1, xx + 1) - Math.max(fx0, xx));
            sum += at(xx, yy) * wgt;
            wsum += wgt;
          }
        }
        v = wsum > 0 ? sum / wsum : 0;
      } else {
        // 쌍선형 보간 (픽셀 중심 기준)
        const fx = Math.min(src.width - 1, Math.max(0, (x + 0.5) * sx - 0.5));
        const fy = Math.min(src.height - 1, Math.max(0, (y + 0.5) * sy - 0.5));
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(src.width - 1, x0 + 1);
        const y1 = Math.min(src.height - 1, y0 + 1);
        const tx = fx - x0;
        const ty = fy - y0;
        v =
          (at(x0, y0) * (1 - tx) + at(x1, y0) * tx) * (1 - ty) + (at(x0, y1) * (1 - tx) + at(x1, y1) * tx) * ty;
      }
      out[y * width + x] = v;
    }
  }
  return out;
}

/**
 * 선명도 (M3-1b-Q4): 얼굴 상자를 긴 변 sharpSize 로 맞춘 회색조 이미지의 라플라시안 분산.
 * 클수록 선명. 크기를 맞추므로 입력 해상도(축소 상한)가 달라도 값이 크게 변하지 않는다.
 * 한계: 얼굴 상자가 sharpSize 보다 작아 키워서 잴 때는 값이 ±30% 정도 흔들린다 (가짜 무늬 실험).
 */
export function measureSharpness(buf: PixelBuffer, face: PixelRect): number | undefined {
  const r = clampRect(face, buf);
  if (!r) return undefined;
  const gray = grayOf(buf, r);
  const s = MEASURE.sharpSize / Math.max(gray.width, gray.height);
  const w = Math.max(3, Math.round(gray.width * s));
  const h = Math.max(3, Math.round(gray.height * s));
  const g = resizeGray(gray, w, h);
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = y * w + x;
      const lap =
        (g[c - 1] as number) + (g[c + 1] as number) + (g[c - w] as number) + (g[c + w] as number) - 4 * (g[c] as number);
      sum += lap;
      sum2 += lap * lap;
      n++;
    }
  }
  const mean = sum / n;
  return Math.max(0, sum2 / n - mean * mean);
}

/** 얼굴 상자에서 잴 수 있는 품질 측정값 전부. 못 잰 값은 빠진다. */
export function measureImageQuality(
  buf: PixelBuffer,
  face: PixelRect,
): Pick<QualityMeasurements, "brightnessDark" | "brightnessBright" | "colorCast" | "sharpness"> {
  const out: Pick<QualityMeasurements, "brightnessDark" | "brightnessBright" | "colorCast" | "sharpness"> = {
    ...measureBrightness(buf, face),
  };
  const colorCast = measureColorCast(buf, face);
  if (colorCast !== undefined) out.colorCast = colorCast;
  const sharpness = measureSharpness(buf, face);
  if (sharpness !== undefined) out.sharpness = sharpness;
  return out;
}
