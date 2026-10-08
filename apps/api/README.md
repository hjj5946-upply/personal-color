# apps/api (서버 로직 계층)

M8에서 구현. 1단계 후보: **Supabase Edge Functions** [확인필요: 공식 문서로 적합성 확인 후 확정].
여기서 하는 일: 인증 → `canUse` → 입력 검증 → 처리 (S-4), Claude API 호출(서버에서만), 사용량 기록, 예산 차단기.
판정·검증 로직은 `packages/core`를 가져다 쓴다 (O-5).
