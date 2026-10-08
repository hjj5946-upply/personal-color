# 11. 의존성 기록 (G-4, S-9)

새 패키지를 추가할 때마다 한 줄 추가: 이름 / 이유 / 라이선스(상업 이용 가능 여부).
| 패키지 | 이유 | 라이선스 |
|---|---|---|
| next, react, react-dom | 웹 프런트 (정적 내보내기) | MIT |
| typescript | 타입 검사 (**5.9.x 고정. 7.x는 M3 시작 전까지 보류**, 그때 호환 검증 후 결정. Dependabot도 메이저 업데이트 무시) | Apache-2.0 |
| vitest | core 단위 테스트 (**5.x**. 3.x의 tinypool 취약점 해소. Node `^22.12.0` 이상 필요) | MIT |
| @types/node | Node 타입 정의 (**22.x 고정**, Node 런타임 기준과 맞춤. Dependabot 메이저 업데이트 무시) | MIT |
| @types/react, @types/react-dom | 타입 정의 | MIT |

**런타임 기준:** Node `>=22.12` (루트 `package.json`의 `engines`, CI는 Node 22).

> 라이선스는 설치 시점 기준으로 `npm view <pkg> license`로 재확인한다.
