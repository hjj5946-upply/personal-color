import { TONES_16 } from "@personal-color/core";
import { COPY } from "@/config/copy";

export default function HomePage() {
  return (
    <main>
      <h1>{COPY.home.title}</h1>
      <p className="sub">{COPY.home.tagline}</p>
      <section className="card">
        <p>{COPY.home.status}</p>
        <p className="sub">core 연결 확인: 16톤 중 {TONES_16.length}개 로드됨</p>
      </section>
      <p className="sub">{COPY.notices.reference}</p>
    </main>
  );
}
