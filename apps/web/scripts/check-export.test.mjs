import { mkdirSync, mkdtempSync, readdirSync, rmdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findDevArtifacts } from "./check-export.mjs";

// Windows + 한글 경로(예: 사용자 폴더가 한글인 임시 폴더)에서 Node 24.10 의 rmSync(recursive) 가 비정상 종료해서
// 하나씩 지운다 (2026-10-08 확인).
function removeDir(p) {
  for (const name of readdirSync(p)) {
    const c = join(p, name);
    if (statSync(c).isDirectory()) removeDir(c);
    else unlinkSync(c);
  }
  rmdirSync(p);
}

let dir;
const make = (files) => {
  dir = mkdtempSync(join(tmpdir(), "out-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
};
afterEach(() => {
  if (dir) removeDir(dir);
  dir = undefined;
});

describe("개발용 화면이 배포본에 없는지 (결정 로그 M3-D10)", () => {
  it("일반 페이지만 있으면 통과", () => {
    expect(findDevArtifacts(make({ "index.html": "<main>home</main>", "_next/a.js": "x" }))).toEqual([]);
  });
  it("dev 경로가 있으면 잡는다", () => {
    expect(findDevArtifacts(make({ "dev/diagnosis/index.html": "<main></main>" }))).toContain("dev");
  });
  it("개발용 표시 문자열이 섞인 파일도 잡는다", () => {
    expect(findDevArtifacts(make({ "_next/chunk.js": 'x("data-dev-only")' }))).toEqual(["_next/chunk.js"]);
  });
});
