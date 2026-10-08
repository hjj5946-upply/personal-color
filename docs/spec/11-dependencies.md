# 11. 의존성 기록 (G-4, S-9)

새 패키지를 추가할 때마다 한 줄 추가: 이름 / 이유 / 라이선스(상업 이용 가능 여부).
| 패키지 | 이유 | 라이선스 |
|---|---|---|
| next, react, react-dom | 웹 프런트 (정적 내보내기) | MIT |
| typescript | 타입 검사 (**5.9.x 고정. 7.x는 M3 시작 전까지 보류**, 그때 호환 검증 후 결정. Dependabot도 메이저 업데이트 무시) | Apache-2.0 |
| vitest | core 단위 테스트, design-tokens 대비 테스트 (**5.x**. 3.x의 tinypool 취약점 해소. Node `^22.12.0` 이상 필요) | MIT |
| @types/node | Node 타입 정의 (**22.x 고정**, Node 런타임 기준과 맞춤. Dependabot 메이저 업데이트 무시) | MIT |
| @types/react, @types/react-dom | 타입 정의 | MIT |
| @mediapipe/tasks-vision (**1.1.0 고정**) | 웹: 얼굴 검출·랜드마크(Face Landmarker). 브라우저 안에서만 처리, 진단 진입 시 지연 로딩. 실행 엔진(WASM)은 빌드 때 `apps/web/public/mediapipe/`로 복사해 자체 호스팅. 사용 지표 전송은 CSP로 차단(결정 로그 M3-D1). 실행 엔진 파일과 버전을 맞추기 위해 정확한 버전으로 고정 | Apache-2.0 (상업 이용 가능) |
| (모델 파일) `face_landmarker.task` float16 v1 | 위 라이브러리가 쓰는 모델 묶음(얼굴 검출 BlazeFace + Face Mesh V2 + Blendshape V2). 저장소에 넣지 않고 **빌드 때 고정 주소에서 받아 SHA-256 검증**(결정 로그 M3-D2). 주소: `storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`, 크기 3,758,596 바이트, SHA-256 `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` | Apache-2.0 (모델 카드 3종) |

**런타임 기준:** Node `>=22.12` (루트 `package.json`의 `engines`, CI는 Node 22).

> 라이선스는 설치 시점 기준으로 `npm view <pkg> license`로 재확인한다.
