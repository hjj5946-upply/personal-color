// "추출된 색 수치" 입력 형식과 검사 (02 특징값 정의, G-3).
// O-1·O-2: 좌표·이미지·얼굴 특징값은 받지 않는다. 허용된 필드 외에는 전부 거부한다.
import type { Rgb } from "./types";

/**
 * 얼굴 영역 추출기(M3)가 core 에 넘기는 값. 각 배열은 영역별 sRGB(0~255) 대표값이며
 * 조명 보정(③)이 끝난 값이다. 피부는 1개 이상 필수, 머리카락·눈동자는 선택.
 */
export interface ColorSample {
  skin: Rgb[];
  hair?: Rgb[];
  iris?: Rgb[];
}

export type SampleValidation = { ok: true; sample: ColorSample } | { ok: false; errors: string[] };

const REQUIRED_REGIONS = ["skin"] as const;
const OPTIONAL_REGIONS = ["hair", "iris"] as const;
const ALLOWED_KEYS: ReadonlySet<string> = new Set([...REQUIRED_REGIONS, ...OPTIONAL_REGIONS]);
const RGB_KEYS = ["r", "g", "b"] as const;
/** 들어오면 특히 위험한 필드 이름(사진·좌표·얼굴 데이터). 오류 메시지를 더 분명히 하기 위한 것이고, 차단 자체는 허용 목록이 한다. */
const FORBIDDEN_HINT = /landmark|image|photo|pixel|coord|point|mesh|face|bbox|box|canvas|blob|url|base64|embedding|descriptor/i;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function checkRgb(v: unknown, path: string, errors: string[]): Rgb | undefined {
  if (!isPlainObject(v)) {
    errors.push(`${path}: {r, g, b} 객체여야 해요`);
    return undefined;
  }
  for (const k of Object.keys(v)) {
    if (!(RGB_KEYS as readonly string[]).includes(k)) errors.push(`${path}.${k}: 허용되지 않은 필드예요`);
  }
  let ok = true;
  for (const k of RGB_KEYS) {
    const n = v[k];
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 255) {
      errors.push(`${path}.${k}: 0~255 숫자여야 해요`);
      ok = false;
    }
  }
  return ok ? { r: v.r as number, g: v.g as number, b: v.b as number } : undefined;
}

function checkRegion(v: unknown, name: string, errors: string[]): Rgb[] | undefined {
  if (!Array.isArray(v)) {
    errors.push(`${name}: 배열이어야 해요`);
    return undefined;
  }
  if (v.length === 0) {
    errors.push(`${name}: 빈 영역이에요 (값이 1개 이상 필요해요)`);
    return undefined;
  }
  const out: Rgb[] = [];
  v.forEach((item, i) => {
    const rgb = checkRgb(item, `${name}[${i}]`, errors);
    if (rgb) out.push(rgb);
  });
  return out;
}

/** 외부에서 들어온 값을 검사하고, 허용된 필드만 담은 새 객체를 돌려준다. */
export function validateColorSample(input: unknown): SampleValidation {
  const errors: string[] = [];
  if (!isPlainObject(input)) return { ok: false, errors: ["sample: 객체여야 해요"] };

  for (const k of Object.keys(input)) {
    if (ALLOWED_KEYS.has(k)) continue;
    errors.push(
      FORBIDDEN_HINT.test(k)
        ? `${k}: 금지 필드예요 (사진·좌표·얼굴 데이터는 받지 않아요, O-1·O-2)`
        : `${k}: 허용되지 않은 필드예요`,
    );
  }

  const sample: ColorSample = { skin: [] };
  if (input.skin === undefined) errors.push("skin: 필수 영역이에요");
  else sample.skin = checkRegion(input.skin, "skin", errors) ?? [];
  for (const name of OPTIONAL_REGIONS) {
    if (input[name] === undefined) continue;
    const region = checkRegion(input[name], name, errors);
    if (region) sample[name] = region;
  }

  return errors.length ? { ok: false, errors } : { ok: true, sample };
}
