// 샘플 사진 커밋 금지 검사 (O-1, 지침 v1.1). 실제 사진·실측 수치는 저장소 밖에서만 쓴다 (결정 로그 M3-D8).
import { walk } from "./lib.mjs";

const ALWAYS_BAD = /\.(jpe?g|heic|heif|webp|tiff?|bmp|gif)$/i;
const PNG = /\.png$/i;
const PNG_ALLOWED_PREFIX = "apps/web/public/"; // 앱 아이콘 등 정적 자산만
let bad = 0;
for (const f of walk()) {
  if (ALWAYS_BAD.test(f.rel) || (PNG.test(f.rel) && !f.rel.startsWith(PNG_ALLOWED_PREFIX))) {
    console.error(`✗ ${f.rel}: 이미지 파일은 저장소에 둘 수 없어요 (샘플 사진 금지).`);
    bad++;
  }
}
if (bad) process.exit(1);
console.log("✓ check-no-photos: 문제 없음");
