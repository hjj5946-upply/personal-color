import { describe, expect, it } from "vitest";
import { MODEL, sha256, verifyModel, WASM_FILES } from "./prepare-mediapipe.mjs";

describe("모델 SHA-256 검증 (결정 로그 M3-D2)", () => {
  const buf = Buffer.from("가짜 모델 내용");
  const expected = { ...MODEL, bytes: buf.length, sha256: sha256(buf) };

  it("크기와 SHA-256이 맞으면 통과", () => {
    expect(() => verifyModel(buf, expected)).not.toThrow();
  });
  it("내용이 한 바이트라도 다르면 실패", () => {
    const changed = Buffer.from(buf);
    changed[0] = changed[0] ^ 1;
    expect(() => verifyModel(changed, expected)).toThrow(/SHA-256이 달라요/);
  });
  it("크기가 다르면 실패", () => {
    expect(() => verifyModel(Buffer.concat([buf, Buffer.from("x")]), expected)).toThrow(/크기가 달라요/);
  });
  it("고정된 모델 정보: 버전 고정 주소, 크기, SHA-256 형식", () => {
    expect(MODEL.url).toMatch(/\/float16\/1\/face_landmarker\.task$/);
    expect(MODEL.bytes).toBe(3758596);
    expect(MODEL.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
  it("WASM 은 SIMD·비SIMD 두 벌만 복사", () => {
    expect(WASM_FILES).toHaveLength(4);
  });
});
