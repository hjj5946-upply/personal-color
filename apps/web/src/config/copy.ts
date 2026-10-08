// 모든 화면 문구는 이 파일(문구 파일)에서 관리한다 (7-5, G-6). 말투: "~해요" 체.
import { SERVICE_NAME } from "./service";

export const COPY = {
  home: {
    title: SERVICE_NAME.ko,
    tagline: SERVICE_NAME.tagline,
    status: "지금은 개발 초기 단계예요.",
  },
  notices: {
    reference: "참고용이며 의학적 진단이 아니에요.",
    screenColor: "화면 설정에 따라 색이 다르게 보일 수 있어요.",
  },
} as const;
