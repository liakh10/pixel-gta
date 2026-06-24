"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameHandle, HudState } from "./engine/game";

const EMPTY: HudState = {
  cash: 0, hp: 100, maxHp: 100, armor: 0, maxArmor: 0, wanted: 0,
  inCar: false, weapon: "FISTS", ammo: 0, missionText: null, missionTime: 0,
  shop: null, prompt: null, gameOver: null, carHp: 0,
};

export default function PlayPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const [hud, setHud] = useState<HudState>(EMPTY);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);

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

  const hpPct = Math.max(0, (hud.hp / hud.maxHp) * 100);
  const armorPct = hud.maxArmor > 0 ? (hud.armor / hud.maxArmor) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none" style={{ cursor: started ? "none" : "default" }}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* ── HUD ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ fontFamily: "'Press Start 2P', monospace" }}>

        {/* Cash + wanted (top-left) */}
        <div className="absolute top-3 left-3">
          <div className="text-[#7CFC6B]" style={{ fontSize: 20, textShadow: "2px 2px 0 #06210a" }}>
            ${hud.cash.toLocaleString()}
          </div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ fontSize: 14, color: i < hud.wanted ? "#FFD23D" : "#3a3a3a", textShadow: i < hud.wanted ? "0 0 8px #FFD23D" : "none" }}>★</span>
            ))}
          </div>
        </div>

        {/* Minimap (top-right) */}
        <div className="absolute top-3 right-3" style={{ width: 160, height: 160, border: "3px solid #1f2735", boxShadow: "0 0 0 2px #000, 4px 4px 0 rgba(0,0,0,0.5)", background: "#0a0e16" }}>
          <canvas ref={miniRef} width={160} height={160} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
        </div>

        {/* Mission banner (top-center) */}
        {hud.missionText && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-center px-4 py-2"
            style={{ background: "rgba(8,10,18,0.8)", border: "2px solid #FFD23D" }}>
            <div className="text-[#FFD23D] text-[9px]">{hud.missionText}</div>
            <div className="text-white text-[8px] mt-1">⏱ {hud.missionTime}s</div>
          </div>
        )}

        {/* Health / armor / weapon (bottom-left) */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5" style={{ width: 220 }}>
          <Bar label="HP" pct={hpPct} color={hpPct > 50 ? "#36d06a" : hpPct > 25 ? "#e0a52a" : "#e23b3b"} value={hud.hp} />
          {hud.maxArmor > 0 && <Bar label="AR" pct={armorPct} color="#4aa6ff" value={hud.armor} />}
          {hud.inCar
            ? <div className="text-[8px] text-[#9fb4c8] mt-1">🚗 CAR HP {hud.carHp}</div>
            : <div className="text-[8px] text-[#c8c8c8] mt-1">🔫 {hud.weapon} {hud.weapon !== "FISTS" && <span className="text-[#FFD23D]">{hud.ammo}</span>}</div>}
        </div>

        {/* Prompt (bottom-center) */}
        {hud.prompt && !hud.shop && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[#FFD23D] text-[10px] px-3 py-2"
            style={{ background: "rgba(8,10,18,0.75)", border: "2px solid #FFD23D" }}>
            {hud.prompt}
          </div>
        )}

        {/* Shop panel (bottom-center) */}
        {hud.shop && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto"
            style={{ background: "rgba(8,12,22,0.95)", border: "3px solid #46b4ff", boxShadow: "0 0 24px #46b4ff44", padding: 12, minWidth: 280 }}>
            <div className="text-[#46b4ff] text-[10px] text-center mb-2">{hud.shop.name}</div>
            <div className="flex flex-col gap-1.5">
              {hud.shop.items.map((it) => (
                <button key={it.id} disabled={it.maxed || hud.cash < it.cost}
                  onClick={() => handleRef.current?.buy(it.id)}
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

        {/* Game over */}
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

      {/* Start overlay */}
      {!started && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-auto"
          style={{ background: "rgba(5,7,14,0.92)", fontFamily: "'Press Start 2P', monospace" }}>
          <div className="text-[#FFD23D] text-2xl mb-1" style={{ textShadow: "0 0 20px #ffb30088, 3px 3px 0 #5a3000" }}>PIXEL GTA</div>
          <div className="text-[8px] text-gray-400 mb-8">$PIXELGTA • crime city</div>
          <button onClick={() => setStarted(true)} disabled={!ready}
            className="px-10 py-4 text-sm text-black font-bold cursor-pointer active:scale-95 transition-transform disabled:opacity-40"
            style={{ background: "linear-gradient(180deg,#FFD24D,#FFA800)", boxShadow: "0 0 30px #FFB30066, 4px 4px 0 #5a3000" }}>
            {ready ? "▶ PLAY" : "LOADING…"}
          </button>
          <div className="mt-10 text-[8px] text-gray-400 leading-relaxed text-center max-w-md">
            <div className="text-gray-300 mb-2">CONTROLS</div>
            <div>WASD — move/drive &nbsp;•&nbsp; MOUSE — aim &nbsp;•&nbsp; CLICK — shoot</div>
            <div className="mt-1">F — enter/exit car &nbsp;•&nbsp; E — start job &nbsp;•&nbsp; SPACE — handbrake</div>
            <div className="mt-2 text-gray-500">Earn $PIXELGTA from jobs & crime → buy upgrades at shops</div>
          </div>
          <button onClick={() => router.push("/")} className="mt-8 text-[8px] text-gray-600 hover:text-gray-400 cursor-pointer">◀ BACK TO MENU</button>
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
