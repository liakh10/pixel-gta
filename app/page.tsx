"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GAME_CONFIG, X_URL, CA, TICKER } from "./config";

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const bgRef = useRef<HTMLCanvasElement>(null);
  const [blink, setBlink] = useState(true);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 600);
    return () => clearInterval(t);
  }, []);

  // Animated top-down neon-city attract background
  useEffect(() => {
    const canvas = bgRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const GRID = 90;
    interface Car { x: number; y: number; vx: number; vy: number; c: string; }
    const cars: Car[] = [];
    const colors = ["#ff4d6d", "#4dd2ff", "#ffd24d", "#7CFC6B", "#b66dff", "#ff924d"];

    function resize() { canvas!.width = window.innerWidth; canvas!.height = window.innerHeight; }
    resize();
    window.addEventListener("resize", resize);

    function laneCoord(v: number) { return Math.round(v / GRID) * GRID + GRID / 2; }
    for (let i = 0; i < 40; i++) {
      const horiz = Math.random() < 0.5;
      const sp = (40 + Math.random() * 60) * (Math.random() < 0.5 ? 1 : -1);
      cars.push(horiz
        ? { x: Math.random() * window.innerWidth, y: laneCoord(Math.random() * window.innerHeight), vx: sp, vy: 0, c: colors[i % colors.length] }
        : { x: laneCoord(Math.random() * window.innerWidth), y: Math.random() * window.innerHeight, vx: 0, vy: sp, c: colors[i % colors.length] });
    }

    let last = performance.now();
    function draw() {
      const now = performance.now(); const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const W = canvas!.width, H = canvas!.height;
      ctx.fillStyle = "#05060d"; ctx.fillRect(0, 0, W, H);

      // streets grid
      ctx.lineWidth = GRID * 0.42;
      ctx.strokeStyle = "#0c0f1a";
      for (let x = GRID / 2; x < W; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = GRID / 2; y < H; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // lane dashes
      ctx.strokeStyle = "rgba(240,210,80,0.12)"; ctx.lineWidth = 1; ctx.setLineDash([8, 12]);
      for (let x = GRID / 2; x < W; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = GRID / 2; y < H; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.setLineDash([]);

      // cars
      for (const c of cars) {
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.x < -20) c.x = W + 20; if (c.x > W + 20) c.x = -20;
        if (c.y < -20) c.y = H + 20; if (c.y > H + 20) c.y = -20;
        ctx.shadowColor = c.c; ctx.shadowBlur = 12;
        ctx.fillStyle = c.c;
        const w = c.vx !== 0 ? 12 : 6, h = c.vx !== 0 ? 6 : 12;
        ctx.fillRect(c.x - w / 2, c.y - h / 2, w, h);
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <main className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center">
      <canvas ref={bgRef} className="absolute inset-0 z-0" />
      <div className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 42%, rgba(8,10,24,0.1) 20%, rgba(4,5,13,0.86) 100%)" }} />
      <div className="absolute inset-0 z-[2] pointer-events-none"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.10) 3px, rgba(0,0,0,0.10) 4px)" }} />

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 w-full max-w-md">
        {/* logo */}
        <div className="text-center select-none">
          <div className="text-3xl md:text-4xl font-bold leading-none animate-float"
            style={{ color: "#4dd2ff", ["--gc" as string]: "#4dd2ff", textShadow: "0 0 18px #4dd2ff, 0 0 44px #4dd2ff66, 3px 3px 0 #06223a" }}>
            PIXEL
          </div>
          <div className="text-2xl md:text-3xl font-bold leading-none mt-2 neon"
            style={{ color: "#ff4d6d", ["--gc" as string]: "#ff4d6d" }}>
            GRAND THEFT
          </div>
          <div className="text-4xl md:text-5xl font-bold leading-none mt-1"
            style={{ color: "#FFD23D", textShadow: "0 0 22px #FFD23D, 0 0 60px #ffae3355, 4px 4px 0 #5a3000" }}>
            AUTO
          </div>
        </div>

        <button
          onClick={() => router.push("/play")}
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
          className="px-14 py-4 text-base font-bold text-black cursor-pointer active:scale-95 transition-all mt-1"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            background: hover ? "linear-gradient(180deg,#FFE07A,#FFB300)" : "linear-gradient(180deg,#FFD24D,#FFA800)",
            border: "3px solid #7a4d00",
            boxShadow: hover ? "0 0 40px #FFB30099, 5px 5px 0 #5a3000" : "0 0 24px #FFB30055, 5px 5px 0 #5a3000",
            transform: hover ? "translateY(-2px)" : "none",
          }}>
          ENTER
        </button>

        <div className="text-[9px] tracking-[0.3em] text-[#ff4d6d]/80" style={{ opacity: blink ? 1 : 0.4, transition: "opacity 0.2s" }}>
          STEAL • DRIVE • EARN
        </div>

        <button
          onClick={() => { if (connected && publicKey) router.push("/play"); else setVisible(true); }}
          className="text-[9px] px-5 py-2 cursor-pointer transition-all hover:opacity-80"
          style={{ color: connected ? "#fff" : "#9945FF", background: connected ? "linear-gradient(90deg,#7b2fff,#9945FF)" : "transparent", border: "2px solid #9945FF" }}>
          {connected ? `✓ ${publicKey?.toBase58().slice(0, 4)}…${publicKey?.toBase58().slice(-4)}` : "◈ CONNECT WALLET"}
        </button>

        <div className="flex flex-col items-center gap-3 mt-1">
          <div className="text-lg" style={{ color: "#FFD23D", textShadow: "0 0 14px #FFB30066" }}>{TICKER}</div>
          <CADisplay />
          <a href={X_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 transition-all hover:opacity-80 cursor-pointer"
            style={{ fontSize: 9, color: "#9aa3b2", textDecoration: "none" }}>
            <XIcon /><span>FOLLOW ON X</span>
          </a>
          <div className="text-[8px] text-gray-700 text-center">{GAME_CONFIG.subtitle} • {GAME_CONFIG.network}</div>
        </div>
      </div>
    </main>
  );
}

function CADisplay() {
  const [copied, setCopied] = useState(false);
  const isReal = CA !== "SOON" && CA !== "";
  function copy() {
    if (!isReal) return;
    navigator.clipboard.writeText(CA); setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="text-center">
      <span className="text-[7px] text-gray-700">CA: </span>
      <span onClick={copy}
        className={isReal ? "text-[7px] cursor-pointer transition-opacity hover:opacity-70" : "text-[7px]"}
        style={{ color: copied ? "#FFD700" : isReal ? "#44AA44" : "#666622" }}
        title={isReal ? "Click to copy" : undefined}>
        {copied ? "COPIED!" : CA}
      </span>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
