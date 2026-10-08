// tokens.json → tokens.css (CSS 변수). 웹·앱이 같은 JSON을 공유한다.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(dir, "tokens.json"), "utf8"));
const kebab = (s) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
const lines = [];
for (const [group, values] of Object.entries(tokens)) {
  for (const [k, v] of Object.entries(values)) lines.push(`  --${kebab(group)}-${kebab(k)}: ${v};`);
}
const css = `/* 자동 생성 파일: npm run tokens 로 만든다. 직접 수정 금지. */\n:root {\n${lines.join("\n")}\n}\n`;
writeFileSync(join(dir, "tokens.css"), css);
console.log("tokens.css generated");
