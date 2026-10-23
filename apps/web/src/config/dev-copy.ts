// 개발용 확인 화면 문구 (next dev 에서만 보임, 배포에 포함되지 않음 — 결정 로그 M3-D10). G-6: 문구는 설정 파일에서 관리.
export const DEV_COPY = {
  title: "개발용: 얼굴 영역 추출·품질 측정값 확인",
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
    /** M3-2: 조명 보정·특징값·판정 미리보기 */
    pipeline: {
      title: "조명 보정과 특징값 (M3-2)",
      reference: "조명 기준 통계 (얼굴·목 밖, 선형 평균·영역 비율)",
      noReference: "기준 통계를 재지 못했어요 → 회색 세계 가정이면 \"보정 안 함\"으로 대체돼요 (lighting_fallback)",
      none: "보정 안 함",
      grayWorld: "회색 세계 가정 (참고값: 한도·최소 영역 검사 전, 설정 [미정])",
      gains: "배율 (선형)",
      noGains: "배율을 계산할 수 없어요",
      axes: "특징값 (웜/쿨 h°, 명도 L*, 채도 C*, 대비 |ΔL*|)",
      spread: "피부 영역 간 최대 ΔE2000 (신뢰도 ⑤ 영역 간 일관성)",
      spreadNone: "피부 영역이 1개라 확인할 수 없어요",
      judge: "16톤 판정",
      notSet: "미설정",
    },
    /** 측정값에 없을 때 보여줄 설명 (판정에서는 건너뜀 또는 실패) */
    unmeasured: [
      ["colorCast", "색 편향: 기준 픽셀(얼굴 밖의 밝은 무채색)이 부족해 재지 못했어요 → 판정에서 건너뜀"],
      ["filterSuspicion", "보정·필터 의심: 측정 방법이 아직 없어 재지 않아요 → 판정에서 건너뜀"],
    ] as const,
  },
} as const;
