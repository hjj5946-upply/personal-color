# 13. 미정·확인필요 목록 (15)

| 구분 | 항목 | 확정 시점 |
|---|---|---|
| 서비스 | 영문 표기·태그라인 최종 확정, 이름 중복 확인 | 확정은 기획자 수정 시, 중복 확인은 3단계 전 |
| 진단 | 16톤 경계값, 품질 검사 수치, 신뢰도 계산식, 입력 이미지 축소 상한 | 구현 중 샘플 + 지인 피드백 튜닝 |
| 진단 | **16톤 → 12톤 대응표** (`ColorProfile.tone12`를 채우는 규칙. 01·02는 "파생"이라고만 함) | **M3 전 결정 필요** (별도 기획 회의) |
| 진단 | **대비(contrast)의 용도**: 16톤 판정에 쓰는지, 기록·설명용인지 (16톤 격자는 웜/쿨×명도×채도만 사용) | **M3 전 결정 필요** (별도 기획 회의) |
| 진단 | 특징값 임시 정의(02 "특징값 정의") 재검토 | M3 후 |
| 진단 | **품질 측정값의 단위·측정 방법**, 각 항목의 하한·상한(숫자 또는 사용 안 함), 경고 기준을 켤 항목, 밝기·색 편향·선명도·보정 의심의 `dependsOnFace`(얼굴 영역에서 재는지), 촬영/업로드 기준 분리 여부 | M3 (샘플 사진) |
| 진단 | 튜닝용 정답 샘플 확보 계획 (인원·대상, 전문가 진단 경험자 수 미확인). 보관 규칙은 확정(결정 로그 M3-D8) | **M3-3 전 기획자 결정** (M3-D7) |
| 진단 | 정확도 관문 통과 기준 (웜/쿨·4계절·16톤 1순위/2순위별 기준, 최소 샘플 수) | **샘플 수집 전 기획자 결정** (M3-D9) |
| 진단 | 입력 이미지 축소 상한 | M3-1 실측 후 제안 (M3-D6) |
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
| 2026-10-08 | 얼굴 랜드마크: MediaPipe 라이선스 | 라이브러리 `@mediapipe/tasks-vision` 1.1.0: **Apache-2.0**. `face_landmarker.task` 안의 모델 3종(BlazeFace short-range 얼굴 검출, Face Mesh V2 랜드마크 478점(눈동자 10점 포함), Blendshape V2 표정): 모델 카드 모두 **Apache License 2.0** → **상업 이용 가능**. 모델 카드 문구: 감시·신원 인식은 범위 밖, 랜드마크는 얼굴 인식·식별을 제공하지 않고 고유 얼굴 표현을 저장하지 않음(O-2와 일치) | developers.google.com/edge/mediapipe/solutions/vision/face_landmarker, 모델 카드 PDF 3종(storage.googleapis.com/mediapipe-assets), `npm view @mediapipe/tasks-vision` | M3 후보 유지. 11-dependencies에는 도입 시 기록 |
| 2026-10-08 | MediaPipe 모델·런타임 크기 | 모델 `face_landmarker.task`(float16) **3,758,596 바이트(약 3.6MB)**: 얼굴 검출 0.23MB + 랜드마크 2.55MB + 표정 0.96MB + 기하 0.02MB. 런타임 WASM(SIMD) **12,997,248 바이트(약 12.4MB)** + JS 0.33MB + 라이브러리 0.16MB(비SIMD WASM 11.6MB 별도). 첫 로딩 합계 약 17MB, gzip 압축 시 약 7.3MB(직접 측정, 실제 서버 압축 여부는 M3에서 측정) | npm 패키지와 모델 파일을 내려받아 직접 측정 | 04 "모델 크기 [확인필요]" 해소. 진단 진입 시 지연 로딩 + 진행 표시 필수 |
| 2026-10-08 | MediaPipe 브라우저 지원 | 공식 설정 문서는 "Chrome or Safari browser"만 적고 **버전·Samsung Internet·Edge·인앱 브라우저는 언급 없음**. 기본 실행은 CPU, GPU(WebGL) 선택 가능. IMAGE 모드(사진 한 장) 지원 | developers.google.com/edge/mediapipe/solutions/setup_web, …/face_landmarker/web_js | **[확인필요] 유지** — M3에서 04의 지원 브라우저(최신 2개 버전) 실기기 확인 |
| 2026-10-08 | MediaPipe 사진 외부 전송 여부 | 공식 개인정보 고지: 입력(사진·영상)은 **기기 안에서 처리하고 Google 서버로 보내지 않는다.** **단, API 성능·사용 지표(metrics)를 Google에 보내며, 사용자 동의 확보는 개발자 책임.** 패키지 코드 확인: 작업을 만들 때 지표 기록기가 **항상** 생성되어 60초마다 `https://odml.pa.googleapis.com/v1/log`로 전송, **끄는 공개 옵션 없음**(타입 정의에 옵션 없음). 전송이 실패하면 기록기가 스스로 멈춤(코드상, 실측 필요) | developers.google.com/edge/mediapipe/solutions/tasks#mediapipe_tasks_privacy_notice, `vision_bundle.mjs` 코드 | 04 "외부 분석 도구 미사용"과 충돌 → **CSP로 차단하기로 결정**(결정 로그 M3-D1). 차단 상태 동작은 M3-1에서 실측 |
| 2026-10-08 | MediaPipe 모델 파일 호스팅 | WASM은 `FilesetResolver.forVisionTasks(경로)`, 모델은 `modelAssetPath`(또는 `modelAssetBuffer`)로 경로를 지정할 수 있음 → **우리 정적 사이트에서 직접 호스팅 가능**. 공식 예제의 기본값은 jsDelivr CDN(`@latest`)과 storage.googleapis.com | …/face_landmarker/web_js, …/setup_web, `vision.d.ts` | **자체 호스팅 결정**: WASM은 빌드 때 복사, 모델은 빌드 때 받아 SHA-256 검증(결정 로그 M3-D2) |
| 2026-10-08 | TypeScript 7.0.2 시험 | 별도 브랜치 `try/typescript-7`(main에 합치지 않음)에서 시험. web 타입 검사와 Next.js 빌드는 그대로 통과. core는 TS7이 `@types`를 자동으로 넣지 않아 테스트 파일의 `node:fs`·`URL` 타입 오류 18건 → core tsconfig에 `"types": ["node"]` 한 줄 추가 후 **Windows `npm run check` 전부 통과**(테스트 143개, 빌드 성공). 리눅스 CI는 미실행 | 로컬 실행 | 도입 여부는 기획자 결정 대기 (13 "TypeScript 7" 항목) |
