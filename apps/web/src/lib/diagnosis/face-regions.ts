// MediaPipe Face Landmarker(478점) 결과로 피부·머리카락·눈동자 영역을 잡고 ColorSample 과 얼굴 측정값을 만든다.
// 순수 함수: 브라우저 API·MediaPipe 를 직접 쓰지 않는다 (테스트는 가짜 픽셀·가짜 랜드마크로).
// O-2: 랜드마크 좌표는 이 함수 안에서만 쓰고 결과에 넣지 않는다. 결과는 색 값과 숫자 측정값뿐.
import { validateColorSample, type ColorSample, type Rgb } from "@personal-color/core";
import { regionMedianRgb, type PixelBuffer, type Point } from "./pixels";

/** MediaPipe 정규화 랜드마크 (x·y 는 0~1, 이미지 너비·높이 기준) */
export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
}
/** MediaPipe 변환 행렬 (4×4, 열 우선) */
export interface Matrix4 {
  rows: number;
  columns: number;
  data: readonly number[];
}

/** 사용하는 랜드마크 번호 (MediaPipe Face Mesh 478점 기준) */
export const LANDMARK = {
  faceTop: 10,
  chin: 152,
  forehead: 151,
  cheekA: 50,
  cheekB: 280,
  hairlineA: 109,
  hairlineB: 338,
  eyeOuterA: 33,
  eyeOuterB: 263,
  irisCenterA: 468,
  irisRingA: [469, 470, 471, 472],
  irisCenterB: 473,
  irisRingB: [474, 475, 476, 477],
} as const;

/**
 * 영역 크기·위치 [임시, M3-3 재검토]. 모든 길이는 얼굴 크기에 비례한다.
 * - 피부: 이마·양 볼, 반지름 = 눈 바깥 끝 사이 거리 × skinRadius
 * - 눈동자: 고리(동공·흰자 경계 제외), 홍채 반지름 × [irisInner, irisOuter]
 * - 머리카락: 이마 위쪽 3곳을 얼굴 세로 방향으로 hairOffset 만큼 올린 점, 반지름 = 얼굴 높이 × hairRadius
 */
export const SAMPLING = {
  skinRadius: 0.08,
  irisInner: 0.4,
  irisOuter: 0.85,
  hairOffset: 0.12,
  hairRadius: 0.05,
  minPixels: 9,
} as const;

export interface FaceExtraction {
  /** 피부를 하나도 못 뽑으면 null */
  sample: ColorSample | null;
  /** 얼굴 크기: 랜드마크 외곽 상자 넓이 / 이미지 넓이 (0~1) [임시 정의, M3-3에서 확정] */
  faceSize: number;
  /** 얼굴 각도: 정면에서 돌아간 전체 각도(°) [임시 정의, M3-3에서 확정]. 행렬이 없으면 undefined */
  faceAngle: number | undefined;
}

const toPx = (l: NormalizedLandmark | undefined, buf: PixelBuffer): Point | null =>
  l && Number.isFinite(l.x) && Number.isFinite(l.y) ? { x: l.x * buf.width, y: l.y * buf.height } : null;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** 외곽 상자 넓이 비율 (이미지 밖으로 나간 부분은 잘라서 계산) */
export function faceSizeRatio(landmarks: readonly NormalizedLandmark[]): number {
  let x0 = 1;
  let y0 = 1;
  let x1 = 0;
  let y1 = 0;
  for (const l of landmarks) {
    const x = Math.min(1, Math.max(0, l.x));
    const y = Math.min(1, Math.max(0, l.y));
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return x1 > x0 && y1 > y0 ? (x1 - x0) * (y1 - y0) : 0;
}

/**
 * 변환 행렬의 회전 부분이 정면(단위 행렬)에서 얼마나 돌아갔는지 (°, 0~180).
 * 좌우·상하·기울기를 합친 하나의 각도 (결정 로그 M2-세부: faceAngle 은 숫자 하나).
 */
export function rotationAngleDeg(m: Matrix4): number {
  const at = (row: number, col: number) => m.data[col * m.rows + row] as number;
  // 크기 성분 제거: 각 열의 길이로 나눈다
  const scale = (col: number) => Math.hypot(at(0, col), at(1, col), at(2, col)) || 1;
  const trace = at(0, 0) / scale(0) + at(1, 1) / scale(1) + at(2, 2) / scale(2);
  const c = Math.min(1, Math.max(-1, (trace - 1) / 2));
  return (Math.acos(c) * 180) / Math.PI;
}

function sampleRegions(buf: PixelBuffer, centersAndRadii: [Point | null, number, number?][]): Rgb[] {
  const out: Rgb[] = [];
  for (const [p, radius, inner] of centersAndRadii) {
    if (!p) continue;
    const rgb = regionMedianRgb(buf, p, radius, { innerRadius: inner, minPixels: SAMPLING.minPixels });
    if (rgb) out.push(rgb);
  }
  return out;
}

/** 얼굴 1명의 랜드마크로 영역 색과 측정값을 만든다. */
export function extractFace(
  buf: PixelBuffer,
  landmarks: readonly NormalizedLandmark[],
  matrix?: Matrix4,
): FaceExtraction {
  const P = (i: number) => toPx(landmarks[i], buf);
  const faceSize = faceSizeRatio(landmarks);
  const faceAngle = matrix ? rotationAngleDeg(matrix) : undefined;

  const eyeA = P(LANDMARK.eyeOuterA);
  const eyeB = P(LANDMARK.eyeOuterB);
  const top = P(LANDMARK.faceTop);
  const chin = P(LANDMARK.chin);
  if (!eyeA || !eyeB || !top || !chin) return { sample: null, faceSize, faceAngle };

  const eyeSpan = dist(eyeA, eyeB);
  const faceHeight = dist(top, chin);

  // 피부: 이마·양 볼
  const skinR = eyeSpan * SAMPLING.skinRadius;
  const skin = sampleRegions(buf, [
    [P(LANDMARK.forehead), skinR],
    [P(LANDMARK.cheekA), skinR],
    [P(LANDMARK.cheekB), skinR],
  ]);

  // 눈동자: 홍채 고리
  const iris: Rgb[] = [];
  for (const [ci, ring] of [
    [LANDMARK.irisCenterA, LANDMARK.irisRingA],
    [LANDMARK.irisCenterB, LANDMARK.irisRingB],
  ] as const) {
    const c = P(ci);
    const ringPts = ring.map(P).filter((p): p is Point => p !== null);
    if (!c || ringPts.length === 0) continue;
    const r = ringPts.reduce((s, p) => s + dist(c, p), 0) / ringPts.length;
    iris.push(...sampleRegions(buf, [[c, r * SAMPLING.irisOuter, r * SAMPLING.irisInner]]));
  }

  // 머리카락: 턱→이마 방향으로 이마 위쪽 점을 올린다 (얼굴이 기울어도 같은 방향)
  const up = { x: (top.x - chin.x) / (faceHeight || 1), y: (top.y - chin.y) / (faceHeight || 1) };
  const lift = (p: Point | null): Point | null =>
    p ? { x: p.x + up.x * faceHeight * SAMPLING.hairOffset, y: p.y + up.y * faceHeight * SAMPLING.hairOffset } : null;
  const hairR = faceHeight * SAMPLING.hairRadius;
  const hair = sampleRegions(buf, [
    [lift(top), hairR],
    [lift(P(LANDMARK.hairlineA)), hairR],
    [lift(P(LANDMARK.hairlineB)), hairR],
  ]);

  if (skin.length === 0) return { sample: null, faceSize, faceAngle };
  const candidate: ColorSample = { skin };
  if (hair.length) candidate.hair = hair;
  if (iris.length) candidate.iris = iris;
  const checked = validateColorSample(candidate);
  return { sample: checked.ok ? checked.sample : null, faceSize, faceAngle };
}
