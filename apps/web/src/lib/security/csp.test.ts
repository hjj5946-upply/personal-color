import { describe, expect, it } from "vitest";
import { CONTENT_SECURITY_POLICY } from "./csp";

describe("CSP (결정 로그 M3-D1)", () => {
  it("외부 연결은 우리 사이트로만", () => {
    const connect = CONTENT_SECURITY_POLICY.split(";").map((s) => s.trim()).find((s) => s.startsWith("connect-src"));
    expect(connect).toBe("connect-src 'self'");
  });
  it("와일드카드·외부 주소 허용 없음", () => {
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/\*|https?:|googleapis/);
  });
});
