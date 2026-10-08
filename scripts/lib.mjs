import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath: Windows(C:\...)·리눅스(/home/...) 모두 올바른 경로로 바꾸고, 한글 등 퍼센트 인코딩도 풀어준다.
export const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/[\/]$/, "");
const SKIP = new Set(["node_modules", ".git", ".next", "out", "dist", "coverage"]);

/** 저장소 안의 파일을 돌려준다. rel 은 OS와 무관하게 항상 "/" 구분자다. */
export function* walk(dir = ROOT) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield { path: p, rel: relative(ROOT, p).split(sep).join("/"), size: st.size };
  }
}
