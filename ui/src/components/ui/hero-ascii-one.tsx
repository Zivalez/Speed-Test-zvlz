import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

const SCENE_URL = "https://prod.spline.design/leR0WNBjCThoufYU/scene.splinecode";

class SplineBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function coordinate(value: number | string | null | undefined, positive: string, negative: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--.----°";
  return `${Math.abs(number).toFixed(4)}° ${number >= 0 ? positive : negative}`;
}

function AsciiField() {
  const rows = useMemo(() => Array.from({ length: 22 }, (_, row) => {
    const pattern = row % 4 === 0 ? "ZVLZ::01  /  +  .  " : row % 3 === 0 ? "001101  ·  /  " : ".  +  ::  ";
    return pattern.repeat(12);
  }), []);

  return <pre className="hero-ascii-field" aria-hidden="true">{rows.join("\n")}</pre>;
}

export default function HeroAsciiOne() {
  const [node, setNode] = useState<ZvlzNodeInfo>(() => window.getZvlzNodeInfo?.() || {});
  const [phase, setPhase] = useState<"active" | "leaving" | "hidden">("active");
  const [sceneReady, setSceneReady] = useState(false);
  const [showSpline, setShowSpline] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    const sync = () => setShowSpline(media.matches);
    sync();
    media.addEventListener("change", sync);

    const updateNode = (event: Event) => {
      const detail = (event as CustomEvent<ZvlzNodeInfo>).detail;
      setNode(detail || window.getZvlzNodeInfo?.() || {});
    };
    document.addEventListener("zvlz:node-info", updateNode);
    window.zvlzNodeInfoReady?.then(setNode);

    return () => {
      media.removeEventListener("change", sync);
      document.removeEventListener("zvlz:node-info", updateNode);
    };
  }, []);

  if (phase === "hidden") return null;

  const city = String(node.city || "AUTO NODE").toLocaleUpperCase("en-US");
  const country = String(node.country_code || node.country || "LOCATING").toLocaleUpperCase("en-US");
  const provider = String(node.isp || "NETWORK PROVIDER").toLocaleUpperCase("en-US");

  function startSpeedTest() {
    if (phase !== "active") return;
    setPhase("leaving");
    const trigger = document.getElementById("startButtonDesk") || document.getElementById("startButtonMob");
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    window.setTimeout(() => setPhase("hidden"), 520);
  }

  function openPacketLoss() {
    window.zvlzSfx?.play("select");
    setPhase("leaving");
    window.setTimeout(() => window.location.assign("/packet-loss/"), 220);
  }

  return (
    <section className={`hero-ascii-one hero-phase-${phase}`} aria-label="ZVLZ network test introduction">
      <div className="hero-visual" aria-hidden="true">
        <AsciiField />
        {showSpline && (
          <div className={`hero-spline ${sceneReady ? "is-ready" : ""}`}>
            <SplineBoundary onFailure={() => setShowSpline(false)}>
              <Suspense fallback={null}>
                <Spline scene={SCENE_URL} onLoad={() => setSceneReady(true)} renderOnDemand />
              </Suspense>
            </SplineBoundary>
          </div>
        )}
        <span className="hero-visual-index">OBJECT / NETWORK ROUTE / 01</span>
      </div>

      <header className="hero-header">
        <a className="hero-brand" href="/" aria-label="ZVLZ Tokyo home">
          <span className="hero-brand-mark">Z</span>
          <span><strong>ZVLZ TOKYO</strong><small>NETWORK MEASUREMENT</small></span>
        </a>
        <div className="hero-coordinates" aria-label="Active node coordinates">
          <span>LAT {coordinate(node.latitude, "N", "S")}</span>
          <span>LON {coordinate(node.longitude, "E", "W")}</span>
        </div>
        <button className="hero-sfx sound-control" type="button" onClick={() => window.toggleZvlzSound?.()}>
          <span className="sound-status">SFX ON</span>
        </button>
      </header>

      <main className="hero-content">
        <div className="hero-copy-block t-stagger is-shown">
          <div className="hero-rule t-stagger-line"><span>01</span><i></i><span>{city} / {country}</span></div>
          <p className="hero-kicker t-stagger-line t-stagger-line--2">SELF-HOSTED NETWORK BENCHMARK</p>
          <h1 className="t-stagger-line t-stagger-line--3">
            MEASURE THE ROUTE.<br /><em>NOT THE PROMISE.</em>
          </h1>
          <p className="hero-description t-stagger-line t-stagger-line--4">
            A direct browser-to-server pass for latency, jitter, download, upload, and UDP packet quality.
          </p>
          <div className="hero-actions t-stagger-line t-stagger-line--5">
            <button className="hero-primary" type="button" onClick={startSpeedTest}>
              <span>START SPEED TEST</span><small>PING · DOWNLOAD · UPLOAD</small>
            </button>
            <button className="hero-secondary" type="button" onClick={openPacketLoss}>
              <span>PACKET LOSS TEST</span><small>UDP · WEBRTC · JITTER</small>
            </button>
          </div>
          <div className="hero-node-line t-stagger-line t-stagger-line--6">
            <span>ACTIVE NODE</span><strong>{city}</strong><span>{provider}</span>
          </div>
        </div>
      </main>

      <footer className="hero-footer">
        <span>SYSTEM / READY</span><span>SCENE / {showSpline ? (sceneReady ? "LOADED" : "LOADING") : "ASCII"}</span><span>V7 / ZVLZ TOKYO</span>
      </footer>
    </section>
  );
}
