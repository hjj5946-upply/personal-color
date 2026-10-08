// 정적 내보내기 결과(out/) 검사 — postbuild 에서 자동 실행 (결정 로그 M3-D10, M3-D2).
// 1) 개발용 화면이 배포본에 들어가지 않았는지  2) 자체 호스팅 MediaPipe 파일이 들어갔는지
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEV_MARKER = "data-dev-only";
const TEXT_EXT = /\.(html|js|txt|json|css)$/i;

/** 개발용 화면의 흔적: dev 경로 또는 개발용 표시 문자열 */
export function findDevArtifacts(outDir) {
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const rel = relative(outDir, p).split(sep).join("/");
      if (statSync(p).isDirectory()) {
        if (rel === "dev" || rel.startsWith("dev/")) found.push(rel);
        else if (rel !== "mediapipe") walk(p);
      } else if (TEXT_EXT.test(name) && readFileSync(p, "utf8").includes(DEV_MARKER)) {
        found.push(rel);
      }
    }
  };
  walk(outDir);
  return found;
}

export const REQUIRED_ASSETS = [
  "mediapipe/face_landmarker.task",
  "mediapipe/wasm/vision_wasm_internal.js",
  "mediapipe/wasm/vision_wasm_internal.wasm",
  "mediapipe/wasm/vision_wasm_nosimd_internal.js",
  "mediapipe/wasm/vision_wasm_nosimd_internal.wasm",
];

function main() {
  const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
  const dev = findDevArtifacts(outDir);
  const missing = REQUIRED_ASSETS.filter((f) => !existsSync(join(outDir, f)));
  if (dev.length) console.error(`✗ 개발용 화면이 배포본에 들어갔어요: ${dev.join(", ")}`);
  if (missing.length) console.error(`✗ MediaPipe 파일이 없어요: ${missing.join(", ")}`);
  if (dev.length || missing.length) process.exit(1);
  console.log("✓ check-export: 개발용 화면 없음, MediaPipe 파일 포함");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
