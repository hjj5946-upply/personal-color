import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeFeatures, representativeLab } from "./features";
import { validateColorSample } from "./sample";

// fixture: packages/core/fixtures/*.json — 모두 지어낸 숫자. 기대값은 별도(파이썬) 구현으로 계산해 넣었다.
interface Fixture {
  _note: string;
  synthetic: true;
  description: string;
  sample: unknown;
  expected: { warmCool: number; lightness: number; chroma: number; contrast: number | null; skinBStar: number };
}
const DIR = new URL("../fixtures/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
const load = (f: string) => JSON.parse(readFileSync(new URL(f, DIR), "utf8")) as Fixture;
const featuresOf = (f: Fixture) => {
  const v = validateColorSample(f.sample);
  if (!v.ok) throw new Error(v.errors.join("; "));
  return computeFeatures(v.sample);
};

describe("fixture 기대값과 일치 (소수 둘째 자리)", () => {
  it("fixture 가 있고, 모두 지어낸 숫자로 표시됨", () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const f of files) expect(load(f).synthetic, f).toBe(true);
  });
  for (const file of files) {
    it(file, () => {
      const fx = load(file);
      const { axes, aux } = featuresOf(fx);
      expect(axes.warmCool).toBeCloseTo(fx.expected.warmCool, 2);
      expect(axes.lightness).toBeCloseTo(fx.expected.lightness, 2);
      expect(axes.chroma).toBeCloseTo(fx.expected.chroma, 2);
      expect(aux.skinBStar).toBeCloseTo(fx.expected.skinBStar, 2);
      if (fx.expected.contrast === null) expect(axes.contrast).toBeNull();
      else expect(axes.contrast).toBeCloseTo(fx.expected.contrast, 2);
    });
  }
});

describe("특징값 정의", () => {
  it("warmCool: 노란 쪽 피부일수록 크다 (클수록 웜)", () => {
    const warm = featuresOf(load("synthetic-warm-light-full.json")).axes.warmCool;
    const reddish = featuresOf(load("synthetic-cool-medium-hair-only.json")).axes.warmCool;
    const pinkish = featuresOf(load("synthetic-negative-hue.json")).axes.warmCool;
    expect(warm).toBeGreaterThan(reddish);
    expect(reddish).toBeGreaterThan(pinkish);
    expect(pinkish).toBeLessThan(0); // 0° 아래는 359° 가 아니라 음수
  });
  it("contrast: 머리카락·눈동자 둘 다 없으면 null, 하나만 있으면 그 차이, 둘이면 평균", () => {
    const skin = [{ r: 220, g: 180, b: 160 }];
    const hair = [{ r: 40, g: 30, b: 25 }];
    const iris = [{ r: 120, g: 90, b: 70 }];
    const L = (rgb: typeof skin) => representativeLab(rgb).l;
    expect(computeFeatures({ skin }).axes.contrast).toBeNull();
    expect(computeFeatures({ skin, hair }).axes.contrast).toBeCloseTo(L(skin) - L(hair), 10);
    expect(computeFeatures({ skin, iris }).axes.contrast).toBeCloseTo(L(skin) - L(iris), 10);
    expect(computeFeatures({ skin, hair, iris }).axes.contrast).toBeCloseTo(
      (L(skin) - L(hair) + (L(skin) - L(iris))) / 2,
      10,
    );
  });
  it("contrast 는 절댓값 (머리카락이 피부보다 밝아도 양수)", () => {
    const c = computeFeatures({ skin: [{ r: 150, g: 110, b: 90 }], hair: [{ r: 240, g: 225, b: 180 }] }).axes.contrast;
    expect(c).toBeGreaterThan(0);
  });
});

describe("중앙값 덕분에 튀는 영역 하나에 흔들리지 않음", () => {
  it("그림자처럼 튀는 피부 영역 하나를 빼도 결과 차이가 작다 (각 축 1 미만)", () => {
    const fx = load("synthetic-outlier.json");
    const sample = fx.sample as { skin: { r: number; g: number; b: number }[]; hair: { r: number; g: number; b: number }[] };
    const withOutlier = computeFeatures(sample).axes;
    const without = computeFeatures({ ...sample, skin: sample.skin.slice(0, 4) }).axes;
    expect(Math.abs(withOutlier.lightness - without.lightness)).toBeLessThan(1);
    expect(Math.abs(withOutlier.chroma - without.chroma)).toBeLessThan(1);
    expect(Math.abs(withOutlier.warmCool - without.warmCool)).toBeLessThan(1);
    // 비교: 평균을 썼다면 크게 흔들렸을 것 (L* 기준 5 이상)
    const meanL = sample.skin.map((p) => representativeLab([p]).l).reduce((s, v) => s + v, 0) / sample.skin.length;
    expect(Math.abs(meanL - without.lightness)).toBeGreaterThan(5);
  });
});

describe("computeFeatures 입력", () => {
  it("빈 피부 영역은 오류", () => {
    expect(() => computeFeatures({ skin: [] })).toThrow();
  });
});
