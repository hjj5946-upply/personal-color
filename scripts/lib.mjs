import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SKIP = new Set(["node_modules", ".git", ".next", "out", "dist", "coverage"]);

export function* walk(dir = ROOT) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield { path: p, rel: relative(ROOT, p), size: st.size };
  }
}
