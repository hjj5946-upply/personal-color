# 11. 의존성 기록 (G-4, S-9)

새 패키지를 추가할 때마다 한 줄 추가: 이름 / 이유 / 라이선스(상업 이용 가능 여부).
| 패키지 | 이유 | 라이선스 |
|---|---|---|
| next, react, react-dom | 웹 프런트 (정적 내보내기) | MIT |
| typescript | 타입 검사 (뼈대는 5.9.x로 고정. 7.x는 호환 검증 후 도입) | Apache-2.0 |
| vitest | core 단위 테스트 | MIT |
| @types/node, @types/react, @types/react-dom | 타입 정의 | MIT |

> 라이선스는 설치 시점 기준으로 `npm view <pkg> license`로 재확인한다.
