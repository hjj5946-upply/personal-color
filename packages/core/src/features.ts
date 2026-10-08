// 특징값 계산 (파이프라인 ④). [임시 정의, M3 후 재검토] — docs/spec/02 "특징값 정의".
// 입력은 조명 보정(③)이 끝난 영역별 sRGB 값. 결정적(난수·시간 사용 금지).
import { hueToSigned, labToLch, median, rgbToLab } from "./color";
import type { ColorSample } from "./sample";
import type { ColorAxes, Lab, Rgb } from "./types";

export interface FeatureResult {
  /** ColorProfile.axes 에 들어가는 값 (단위: warmCool °, lightness L*, chroma C*, contrast |ΔL*|) */
  axes: ColorAxes;
  /** 보조 값. 계산만 해 두고 ColorProfile 에는 넣지 않는다. */
  aux: {
    /** 피부 대표색의 b* (노란기) */
    skinBStar: number;
  };
}

/** 여러 영역의 대표색: 영역별로 Lab 으로 바꾼 뒤 L*·a*·b* 를 각각 중앙값으로 묶는다. */
export function representativeLab(region: readonly Rgb[]): Lab {
  if (region.length === 0) throw new Error("representativeLab: 빈 영역");
  const labs = region.map(rgbToLab);
  return {
    l: median(labs.map((x) => x.l)),
    a: median(labs.map((x) => x.a)),
    b: median(labs.map((x) => x.b)),
  };
}

/** validateColorSample 을 통과한 샘플을 넣는다. */
export function computeFeatures(sample: ColorSample): FeatureResult {
  const skin = representativeLab(sample.skin);
  const skinLch = labToLch(skin);

  // 대비: 피부와 머리카락·눈동자의 밝기 차이 |ΔL*|. 둘 다 있으면 평균, 둘 다 없으면 null.
  const diffs = [sample.hair, sample.iris]
    .filter((r): r is Rgb[] => r !== undefined)
    .map((r) => Math.abs(skin.l - representativeLab(r).l));
  const contrast = diffs.length ? diffs.reduce((s, d) => s + d, 0) / diffs.length : null;

  return {
    axes: {
      warmCool: hueToSigned(skinLch.h), // 클수록 웜. -180~180 (0° 근처에서 359°로 튀지 않게)
      lightness: skin.l,
      chroma: skinLch.c,
      contrast,
    },
    aux: { skinBStar: skin.b },
  };
}
