// 개발용 확인 화면 문구 (next dev 에서만 보임, 배포에 포함되지 않음 — 결정 로그 M3-D10). G-6: 문구는 설정 파일에서 관리.
export const DEV_COPY = {
  title: "개발용: 얼굴 영역 추출 확인",
  notice: "이 화면은 개발 서버에서만 보여요. 배포본에는 포함되지 않아요. 사진은 이 브라우저 안에서만 처리돼요.",
  csp: {
    label: "보안 설정(CSP)이 차단한 요청 수",
    help: "외부로 나가려다 막힌 요청이에요. MediaPipe 사용 지표는 모델을 불러온 뒤 약 60초마다 시도돼요.",
    none: "아직 없어요",
  },
  preload: "모델 미리 불러오기",
  file: "사진 선택",
  maxSide: "긴 변 상한(px)",
  maxSideNone: "원본 크기",
  run: "추출하기",
  cancel: "취소",
  status: {
    idle: "사진을 선택해 주세요.",
    loading: "모델을 불러오는 중이에요…",
    ready: "모델을 불러왔어요.",
    running: "추출 중이에요…",
    done: "추출이 끝났어요.",
    cancelled: "취소했어요.",
    failed: "실패했어요",
  },
  result: {
    timings: "걸린 시간(ms)",
    size: "분석 크기",
    measurements: "측정값",
    sample: "ColorSample",
    noSample: "샘플 없음 (얼굴이 정확히 1명이 아니거나 피부를 뽑지 못했어요)",
    regions: { skin: "피부", hair: "머리카락", iris: "눈동자" },
  },
} as const;
