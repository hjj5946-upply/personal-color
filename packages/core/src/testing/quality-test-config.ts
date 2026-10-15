// 테스트 전용 임시 품질 기준. 실제 기준이 아니다 (실제 수치는 [미정], M3). index.ts 에서 내보내지 않는다.
import type { QualityConfigDraft } from "../quality-config";

export const TEST_QUALITY_CONFIG: QualityConfigDraft = {
  face_size: { dependsOnFace: true, onUnmeasured: "fail", fail: { min: 10, max: 90 }, warn: { min: "off", max: "off" } },
  face_angle: { dependsOnFace: true, onUnmeasured: "fail", fail: { min: -20, max: 20 }, warn: { min: "off", max: "off" } },
  brightness_dark: { dependsOnFace: true, onUnmeasured: "fail", fail: { max: 0.2 }, warn: { max: "off" } },
  brightness_bright: { dependsOnFace: true, onUnmeasured: "fail", fail: { max: 0.1 }, warn: { max: "off" } },
  color_cast: { dependsOnFace: true, onUnmeasured: "skip", fail: { min: -30, max: 30 }, warn: { min: -15, max: 15 } },
  sharpness: { dependsOnFace: true, onUnmeasured: "fail", fail: { min: 50, max: "off" }, warn: { min: "off", max: "off" } },
  filter_suspicion: { dependsOnFace: false, warn: { min: "off", max: 0.5 } },
};
