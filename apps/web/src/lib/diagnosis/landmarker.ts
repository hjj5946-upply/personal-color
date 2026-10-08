// MediaPipe Face Landmarker 지연 로딩 (04: 홈 화면은 모델을 로드하지 않고, 진단 진입 시 로딩).
// 실행 엔진·모델은 우리 사이트(public/mediapipe)에서 받는다 (자체 호스팅, 결정 로그 M3-D2).
// 사진은 브라우저 안에서만 처리된다. 사용 지표 전송은 CSP로 차단 (M3-D1).
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const MEDIAPIPE_WASM_PATH = `${BASE}/mediapipe/wasm`;
export const MEDIAPIPE_MODEL_PATH = `${BASE}/mediapipe/face_landmarker.task`;

let loading: Promise<FaceLandmarker> | null = null;

/** 처음 부를 때만 라이브러리·실행 엔진·모델을 받는다. 실패하면 다음 호출에서 다시 시도한다. */
export function loadFaceLandmarker(): Promise<FaceLandmarker> {
  loading ??= (async () => {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
    return FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MEDIAPIPE_MODEL_PATH, delegate: "CPU" },
      runningMode: "IMAGE",
      // 2명까지 찾아야 "2명 이상(face_multiple)"을 알 수 있다
      numFaces: 2,
      outputFaceBlendshapes: false,
      // 얼굴 각도(faceAngle) 계산용
      outputFacialTransformationMatrixes: true,
    });
  })().catch((e: unknown) => {
    loading = null;
    throw e;
  });
  return loading;
}
