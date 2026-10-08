// 진단과 코디가 공유하는 데이터 (지침서 6-1 ColorProfile). O-5: UI·브라우저 API에 의존하지 않는다.
// O-2: 랜드마크 좌표·얼굴 특징값·이미지 데이터는 이 타입에 절대 넣지 않는다.

export type WarmCool = "warm" | "cool";
export type LightnessLevel = "light" | "mid_high" | "mid_low" | "dark"; // 밝음/중상/중하/어두움
export type ChromaLevel = "vivid" | "muted"; // 선명/탁함
export type Season4 = "spring" | "summer" | "autumn" | "winter";

export type Tone16Id = string; // 16톤 ID 목록은 tone-config 에서 관리 (이름·경계값 [미정])

export type InputType = "camera" | "upload";
export type CalibrationMode = "normal" | "precise";

export interface ColorAxes {
  warmCool: number;
  lightness: number;
  chroma: number;
  contrast: number;
}

export interface ColorProfile {
  tone16: Tone16Id;
  tone16_second: Tone16Id;
  season4: Season4;
  tone12: string;
  axes: ColorAxes;
  confidence: number; // 0~1, 계산식 [미정]
  inputType: InputType;
  qualityFlags: string[];
  calibrationMode: CalibrationMode;
  configVersion: string; // O-6
  createdAt: string; // ISO 8601
}

export interface Rgb {
  r: number; // 0~255
  g: number;
  b: number;
}

export interface Lab {
  l: number;
  a: number;
  b: number;
}
