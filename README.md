# personal-color

퍼스널컬러 진단 + AI 코디 서비스 모노레포. (화면 표시용 서비스 이름은 `apps/web/src/config/service.ts`)

## 빠른 시작
```bash
npm install
npm run dev        # http://localhost:3000
npm run check      # 비밀·사진 검사 + 타입체크 + 테스트 + 빌드
```
Node 22 이상 필요.

## 구조
`apps/web` · `apps/api`(예정) · `apps/mobile`(3단계) · `packages/core` · `packages/design-tokens` · `docs/spec`

에이전트 작업 규칙은 [CLAUDE.md](./CLAUDE.md), 기획 문서는 [docs/spec](./docs/spec/README.md)를 보세요.

## GitHub Pages로 공유할 때
저장소 이름이 주소가 됩니다(`https://<계정>.github.io/<저장소이름>/`). 빌드 시 `NEXT_PUBLIC_BASE_PATH=/<저장소이름>`을 지정해야 합니다. 배포 워크플로는 M12에서 추가합니다.
