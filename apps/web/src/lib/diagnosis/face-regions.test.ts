import { describe, expect, it } from "vitest";
import { extractFace, faceSizeRatio, LANDMARK, rotationAngleDeg, type Matrix4, type NormalizedLandmark } from "./face-regions";
import type { PixelBuffer } from "./pixels";

// 코드로 그린 가짜 얼굴 (사진 아님, 지어낸 색)
const W = 400;
const H = 400;
const BG: Rgb3 = [128, 128, 128];
const SKIN: Rgb3 = [220, 180, 160];
const HAIR: Rgb3 = [40, 30, 25];
const IRIS: Rgb3 = [90, 60, 40];
type Rgb3 = [number, number, number];

function paint(buf: PixelBuffer, cx: number, cy: number, r: number, rgb: Rgb3) {
  for (let y = 0; y < buf.height; y++)
    for (let x = 0; x < buf.width; x++)
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) buf.data.set([...rgb, 255], (y * buf.width + x) * 4);
}

/** 얼굴 위쪽 위치(top, 0~1)를 바꿔 머리카락이 이미지 밖으로 나가는 경우도 만든다 */
function makeFace(top = 0.25): { buf: PixelBuffer; landmarks: NormalizedLandmark[] } {
  const dy = top - 0.25;
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) data.set([...BG, 255], i * 4);
  const buf: PixelBuffer = { data, width: W, height: H };
  const lm: NormalizedLandmark[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 + dy }));
  const set = (i: number, x: number, y: number) => (lm[i] = { x, y: y + dy });
  set(LANDMARK.faceTop, 0.5, 0.25);
  set(LANDMARK.chin, 0.5, 0.75);
  set(LANDMARK.eyeOuterA, 0.38, 0.42);
  set(LANDMARK.eyeOuterB, 0.62, 0.42);
  set(LANDMARK.forehead, 0.5, 0.32);
  set(LANDMARK.cheekA, 0.4, 0.55);
  set(LANDMARK.cheekB, 0.6, 0.55);
  set(LANDMARK.hairlineA, 0.44, 0.27);
  set(LANDMARK.hairlineB, 0.56, 0.27);
  for (const [c, ring, cx] of [
    [LANDMARK.irisCenterA, LANDMARK.irisRingA, 0.42],
    [LANDMARK.irisCenterB, LANDMARK.irisRingB, 0.58],
  ] as const) {
    set(c, cx, 0.42);
    const [a, b, d, e] = ring;
    set(a, cx + 0.015, 0.42);
    set(b, cx, 0.42 - 0.015);
    set(d, cx - 0.015, 0.42);
    set(e, cx, 0.42 + 0.015);
  }
  const px = (v: number) => v * W;
  const py = (v: number) => (v + dy) * H;
  // 머리카락: 이마 위쪽 띠
  for (let y = 0; y < Math.max(0, py(0.2375)); y++)
    for (let x = 0; x < W; x++) buf.data.set([...HAIR, 255], (y * W + x) * 4);
  // 피부: 이마·양 볼
  for (const [x, y] of [[0.5, 0.32], [0.4, 0.55], [0.6, 0.55]] as const) paint(buf, px(x), py(y), 12, SKIN);
  // 눈동자: 홍채 + 가운데 검은 동공
  for (const cx of [0.42, 0.58]) {
    paint(buf, px(cx), py(0.42), 6, IRIS);
    paint(buf, px(cx), py(0.42), 2, [0, 0, 0]);
  }
  return { buf, landmarks: lm };
}

const rgb = ([r, g, b]: Rgb3) => ({ r, g, b });
const identity: Matrix4 = { rows: 4, columns: 4, data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] };
function rotY(deg: number, scale = 1): Matrix4 {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t) * scale;
  const s = Math.sin(t) * scale;
  // 열 우선
  return { rows: 4, columns: 4, data: [c, 0, -s, 0, 0, scale, 0, 0, s, 0, c, 0, 5, 6, 7, 1] };
}

describe("extractFace — 가짜 얼굴", () => {
  it("피부 3곳·머리카락 3곳·눈동자 2곳의 색을 그대로 뽑는다", () => {
    const { buf, landmarks } = makeFace();
    const r = extractFace(buf, landmarks, identity);
    expect(r.sample).toEqual({
      skin: [rgb(SKIN), rgb(SKIN), rgb(SKIN)],
      hair: [rgb(HAIR), rgb(HAIR), rgb(HAIR)],
      iris: [rgb(IRIS), rgb(IRIS)],
    });
    expect(r.faceAngle).toBe(0);
    expect(r.faceSize).toBeCloseTo(0.24 * 0.5, 10);
  });
  it("머리카락 영역이 이미지 밖이면 hair 없이 만든다 (contrast 는 눈동자로)", () => {
    const { buf, landmarks } = makeFace(0.02);
    const r = extractFace(buf, landmarks);
    expect(r.sample?.hair).toBeUndefined();
    expect(r.sample?.iris).toHaveLength(2);
    expect(r.faceAngle).toBeUndefined();
  });
  it("필요한 랜드마크가 없으면 sample 은 null", () => {
    const { buf } = makeFace();
    expect(extractFace(buf, []).sample).toBeNull();
  });
  it("O-2: 결과에는 색 값과 숫자만, 좌표는 없다", () => {
    const { buf, landmarks } = makeFace();
    const r = extractFace(buf, landmarks, identity);
    expect(Object.keys(r).sort()).toEqual(["faceAngle", "faceSize", "sample"]);
    expect(Object.keys(r.sample ?? {}).sort()).toEqual(["hair", "iris", "skin"]);
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/"x"|"y"|"z"|landmark/i);
  });
});

describe("얼굴 크기·각도 [임시 정의]", () => {
  it("외곽 상자 넓이 비율, 이미지 밖은 잘라서 계산", () => {
    expect(faceSizeRatio([{ x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 }])).toBeCloseTo(0.25, 10);
    expect(faceSizeRatio([{ x: -1, y: -1 }, { x: 0.5, y: 0.5 }])).toBeCloseTo(0.25, 10);
    expect(faceSizeRatio([])).toBe(0);
  });
  it("정면은 0°, y축 30° 회전은 30°, 크기·이동 성분은 무시", () => {
    expect(rotationAngleDeg(identity)).toBe(0);
    expect(rotationAngleDeg(rotY(30))).toBeCloseTo(30, 6);
    expect(rotationAngleDeg(rotY(-45, 2.5))).toBeCloseTo(45, 6);
  });
});
