import { describe, expect, it } from "vitest";
import { fitWithin, regionMedianRgb, type PixelBuffer } from "./pixels";

// 코드로 만든 가짜 픽셀 (사진 아님)
function solid(width: number, height: number, rgb: [number, number, number]): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([...rgb, 255], i * 4);
  return { data, width, height };
}
function setPixel(buf: PixelBuffer, x: number, y: number, rgb: [number, number, number]) {
  buf.data.set([...rgb, 255], (y * buf.width + x) * 4);
}

describe("regionMedianRgb", () => {
  it("한 가지 색이면 그 색", () => {
    expect(regionMedianRgb(solid(50, 50, [200, 150, 120]), { x: 25, y: 25 }, 5)).toEqual({ r: 200, g: 150, b: 120 });
  });
  it("튀는 픽셀 몇 개는 중앙값이라 무시된다", () => {
    const buf = solid(50, 50, [200, 150, 120]);
    setPixel(buf, 25, 25, [0, 0, 0]);
    setPixel(buf, 26, 25, [255, 255, 255]);
    expect(regionMedianRgb(buf, { x: 25, y: 25 }, 5)).toEqual({ r: 200, g: 150, b: 120 });
  });
  it("고리 모양: 안쪽 반지름 안은 제외", () => {
    const buf = solid(50, 50, [90, 60, 40]);
    for (let y = 22; y <= 27; y++) for (let x = 22; x <= 27; x++) setPixel(buf, x, y, [0, 0, 0]); // 가운데 검은 동공
    expect(regionMedianRgb(buf, { x: 25, y: 25 }, 8, { innerRadius: 4 })).toEqual({ r: 90, g: 60, b: 40 });
  });
  it("이미지 밖이거나 픽셀이 너무 적으면 null", () => {
    const buf = solid(20, 20, [1, 2, 3]);
    expect(regionMedianRgb(buf, { x: -50, y: -50 }, 5)).toBeNull();
    expect(regionMedianRgb(buf, { x: 10, y: 10 }, 1)).toBeNull(); // 9픽셀 미만
    expect(regionMedianRgb(buf, { x: NaN, y: 10 }, 5)).toBeNull();
    expect(regionMedianRgb(buf, { x: 10, y: 10 }, 0)).toBeNull();
  });
  it("가장자리에 걸치면 안쪽 픽셀만 사용", () => {
    expect(regionMedianRgb(solid(20, 20, [7, 8, 9]), { x: 0, y: 0 }, 6)).toEqual({ r: 7, g: 8, b: 9 });
  });
  it("중심이 이미지 밖이면 일부가 걸쳐도 null", () => {
    expect(regionMedianRgb(solid(20, 20, [7, 8, 9]), { x: 10, y: -3 }, 8)).toBeNull();
  });
});

describe("fitWithin (축소 상한은 M3-1b에서 결정)", () => {
  it("상한이 없거나 이미 작으면 그대로", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 4000, height: 3000 });
    expect(fitWithin(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });
  it("긴 변 기준으로 비율 유지 축소", () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 });
    expect(fitWithin(3000, 4000, 1000)).toEqual({ width: 750, height: 1000 });
  });
});
