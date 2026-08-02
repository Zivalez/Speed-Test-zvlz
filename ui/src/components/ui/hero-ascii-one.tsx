import { useEffect, useRef, useState } from "react";

function coordinate(value: number | string | null | undefined, positive: string, negative: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--.----°";
  return `${Math.abs(number).toFixed(4)}° ${number >= 0 ? positive : negative}`;
}

function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const GLYPHS = ["·", ".", ":", "+", "×", "0", "/"];

function AsciiScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let resizeFrame = 0;

    function renderScene() {
      if (!canvas) return;
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);

      const context = canvas.getContext("2d");
      if (!context) return;
      const drawing = context;

      drawing.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drawing.clearRect(0, 0, width, height);
      drawing.fillStyle = "#050505";
      drawing.fillRect(0, 0, width, height);
      drawing.textAlign = "center";
      drawing.textBaseline = "middle";

      const random = seededRandom(0x5a17);
      const mobile = width < 820;
      const glyphSize = mobile ? 6 : Math.max(7, Math.min(10, width / 180));
      drawing.font = `700 ${glyphSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

      function glyph(x: number, y: number, alpha: number, index?: number) {
        if (x < 0 || y < 0 || x > width || y > height) return;
        drawing.fillStyle = `rgba(243, 234, 215, ${Math.max(0, Math.min(alpha, 0.96))})`;
        drawing.fillText(GLYPHS[index ?? Math.floor(random() * GLYPHS.length)], x, y);
      }

      function glyphLine(x1: number, y1: number, x2: number, y2: number, gap: number, alpha = 0.48) {
        const distance = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(2, Math.floor(distance / gap));
        for (let step = 0; step <= steps; step += 1) {
          const progress = step / steps;
          glyph(
            x1 + (x2 - x1) * progress + (random() - 0.5) * 2,
            y1 + (y2 - y1) * progress + (random() - 0.5) * 2,
            alpha * (0.72 + random() * 0.28),
          );
        }
      }

      function glyphArc(cx: number, cy: number, radiusX: number, radiusY: number, from = 0, to = Math.PI * 2, alpha = 0.34) {
        const length = Math.max(radiusX, radiusY) * Math.abs(to - from);
        const steps = Math.max(12, Math.floor(length / (glyphSize * 1.2)));
        for (let step = 0; step <= steps; step += 1) {
          const angle = from + (to - from) * (step / steps);
          glyph(cx + Math.cos(angle) * radiusX, cy + Math.sin(angle) * radiusY, alpha, step % GLYPHS.length);
        }
      }

      const starCount = Math.max(180, Math.floor((width * height) / (mobile ? 4200 : 3100)));
      for (let index = 0; index < starCount; index += 1) {
        const x = random() * width;
        const y = random() * height;
        const alpha = random() > 0.9 ? 0.7 : 0.18 + random() * 0.35;
        glyph(x, y, alpha, random() > 0.8 ? 4 : 0);
      }

      const sceneWidth = mobile ? width : width * 0.58;
      const boulderRadius = Math.min(sceneWidth * 0.23, height * (mobile ? 0.17 : 0.205));
      const boulderX = mobile ? width * 0.34 : sceneWidth * 0.46;
      const boulderY = mobile ? height * 0.36 : height * 0.34;

      const boulderPoints = mobile ? 1050 : 2800;
      for (let index = 0; index < boulderPoints; index += 1) {
        const angle = random() * Math.PI * 2;
        const distance = Math.sqrt(random()) * boulderRadius;
        const edge = distance / boulderRadius;
        const x = boulderX + Math.cos(angle) * distance;
        const y = boulderY + Math.sin(angle) * distance;
        const lightSide = 0.35 + Math.max(0, -Math.cos(angle)) * 0.38;
        const density = 0.26 + edge * 0.66;
        if (random() < density) glyph(x, y, lightSide * (0.45 + random() * 0.55), edge > 0.82 ? 4 : undefined);
      }

      glyphArc(boulderX, boulderY, boulderRadius, boulderRadius, 0, Math.PI * 2, 0.78);
      glyphArc(boulderX, boulderY, boulderRadius * 0.72, boulderRadius * 0.72, -0.35, Math.PI * 1.38, 0.25);
      glyphArc(boulderX, boulderY, boulderRadius * 0.42, boulderRadius * 0.93, 0.35, Math.PI * 1.8, 0.22);
      glyphLine(boulderX - boulderRadius, boulderY, boulderX + boulderRadius, boulderY, glyphSize * 1.2, 0.28);

      const shoulderX = boulderX + boulderRadius * 0.08;
      const shoulderY = boulderY + boulderRadius * 1.16;
      const headX = shoulderX + boulderRadius * 0.12;
      const headY = shoulderY - boulderRadius * 0.18;
      const hipX = shoulderX - boulderRadius * 0.22;
      const hipY = shoulderY + boulderRadius * 0.72;
      const groundY = Math.min(height - 36, hipY + boulderRadius * 0.68);

      glyphArc(headX, headY, boulderRadius * 0.12, boulderRadius * 0.14, 0, Math.PI * 2, 0.72);
      glyphArc(shoulderX - boulderRadius * 0.12, shoulderY + boulderRadius * 0.36, boulderRadius * 0.36, boulderRadius * 0.64, -0.8, Math.PI * 1.55, 0.22);
      glyphArc(hipX + boulderRadius * 0.16, hipY + boulderRadius * 0.16, boulderRadius * 0.52, boulderRadius * 0.38, 0.1, Math.PI * 1.8, 0.2);

      glyphLine(shoulderX, shoulderY, hipX, hipY, glyphSize * 0.62, 0.78);
      glyphLine(shoulderX, shoulderY, boulderX + boulderRadius * 0.52, boulderY + boulderRadius * 0.66, glyphSize * 0.58, 0.76);
      glyphLine(shoulderX - boulderRadius * 0.05, shoulderY + boulderRadius * 0.1, boulderX + boulderRadius * 0.78, boulderY + boulderRadius * 0.82, glyphSize * 0.62, 0.66);
      glyphLine(hipX, hipY, hipX - boulderRadius * 0.58, groundY, glyphSize * 0.58, 0.82);
      glyphLine(hipX, hipY, hipX + boulderRadius * 0.62, groundY, glyphSize * 0.58, 0.82);
      glyphLine(hipX - boulderRadius * 0.58, groundY, hipX - boulderRadius * 0.88, groundY, glyphSize * 0.58, 0.66);
      glyphLine(hipX + boulderRadius * 0.62, groundY, hipX + boulderRadius * 0.94, groundY, glyphSize * 0.58, 0.66);

      for (let index = 0; index < (mobile ? 360 : 780); index += 1) {
        const progress = random();
        const centerX = shoulderX + (hipX - shoulderX) * progress;
        const centerY = shoulderY + (hipY - shoulderY) * progress;
        const spread = boulderRadius * (0.08 + Math.sin(progress * Math.PI) * 0.16);
        glyph(centerX + (random() - 0.5) * spread * 2, centerY + (random() - 0.5) * spread, 0.24 + random() * 0.5);
      }

      glyphLine(Math.max(18, boulderX - boulderRadius * 1.4), groundY, Math.min(sceneWidth - 18, boulderX + boulderRadius * 1.45), groundY, glyphSize * 1.1, 0.34);
      glyphLine(boulderX + boulderRadius * 1.05, groundY - boulderRadius * 0.35, boulderX + boulderRadius * 1.36, groundY - boulderRadius * 0.35, glyphSize * 1.1, 0.24);
    }

    const scheduleRender = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(renderScene);
    };

    renderScene();
    const observer = new ResizeObserver(scheduleRender);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(resizeFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-ascii-canvas" aria-hidden="true" />;
}

export default function HeroAsciiOne() {
  const [node, setNode] = useState<ZvlzNodeInfo>(() => window.getZvlzNodeInfo?.() || {});
  const [phase, setPhase] = useState<"active" | "leaving" | "hidden">("active");

  useEffect(() => {
    const updateNode = (event: Event) => {
      const detail = (event as CustomEvent<ZvlzNodeInfo>).detail;
      setNode(detail || window.getZvlzNodeInfo?.() || {});
    };
    document.addEventListener("zvlz:node-info", updateNode);
    window.zvlzNodeInfoReady?.then(setNode);
    return () => document.removeEventListener("zvlz:node-info", updateNode);
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
        <AsciiScene />
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
        <span>SYSTEM / READY</span><span>SCENE / ASCII</span><span>V8 / ZVLZ TOKYO</span>
      </footer>
    </section>
  );
}
