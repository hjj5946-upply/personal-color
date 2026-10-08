# 13. 미정·확인필요 목록 (15)

| 구분 | 항목 | 확정 시점 |
|---|---|---|
| 서비스 | 영문 표기·태그라인 최종 확정, 이름 중복 확인 | 확정은 기획자 수정 시, 중복 확인은 3단계 전 |
| 진단 | 16톤 경계값, 품질 검사 수치, 신뢰도 계산식, 입력 이미지 축소 상한 | 구현 중 샘플 + 지인 피드백 튜닝 |
| 진단 | **16톤 → 12톤 대응표** (`ColorProfile.tone12`를 채우는 규칙. 01·02는 "파생"이라고만 함) | **M3 전 결정 필요** (별도 기획 회의) |
| 진단 | **대비(contrast)의 용도**: 16톤 판정에 쓰는지, 기록·설명용인지 (16톤 격자는 웜/쿨×명도×채도만 사용) | **M3 전 결정 필요** (별도 기획 회의) |
| 진단 | 특징값 임시 정의(02 "특징값 정의") 재검토 | M3 후 |
| 진단 | **품질 측정값의 단위·측정 방법**, 각 항목의 하한·상한(숫자 또는 사용 안 함), 경고 기준을 켤 항목, 밝기·색 편향·선명도·보정 의심의 `dependsOnFace`(얼굴 영역에서 재는지), 촬영/업로드 기준 분리 여부 | M3 (샘플 사진) |
| 진단 | 튜닝용 정답 샘플 확보 계획 (전문가 진단 경험자 수 미확인) | M3 이후 |
| 진단 | 사진 N일 보관 | 법무 검토 후 |
| 가상 피팅 | 업체 선정, 해상도·고품질 엔드포인트 가격, 업체 데이터 정책 | 2-2단계 착수 시 비교 테스트 |
| 가상 피팅 | 실시간 방식 | 4단계 전 시험 제작 |
| 운영 | 월 예산 상한 숫자, 백업 보관 개수 N, 크레딧 비용 숫자 | 설정값 |
| 기술 | 서버 계층(Edge Functions) 적합성, 네이버 로그인 연동, 앱에서의 얼굴 추출, 인앱 브라우저 동작, 모델 파일 크기, 색공간 처리 | 구현 시 공식 문서·실기기 확인 |
| 기술 | Next.js 16 + TypeScript 7 호환성 (TS 5.9로 고정, 보류 중. 결정 시 `.github/dependabot.yml`의 typescript 무시 규칙도 정리) | **M3 시작 전** 검증 후 결정 |
| 호스팅 | 수익화 이후 호스팅 | 3단계 전 |
| 결제 | PG·스토어 정책·수수료 | 3단계 착수 시 |
| 법무 | 전문가 검토, 국외이전 요건, 거래 기록 보관 기간, 제휴 표시 기준, 통신판매업·업종, 최신 개인정보 개정 반영 | 3단계 전 |
| 운영 | 서비스 전용 이메일 | 1단계 공개 전 |
| 디자인 | Figma 시안 | 지침서 확정 후, 기획자 요청 시 |

## 확인 기록 (G-8: [확인필요]를 공식 문서로 확인한 결과)

| 날짜 | 항목 | 확인 결과 | 출처 | 반영 |
|---|---|---|---|---|
| 2026-10-08 | Supabase API 키 형식 | 새 키: 공개용 `sb_publishable_…`(브라우저·소스 코드에 노출 가능), 비밀용 `sb_secret_…`(RLS 우회, 백엔드 전용, 소스 관리 금지). 새 키는 JWT가 아닌 짧은 문자열. 기존 `anon`/`service_role`은 `eyJ…`로 시작하는 JWT이며 **2026년 말까지 폐지 예정**(새 키를 만들어도 대시보드에서 끄기 전까지 유효) | supabase.com/docs/guides/api/api-keys | `check-secrets`에 `sb_secret_` 패턴 추가, JWT 패턴 유지, `…SERVICE_ROLE…=값` 같은 변수 대입 탐지 보강. M6에서 새 키(`sb_publishable_`)를 쓰고 `.env.example` 이름도 그때 정리 |
| 2026-10-08 | Next.js 에이전트 파일 자동 생성 끄기 | Next.js 16.3부터 `next dev`가 AI 에이전트를 감지하면 `AGENTS.md`·`CLAUDE.md`를 만든다. `next.config`의 `agentRules: false`로 끈다(기본값 true) | Next.js 16.3.8 동봉 공식 문서 `node_modules/next/dist/docs/01-app/02-guides/ai-agents.md` "Opting out", `config-shared.d.ts` | `apps/web/next.config.mjs`에 `agentRules: false` |
| 2026-10-08 | Dependabot 메이저 업데이트 무시 문법 | `ignore` → `dependency-name` + `update-types: ["version-update:semver-major"]` | docs.github.com Dependabot options reference | `.github/dependabot.yml` |
| 2026-10-08 | vitest 5 요구 사항 | 라이선스 MIT, Node `^22.12.0 \|\| ^24 \|\| >=26` | `npm view vitest@5` | `engines.node >=22.12` |
