# 10. M0 완료 기준 — **완료 (2026-10-08, 기획자 승인, 결정 로그 M0-완료)**

아래 10개 기준을 모두 확인했고 기획자가 M0 완료를 승인했다.

| # | 기준 | 확인 방법 | 결과 |
|---|---|---|---|
| 1 | `npm install` 후 `npm run check`가 오류 없이 통과 | **Windows 로컬 + 리눅스 CI 둘 다** | ✅ Windows 로컬·새 복제본, 리눅스 CI(커밋 `8f5a673`) |
| 2 | `npm run dev`로 홈 화면(서비스 이름·태그라인·"참고용" 문구)이 보임 | 브라우저 | ✅ |
| 3 | 정적 내보내기 빌드 성공 (`apps/web/out`), API Routes 없음 | `npm run build` | ✅ |
| 4 | `noindex` 메타 + `robots.txt`(Disallow) 적용 | 빌드 결과 확인 | ✅ |
| 5 | 서비스 이름이 `config/service.ts` 한 곳에만 있고 코드·패키지명에는 없음 (N-1, N-2) | 검색 | ✅ |
| 6 | `.env` 파일·비밀 패턴이 있으면 `check:secrets`가 실패 | 테스트 파일로 확인 | ✅ |
| 7 | JPG/HEIC 등 사진 파일을 넣으면 `check:photos`가 실패하고 `.gitignore`가 막음 | 테스트 파일로 확인 | ✅ |
| 8 | 디자인 토큰 JSON → CSS 변수 생성, 웹에서 사용 | `npm run tokens` | ✅ |
| 9 | CI 워크플로가 GitHub에서 통과 | push 후 확인 | ✅ (커밋 `8f5a673`) |
| 10 | GitHub 저장소 설정: Secret scanning·Push protection·Dependabot 알림 ON (S-2) | 저장소 Settings (기획자 수동) | ✅ 기획자 확인 (2026-10-08) |

**남은 기획자 수동 작업 (M0 범위 밖):** 저장소 이름 확정(N-4, 지인 공유 전), 문의용 이메일 준비(공개 전).
