// 순수 색 계산. 결정적(난수 없음, 7-4). 입력은 "추출된 색 수치".
import type { Lab, LCh, Rgb } from "./types";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) throw new Error(`Invalid hex color: ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

const srgbToLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

/** sRGB → CIE Lab (D65) */
export function rgbToLab({ r, g, b }: Rgb): Lab {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** CIE76 색차. 단순 근사. 사람 눈 기준 비교에는 deltaE2000 을 쓴다. */
export function deltaE76(x: Lab, y: Lab): number {
  return Math.sqrt((x.l - y.l) ** 2 + (x.a - y.a) ** 2 + (x.b - y.b) ** 2);
}

/**
 * 이보다 작은 채도는 무채색으로 보고 C*=0, h=0 으로 고정한다 (결정성).
 * 근거: rgbToLab 에서 회색(r=g=b)의 계산 오차는 최대 C*≈0.000018, RGB 한 칸 차이의 가장 약한 색은 C*≈0.7.
 */
export const ACHROMATIC_EPSILON = 1e-3;

const RAD = Math.PI / 180;
const toDeg = (r: number) => r / RAD;
/** 각도를 0 이상 360 미만으로 */
const wrap360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Lab → LCh(ab). 무채색은 c=0, h=0. */
export function labToLch({ l, a, b }: Lab): LCh {
  const c = Math.hypot(a, b);
  if (c < ACHROMATIC_EPSILON) return { l, c: 0, h: 0 };
  return { l, c, h: wrap360(toDeg(Math.atan2(b, a))) };
}

/** 색상각을 -180 초과 180 이하로 바꾼다. 0° 근처에서 값이 359° 로 튀지 않게 할 때 쓴다. */
export function hueToSigned(h: number): number {
  const w = wrap360(h);
  return w > 180 ? w - 360 : w;
}

/**
 * CIEDE2000 색차 (kL = kC = kH = 1).
 * 구현·검증 기준: Sharma, Wu, Dalal (2005) "The CIEDE2000 Color-Difference Formula:
 * Implementation Notes, Supplementary Test Data, and Mathematical Observations".
 */
export function deltaE2000(x: Lab, y: Lab): number {
  const c1 = Math.hypot(x.a, x.b);
  const c2 = Math.hypot(y.a, y.b);
  const cBar7 = ((c1 + c2) / 2) ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 25 ** 7)));
  const a1 = (1 + g) * x.a;
  const a2 = (1 + g) * y.a;
  const cp1 = Math.hypot(a1, x.b);
  const cp2 = Math.hypot(a2, y.b);
  // 채도가 0이면 색상각은 0으로 둔다 (Sharma 구현 노트)
  const hp1 = cp1 === 0 ? 0 : wrap360(toDeg(Math.atan2(x.b, a1)));
  const hp2 = cp2 === 0 ? 0 : wrap360(toDeg(Math.atan2(y.b, a2)));

  const dL = y.l - x.l;
  const dC = cp2 - cp1;
  let dh = 0;
  if (cp1 * cp2 !== 0) {
    dh = hp2 - hp1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin((dh / 2) * RAD);

  const lBar = (x.l + y.l) / 2;
  const cBarP = (cp1 + cp2) / 2;
  let hBar = hp1 + hp2;
  if (cp1 * cp2 !== 0) {
    if (Math.abs(hp1 - hp2) <= 180) hBar /= 2;
    else hBar = hBar < 360 ? (hBar + 360) / 2 : (hBar - 360) / 2;
  }

  const t =
    1 -
    0.17 * Math.cos((hBar - 30) * RAD) +
    0.24 * Math.cos(2 * hBar * RAD) +
    0.32 * Math.cos((3 * hBar + 6) * RAD) -
    0.2 * Math.cos((4 * hBar - 63) * RAD);
  const dTheta = 30 * Math.exp(-(((hBar - 275) / 25) ** 2));
  const cBarP7 = cBarP ** 7;
  const rC = 2 * Math.sqrt(cBarP7 / (cBarP7 + 25 ** 7));
  const sL = 1 + (0.015 * (lBar - 50) ** 2) / Math.sqrt(20 + (lBar - 50) ** 2);
  const sC = 1 + 0.045 * cBarP;
  const sH = 1 + 0.015 * cBarP * t;
  const rT = -Math.sin(2 * dTheta * RAD) * rC;

  const tl = dL / sL;
  const tc = dC / sC;
  const th = dH / sH;
  return Math.sqrt(tl * tl + tc * tc + th * th + rT * tc * th);
}

/** 중앙값 (여러 영역 샘플링의 대표값, 6-1 파이프라인 ②) */
export function median(values: number[]): number {
  if (values.length === 0) throw new Error("median of empty array");
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}
