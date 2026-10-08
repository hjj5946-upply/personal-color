// 결정성 (G-2, 04 색 정확도 규칙): 같은 입력이면 같은 결과. 난수·현재 시각을 core 로직에 쓰지 않는다.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deltaE2000, rgbToLab } from "./color";
import { computeFeatures } from "./features";
import { validateColorSample } from "./sample";

const SRC = new URL("./", import.meta.url);
const FIXTURES = new URL("../fixtures/", import.meta.url);
const NONDETERMINISTIC = [
  /Math\.random/,
  /Date\.now/,
  /new Date\s*\(/,
  /performance\.now/,
  /getRandomValues/,
  /randomUUID/,
];

describe("결정성", () => {
  it("core 로직 파일(테스트 제외)에 난수·현재 시각 사용이 없다", () => {
    const files = readdirSync(SRC).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const text = readFileSync(new URL(f, SRC), "utf8");
      for (const re of NONDETERMINISTIC) expect(re.test(text), `${f}: ${re}`).toBe(false);
    }
  });
  it("모든 fixture: 두 번 계산해도 완전히 같은 결과", () => {
    for (const f of readdirSync(FIXTURES).filter((x) => x.endsWith(".json"))) {
      const fx = JSON.parse(readFileSync(new URL(f, FIXTURES), "utf8")) as { sample: unknown };
      const v = validateColorSample(fx.sample);
      if (!v.ok) throw new Error(v.errors.join("; "));
      expect(computeFeatures(v.sample)).toStrictEqual(computeFeatures(v.sample));
    }
  });
  it("색 계산: 두 번 계산해도 같은 값", () => {
    const x = rgbToLab({ r: 200, g: 150, b: 120 });
    const y = rgbToLab({ r: 190, g: 160, b: 140 });
    expect(rgbToLab({ r: 200, g: 150, b: 120 })).toStrictEqual(x);
    expect(deltaE2000(x, y)).toBe(deltaE2000(x, y));
  });
});
