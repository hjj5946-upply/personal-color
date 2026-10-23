"use client";
// 개발용 확인 화면 (M3-1a, M3-1b 품질 측정값·축소 상한 후보, M3-2 조명 보정·특징값·판정 미리보기). next dev 에서만 페이지가 된다 (next.config pageExtensions, 결정 로그 M3-D10).
// 사진은 이 브라우저 안에서만 처리하고, 결과(색 값·숫자)만 화면에 보여준다. 콘솔에 사진·좌표를 남기지 않는다(S-8).
import { useEffect, useRef, useState } from "react";
import {
  computeFeatures,
  correctSample,
  grayWorldGains,
  judgeTone,
  skinSpread,
  type ColorAxes,
  type ColorSample,
  type Rgb,
} from "@personal-color/core";
import { DEV_COPY as T } from "@/config/dev-copy";
import { ExtractionCancelled, extractFromPhoto, type ExtractionResult } from "@/lib/diagnosis/extract";
import { loadFaceLandmarker } from "@/lib/diagnosis/landmarker";

interface Violation {
  directive: string;
  host: string;
}

/** securitypolicyviolation 이벤트로 CSP 가 막은 요청을 센다 (주소는 호스트만 표시) */
function useCspViolations(): Violation[] {
  const [list, setList] = useState<Violation[]>([]);
  useEffect(() => {
    const onViolation = (e: SecurityPolicyViolationEvent) => {
      let host = e.blockedURI;
      try {
        host = new URL(e.blockedURI).host;
      } catch {
        // "inline" 같은 값은 그대로
      }
      setList((prev) => [...prev, { directive: e.effectiveDirective, host }]);
    };
    document.addEventListener("securitypolicyviolation", onViolation);
    return () => document.removeEventListener("securitypolicyviolation", onViolation);
  }, []);
  return list;
}

/** 축소 상한 후보 (M3-1b 실측). 0 = 원본 크기 */
const SIDES = [0, 2048, 1600, 1280, 1024, 768, 512] as const;
const hex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

export default function DevDiagnosisPage() {
  const violations = useCspViolations();
  const [file, setFile] = useState<File | null>(null);
  const [maxSide, setMaxSide] = useState<number>(0);
  const [status, setStatus] = useState<string>(T.status.idle);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const preload = async () => {
    setStatus(T.status.loading);
    try {
      await loadFaceLandmarker();
      setStatus(T.status.ready);
    } catch (e) {
      setStatus(`${T.status.failed}: ${(e as Error).name}`);
    }
  };

  const run = async () => {
    if (!file) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setResult(null);
    setStatus(T.status.running);
    try {
      const r = await extractFromPhoto(file, { maxLongSide: maxSide, signal: ac.signal });
      setResult(r);
      setStatus(T.status.done);
    } catch (e) {
      setStatus(e instanceof ExtractionCancelled ? T.status.cancelled : `${T.status.failed}: ${(e as Error).message}`);
    }
  };

  const hosts = [...new Set(violations.map((v) => `${v.host} (${v.directive})`))];

  return (
    <main data-dev-only="true">
      <h1>{T.title}</h1>
      <p className="sub">{T.notice}</p>

      <section className="card" aria-live="polite">
        <strong>{T.csp.label}: </strong>
        <span data-testid="csp-count">{violations.length}</span>
        <p className="sub">{T.csp.help}</p>
        <ul data-testid="csp-hosts">{hosts.length ? hosts.map((h) => <li key={h}>{h}</li>) : <li>{T.csp.none}</li>}</ul>
      </section>

      <section className="card">
        <p>
          <button type="button" onClick={preload}>
            {T.preload}
          </button>
        </p>
        <p>
          <label>
            {T.file}{" "}
            <input
              data-testid="file"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </p>
        <p>
          <label>
            {T.maxSide}{" "}
            <select data-testid="max-side" value={maxSide} onChange={(e) => setMaxSide(Number(e.target.value))}>
              {SIDES.map((s) => (
                <option key={s} value={s}>
                  {s === 0 ? T.maxSideNone : s}
                </option>
              ))}
            </select>
          </label>
        </p>
        <p>
          <button type="button" data-testid="run" onClick={run} disabled={!file}>
            {T.run}
          </button>{" "}
          <button type="button" onClick={() => abortRef.current?.abort()}>
            {T.cancel}
          </button>
        </p>
        <p data-testid="status">{status}</p>
      </section>

      {result && (
        <section className="card color-stage">
          <h2>{T.result.timings}</h2>
          <pre data-testid="timings">{JSON.stringify(roundAll(result.timings), null, 1)}</pre>
          <h2>{T.result.size}</h2>
          <pre data-testid="size">{JSON.stringify(result.size)}</pre>
          <h2>{T.result.measurements}</h2>
          <pre data-testid="measurements">{JSON.stringify(roundAll(result.measurements), null, 1)}</pre>
          <ul>
            {T.result.unmeasured.map(([key, label]) =>
              key in result.measurements ? null : <li key={key}>{label}</li>,
            )}
          </ul>
          <h2>{T.result.sample}</h2>
          {result.sample ? (
            (["skin", "hair", "iris"] as const).map((k) => (
              <div key={k}>
                <strong>{T.result.regions[k]}</strong>
                {(result.sample?.[k] ?? []).map((c, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                    <span aria-hidden style={{ width: 24, height: 24, background: hex(c), border: "1px solid #ccc" }} />
                    {hex(c)}
                  </span>
                ))}
              </div>
            ))
          ) : (
            <p>{T.result.noSample}</p>
          )}
          <pre data-testid="sample">{JSON.stringify(result.sample)}</pre>
        </section>
      )}

      {result?.sample && <PipelinePreview sample={result.sample} result={result} />}
    </main>
  );
}

/** 두 보정 방식의 특징값을 나란히. 판정은 실제 설정(경계값 [미정])으로 시도하므로 지금은 "미설정"이 정상 */
function PipelinePreview({ sample, result }: { sample: ColorSample; result: ExtractionResult }) {
  const P = T.result.pipeline;
  const gains = result.lighting ? grayWorldGains(result.lighting) : undefined;
  const columns: [string, ColorSample | null][] = [
    [P.none, sample],
    [P.grayWorld, gains ? correctSample(sample, gains) : null],
  ];
  const spread = skinSpread(sample);
  return (
    <section className="card color-stage" data-testid="pipeline">
      <h2>{P.title}</h2>
      <h3>{P.reference}</h3>
      {result.lighting ? (
        <pre data-testid="lighting-reference">
          {JSON.stringify({ ...roundAll(result.lighting.linearMean), areaRatio: round5(result.lighting.areaRatio) })}
        </pre>
      ) : (
        <p>{P.noReference}</p>
      )}
      <p>
        {P.gains}: {gains ? JSON.stringify(roundAll(gains)) : P.noGains}
      </p>
      {columns.map(([label, s]) => (
        <div key={label}>
          <h3>{label}</h3>
          {s ? <AxesAndJudge axes={computeFeatures(s).axes} /> : <p>{P.noGains}</p>}
        </div>
      ))}
      <p data-testid="skin-spread">
        {P.spread}: {spread === null ? P.spreadNone : round5(spread)}
      </p>
    </section>
  );
}

function AxesAndJudge({ axes }: { axes: ColorAxes }) {
  const P = T.result.pipeline;
  let judge: string;
  try {
    const j = judgeTone(axes);
    judge = `${j.tone16} / ${j.tone16Second}`;
  } catch (e) {
    judge = `${P.notSet}: ${(e as Error).message}`;
  }
  return (
    <>
      <p>{P.axes}</p>
      <pre>{JSON.stringify({ ...roundAll({ ...axes, contrast: axes.contrast ?? 0 }), contrast: axes.contrast && round5(axes.contrast) })}</pre>
      <p>
        {P.judge}: {judge}
      </p>
    </>
  );
}

const round5 = (v: number) => Math.round(v * 1e5) / 1e5;

function roundAll<T extends object>(o: T): Record<string, number> {
  // 비율(0~1) 측정값이 작아도 보이도록 소수 다섯째 자리까지
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round((v as number) * 1e5) / 1e5]));
}
