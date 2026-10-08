// MediaPipe 실행 엔진(WASM)과 모델을 public/mediapipe 에 준비한다 (결정 로그 M3-D2).
// - WASM: 설치된 @mediapipe/tasks-vision 에서 복사 (라이브러리 버전과 항상 일치)
// - 모델: 고정 주소에서 받아 크기·SHA-256 검증. 이미 받아 둔 파일이 맞으면 다시 받지 않는다.
// 결과 폴더는 .gitignore 대상 (저장소에 큰 파일을 넣지 않는다). predev·prebuild 에서 자동 실행.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const MODEL = {
  file: "face_landmarker.task",
  url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  bytes: 3758596,
  sha256: "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
};

/** FilesetResolver.forVisionTasks 가 고르는 파일 (SIMD 지원 여부에 따라 둘 중 하나) */
export const WASM_FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

export const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "mediapipe");

export const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** 크기와 SHA-256 이 기대값과 다르면 오류. 내려받은 파일이 바뀌었거나 손상된 경우 빌드를 멈춘다. */
export function verifyModel(buf, expected = MODEL) {
  if (buf.length !== expected.bytes) {
    throw new Error(`모델 크기가 달라요: ${buf.length} 바이트 (기대값 ${expected.bytes})`);
  }
  const actual = sha256(buf);
  if (actual !== expected.sha256) {
    throw new Error(`모델 SHA-256이 달라요: ${actual} (기대값 ${expected.sha256})`);
  }
}

function copyWasm() {
  const require = createRequire(import.meta.url);
  const dir = join(OUT_DIR, "wasm");
  mkdirSync(dir, { recursive: true });
  for (const f of WASM_FILES) copyFileSync(require.resolve(`@mediapipe/tasks-vision/${f}`), join(dir, f));
}

async function ensureModel() {
  const target = join(OUT_DIR, MODEL.file);
  if (existsSync(target)) {
    try {
      verifyModel(readFileSync(target));
      return "cached";
    } catch {
      // 맞지 않으면 다시 받는다
    }
  }
  const res = await fetch(MODEL.url);
  if (!res.ok) throw new Error(`모델을 받지 못했어요: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  verifyModel(buf);
  writeFileSync(target, buf);
  return "downloaded";
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  copyWasm();
  const model = await ensureModel();
  console.log(`✓ mediapipe 준비: WASM ${WASM_FILES.length}개 복사, 모델 ${model} (SHA-256 확인)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`✗ mediapipe 준비 실패: ${e.message}`);
    process.exit(1);
  });
}
