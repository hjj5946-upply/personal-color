// 간이 비밀 유출 검사 (S-1, S-2). 커밋 전/CI에서 실행. 정식 도구(GitHub secret scanning 등)를 대체하지 않는다.
import { readFileSync } from "node:fs";
import { walk } from "./lib.mjs";

const PATTERNS = [
  { name: "Anthropic API key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Private key block", re: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { name: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "Supabase service_role / JWT", re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "Generic secret assignment", re: /(SECRET|SERVICE_ROLE|API_KEY|PRIVATE_KEY)\s*[=:]\s*["']?[A-Za-z0-9_\-\/+]{24,}/ },
];
const TEXT_EXT = /\.(ts|tsx|js|mjs|cjs|json|md|yml|yaml|css|html|txt|env|toml|sh)$/i;
const SELF = "scripts/check-secrets.mjs";

let bad = 0;
for (const f of walk()) {
  const base = f.rel.split("/").pop();
  if (/^\.env(\..+)?$/.test(base) && base !== ".env.example") {
    console.error(`✗ ${f.rel}: .env 파일이 저장소 폴더에 있어요. 커밋 대상이 아닌지(.gitignore) 확인하세요.`);
    bad++;
    continue;
  }
  if (f.rel === SELF || !TEXT_EXT.test(f.rel) || f.size > 1_000_000) continue;
  const text = readFileSync(f.path, "utf8");
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) {
      console.error(`✗ ${f.rel}: ${name} 의심 패턴`);
      bad++;
    }
  }
}
if (bad) {
  console.error(`\n비밀 유출 의심 ${bad}건. 실제 비밀이면 즉시 폐기·재발급하세요.`);
  process.exit(1);
}
console.log("✓ check-secrets: 문제 없음");
