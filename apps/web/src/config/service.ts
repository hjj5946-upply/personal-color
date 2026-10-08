// 화면에 보이는 서비스 이름은 여기서만 읽는다 (N-2). 코드·패키지·DB·환경변수에는 이름을 넣지 않는다 (N-1).
export const SERVICE_NAME = {
  ko: "퍼코디", // [확정]
  en: "Percody", // [기본값]
  tagline: "내 톤에 맞는 색, 코디까지 한 번에", // [가칭]
} as const;
