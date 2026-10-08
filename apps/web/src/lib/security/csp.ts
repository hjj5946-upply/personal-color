// 보안 설정(CSP). 결정 로그 M3-D1: MediaPipe 사용 지표 전송 등 외부로 나가는 연결을 막는다.
// connect-src 'self': fetch·XHR·WebSocket 은 우리 사이트로만. 모델·WASM 도 자체 호스팅이라 이것으로 충분하다.
// M6(Supabase) 등 외부 서버를 붙일 때는 여기에 주소를 명시적으로 추가하고 결정 로그에 남긴다.
export const CONTENT_SECURITY_POLICY = "connect-src 'self'";
