import { describe, expect, it } from "vitest";
import { validateColorSample } from "./sample";

// 아래 숫자는 모두 지어낸 값이다 (실제 사람에게서 뽑은 값 아님).
const SKIN = [{ r: 200, g: 160, b: 140 }];

const errorsOf = (input: unknown) => {
  const r = validateColorSample(input);
  return r.ok ? [] : r.errors;
};

describe("validateColorSample — 통과", () => {
  it("피부만 있어도 통과", () => {
    const r = validateColorSample({ skin: SKIN });
    expect(r).toEqual({ ok: true, sample: { skin: SKIN } });
  });
  it("피부 + 머리카락 + 눈동자, 소수 값 허용, 경계값 0·255 허용", () => {
    const r = validateColorSample({
      skin: [{ r: 0, g: 255, b: 127.5 }],
      hair: [{ r: 40, g: 30, b: 25 }],
      iris: [{ r: 70, g: 50, b: 40 }],
    });
    expect(r.ok).toBe(true);
  });
  it("돌려주는 값은 새 객체 (입력과 분리)", () => {
    const input = { skin: [{ r: 1, g: 2, b: 3 }] };
    const r = validateColorSample(input);
    if (!r.ok) throw new Error("unexpected");
    expect(r.sample.skin[0]).not.toBe(input.skin[0]);
  });
});

describe("validateColorSample — 거부", () => {
  it("객체가 아니면 거부", () => {
    for (const v of [null, undefined, 1, "x", [], [SKIN]]) expect(errorsOf(v).length).toBeGreaterThan(0);
  });
  it("피부가 없으면 거부", () => {
    expect(errorsOf({ hair: SKIN })).toContain("skin: 필수 영역이에요");
  });
  it("빈 영역은 거부 (피부·머리카락·눈동자 모두)", () => {
    expect(errorsOf({ skin: [] }).join()).toMatch(/skin: 빈 영역/);
    expect(errorsOf({ skin: SKIN, hair: [] }).join()).toMatch(/hair: 빈 영역/);
    expect(errorsOf({ skin: SKIN, iris: [] }).join()).toMatch(/iris: 빈 영역/);
  });
  it("범위 밖·숫자 아님·NaN·Infinity 는 거부", () => {
    for (const bad of [-1, 255.01, 300, NaN, Infinity, "200", null]) {
      expect(errorsOf({ skin: [{ r: bad, g: 100, b: 100 }] }).join()).toMatch(/skin\[0\]\.r: 0~255/);
    }
  });
  it("r·g·b 가 빠지면 거부", () => {
    expect(errorsOf({ skin: [{ r: 1, g: 2 }] }).join()).toMatch(/skin\[0\]\.b/);
  });
  it("영역이 배열이 아니면 거부", () => {
    expect(errorsOf({ skin: { r: 1, g: 2, b: 3 } }).join()).toMatch(/skin: 배열/);
    expect(errorsOf({ skin: SKIN, hair: null }).join()).toMatch(/hair: 배열/);
  });
  it("O-1·O-2: 사진·좌표·얼굴 데이터 필드는 금지 필드로 거부", () => {
    for (const k of ["landmarks", "image", "imageData", "photo", "faceMesh", "coordinates", "points", "bbox", "base64"]) {
      expect(errorsOf({ skin: SKIN, [k]: [1, 2, 3] })).toContain(
        `${k}: 금지 필드예요 (사진·좌표·얼굴 데이터는 받지 않아요, O-1·O-2)`,
      );
    }
  });
  it("그 밖의 모르는 필드도 거부 (허용 목록 방식)", () => {
    expect(errorsOf({ skin: SKIN, note: "x" })).toContain("note: 허용되지 않은 필드예요");
  });
  it("색 값 객체 안의 추가 필드(예: 좌표 x·y)도 거부", () => {
    expect(errorsOf({ skin: [{ r: 1, g: 2, b: 3, x: 10, y: 20 }] })).toEqual([
      "skin[0].x: 허용되지 않은 필드예요",
      "skin[0].y: 허용되지 않은 필드예요",
    ]);
  });
});
