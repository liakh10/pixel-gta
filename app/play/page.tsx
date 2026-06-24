"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameHandle, HudState } from "./engine/game";

const EMPTY: HudState = {
  cash: 0, hp: 100, maxHp: 100, armor: 0, maxArmor: 0, wanted: 0,
  inCar: false, weapon: "FISTS", ammo: 0, missionText: null, missionTime: 0,
  shop: null, prompt: null, gameOver: null, carHp: 0,
};

const TIPS = [
  "Press F next to any car to jack it.",
  "Jobs pay big — chase the gold $ markers.",
  "Heat rising? Lose the cops to drop your stars.",
  "Spend $PIXELGTA at shops for guns, armor & speed.",
  "Blue markers are shops. Gold are jobs.",
];

export default function PlayPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const [hud, setHud] = useState<HudState>(EMPTY);
  const [phase, setPhase] = useState<"loading" | "playing">("loading");
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<{ mode: string; address: string | null } | null>(null);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  useEffect(() => {
    try { const s = sessionStorage.getItem("pixelgta_player"); if (s) setMode(JSON.parse(s)); } catch { /* */ }
  }, []);

  useEffect(() => {
    let handle: GameHandle | null = null;
    let disposed = false;
    import("./engine/game").then(({ createGame }) => {
      if (disposed || !containerRef.current) return;
      handle = createGame(containerRef.current);
      handleRef.current = handle;
      handle.onState(setHud);
      if (miniRef.current) handle.setMinimap(miniRef.current);
      setReady(true);
    });
    return () => { disposed = true; handle?.dispose(); handleRef.current = null; };
  }, []);

  // loading progress
  useEffect(() => {
    if (phase !== "loading") return;
    const t = setInterval(() => {
      setProgress((p) => {
        const cap = ready ? 100 : 90;
        const next = Math.min(cap, p + (ready ? 8 : 2 + Math.random() * 4));
        return next;
      });
    }, 60);
    return () => clearInterval(t);
  }, [phase, ready]);

  useEffect(() => {
    if (phase === "loading" && progress >= 100 && ready) {
      const t = setTimeout(() => setPhase("playing"), 350);
      return () => clearTimeout(t);
    }
  }, [progress, ready, phase]);

  const hpPct = Math.max(0, (hud.hp / hud.maxHp) * 100);
  const armorPct = hud.maxArmor > 0 ? (hud.armor / hud.maxArmor) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none" style={{ cursor: phase === "playing" ? "none" : "default" }}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* ── HUD ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ fontFamily: "'Press Start 2P', monospace", opacity: phase === "playing" ? 1 : 0, transition: "opacity 0.4s" }}>
        <div className="absolute top-3 left-3">
          <div style={{ fontSize: 20, color: "#7CFC6B", textShadow: "2px 2px 0 #06210a" }}>${hud.cash.toLocaleString()}</div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ fontSize: 14, color: i < hud.wanted ? "#FFD23D" : "#3a3a3a", textShadow: i < hud.wanted ? "0 0 8px #FFD23D" : "none" }}>★</span>
            ))}
          </div>
          {mode && (
            <div className="mt-2 text-[7px]" style={{ color: "#ff7fc4" }}>
              {mode.mode === "wallet" && mode.address ? `◈ ${mode.address.slice(0, 4)}…${mode.address.slice(-4)}` : "◈ GUEST"}
            </div>
          )}
        </div>

        <div className="absolute top-3 right-3" style={{ width: 160, height: 160, border: "3px solid #1f2735", boxShadow: "0 0 0 2px #000, 4px 4px 0 rgba(0,0,0,0.5)", background: "#0a0e16" }}>
          <canvas ref={miniRef} width={160} height={160} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
        </div>

        {hud.missionText && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-center px-4 py-2" style={{ background: "rgba(8,10,18,0.8)", border: "2px solid #FFD23D" }}>
            <div className="text-[#FFD23D] text-[9px]">{hud.missionText}</div>
            <div className="text-white text-[8px] mt-1">⏱ {hud.missionTime}s</div>
          </div>
        )}

        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5" style={{ width: 220 }}>
          <Bar label="HP" pct={hpPct} color={hpPct > 50 ? "#36d06a" : hpPct > 25 ? "#e0a52a" : "#e23b3b"} value={hud.hp} />
          {hud.maxArmor > 0 && <Bar label="AR" pct={armorPct} color="#4aa6ff" value={hud.armor} />}
          {hud.inCar
            ? <div className="text-[8px] text-[#9fb4c8] mt-1">🚗 CAR HP {hud.carHp}</div>
            : <div className="text-[8px] text-[#c8c8c8] mt-1">🔫 {hud.weapon} {hud.weapon !== "FISTS" && <span className="text-[#FFD23D]">{hud.ammo}</span>}</div>}
        </div>

        {hud.prompt && !hud.shop && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[#FFD23D] text-[10px] px-3 py-2" style={{ background: "rgba(8,10,18,0.75)", border: "2px solid #FFD23D" }}>
            {hud.prompt}
          </div>
        )}

        {hud.shop && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto" style={{ background: "rgba(8,12,22,0.95)", border: "3px solid #46b4ff", boxShadow: "0 0 24px #46b4ff44", padding: 12, minWidth: 280 }}>
            <div className="text-[#46b4ff] text-[10px] text-center mb-2">{hud.shop.name}</div>
            <div className="flex flex-col gap-1.5">
              {hud.shop.items.map((it) => (
                <button key={it.id} disabled={it.maxed || hud.cash < it.cost} onClick={() => handleRef.current?.buy(it.id)}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ background: "#10161f", border: "2px solid #2a3340" }}>
                  <span>
                    <span className="text-white text-[8px]">{it.name}</span>
                    <span className="text-[#7a8a9a] text-[7px] block mt-0.5">{it.desc} • Lv {it.level}/{it.max}</span>
                  </span>
                  <span className="text-[#7CFC6B] text-[8px]">{it.maxed ? "MAX" : `$${it.cost}`}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {hud.gameOver && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(40,0,0,0.45)" }}>
            <div className="text-center">
              <div className="text-[#ff3b3b]" style={{ fontSize: 42, textShadow: "0 0 30px #ff3b3b, 4px 4px 0 #300" }}>
                {hud.gameOver === "wasted" ? "WASTED" : "BUSTED"}
              </div>
              <div className="text-[#c8c8c8] text-[9px] mt-3">respawning… (−10% cash)</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Loading screen ── */}
      {phase === "loading" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center" style={{ fontFamily: "'Press Start 2P', monospace" }}>
          <div className="absolute inset-0" style={{ backgroundImage: "url(/hero.png)", backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.4) saturate(1.2)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(8,3,16,0.95), rgba(20,6,34,0.7))" }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px)" }} />

          <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-8">
            <div className="text-3xl md:text-4xl font-bold mb-2"
              style={{ backgroundImage: "linear-gradient(180deg,#fff3b0,#ff8a3d,#ff2e88,#a32bd6)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 20px rgba(255,46,136,0.5))" }}>
              PIXEL GTA
            </div>
            <div className="text-[10px] mb-10" style={{ color: "#19e0ff", textShadow: "0 0 10px #19e0ff" }}>ENTERING VICE PIXEL CITY…</div>

            {/* progress bar */}
            <div className="w-full h-5 relative" style={{ background: "#10081a", border: "3px solid #ff2e88", boxShadow: "0 0 18px #ff2e8855" }}>
              <div className="h-full transition-all duration-100" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#ff2e88,#ff8a3d,#19e0ff)", boxShadow: "0 0 14px #ff2e8899" }} />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white">{Math.floor(progress)}%</span>
            </div>

            <div className="mt-8 text-[8px] text-center leading-relaxed" style={{ color: "#ffb3d9" }}>
              <span className="text-white/40">TIP: </span>{tip}
            </div>
          </div>

          <button onClick={() => router.push("/")} className="absolute bottom-6 left-6 z-10 text-[8px] text-white/40 hover:text-white/70 cursor-pointer">◀ MENU</button>
        </div>
      )}
    </div>
  );
}

function Bar({ label, pct, color, value }: { label: string; pct: number; color: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[7px] text-gray-400 w-4">{label}</span>
      <div className="flex-1 h-3 relative" style={{ background: "#11161e", border: "2px solid #2a3340" }}>
        <div className="h-full transition-all duration-150" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}66` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[6px] text-white/80">{value}</span>
      </div>
    </div>
  );
}
