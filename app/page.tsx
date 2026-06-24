"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GAME_CONFIG, X_URL, CA, TICKER } from "./config";
import { display, mono } from "./fonts";
import { MusicEngine } from "./music";

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const [blink, setBlink] = useState(true);
  const [modal, setModal] = useState<null | "leaderboard" | "settings" | "howto">(null);

  const engineRef = useRef<MusicEngine | null>(null);
  const [musicOn, setMusicOn] = useState(false);
  const [trackName, setTrackName] = useState("ONLY GIRL IN THE WORLD");
  const [intro, setIntro] = useState(true);
  const [introLeaving, setIntroLeaving] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 650);
    return () => clearInterval(t);
  }, []);

  // music engine (started by the intro ENTER button — that click is the audio gesture)
  useEffect(() => {
    const e = new MusicEngine();
    engineRef.current = e;
    setTrackName(e.trackName);
    return () => { e.dispose(); };
  }, []);

  function enterSite() {
    const off = (() => { try { return localStorage.getItem("pixelgta_music_off") === "1"; } catch { return false; } })();
    const e = engineRef.current;
    if (e && !off) { e.play(); setMusicOn(true); setTrackName(e.trackName); }
    setIntroLeaving(true);
    setTimeout(() => setIntro(false), 450);
  }

  function toggleMusic() {
    const e = engineRef.current; if (!e) return;
    e.toggle(); setMusicOn(e.playing);
    try { localStorage.setItem("pixelgta_music_off", e.playing ? "0" : "1"); } catch { /* */ }
  }
  function nextTrack() { const e = engineRef.current; if (!e) return; e.next(); setTrackName(e.trackName); setMusicOn(e.playing); }

  function enter(mode: "guest" | "wallet", address?: string) {
    sessionStorage.setItem("pixelgta_player", JSON.stringify({ mode, address: address ?? null }));
    router.push("/play");
  }

  useEffect(() => {
    if (connected && publicKey && sessionStorage.getItem("pixelgta_wallet_pending")) {
      sessionStorage.removeItem("pixelgta_wallet_pending");
      enter("wallet", publicKey.toBase58());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  function walletClick() {
    if (connected && publicKey) enter("wallet", publicKey.toBase58());
    else { sessionStorage.setItem("pixelgta_wallet_pending", "1"); setVisible(true); }
  }

  return (
    <main className={`fixed inset-0 overflow-hidden ${display.variable} ${mono.variable}`} style={{ fontFamily: "var(--font-display)" }}>
      {/* Hero artwork */}
      <div className="absolute inset-0 z-0" style={{ backgroundImage: "url(/hero.png)", backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="absolute inset-0 z-[1]" style={{ background: "radial-gradient(58% 72% at 50% 50%, rgba(8,3,16,0.88) 0%, rgba(10,4,20,0.6) 45%, rgba(10,4,20,0.18) 75%, transparent 100%)" }} />
      <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(0deg, rgba(8,3,16,0.9) 0%, transparent 32%)" }} />
      <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.14) 2px, rgba(0,0,0,0.14) 3px)" }} />

      {/* Animated intro / welcome — separate screen; ENTER starts music then cinematically reveals the menu */}
      {intro && (
        <div className={`absolute inset-0 z-[60] flex flex-col items-center justify-center text-center px-6 ${introLeaving ? "intro-leaving" : ""}`}>
          {/* blurred hero backdrop (hides the menu) */}
          <div className="absolute inset-0" style={{ backgroundImage: "url(/hero.png)", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(9px) brightness(0.42) saturate(1.2)", transform: "scale(1.08)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(65% 75% at 50% 50%, rgba(8,3,16,0.5), rgba(6,3,14,0.92))" }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.16) 2px, rgba(0,0,0,0.16) 3px)" }} />

          <div className="relative intro-in flex flex-col items-center">
            <div className="text-2xl md:text-3xl tracking-[0.3em] mb-1 intro-word" style={{ color: "#19e0ff", textShadow: "0 0 16px #19e0ff", animationDelay: "0.1s" }}>PIXEL</div>
            <div className="text-7xl md:text-9xl font-black title-glow leading-none"
              style={{ backgroundImage: "linear-gradient(180deg,#fff3b0,#ff8a3d,#ff2e88,#a32bd6)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>GTA</div>
            <div className="mt-5 text-base md:text-2xl tracking-[0.2em] intro-word" style={{ color: "#ffb3d9", textShadow: "0 0 12px #ff3e9a88", animationDelay: "0.35s" }}>WELCOME TO VICE PIXEL CITY</div>
            <div className="mt-2 text-sm md:text-base intro-word" style={{ fontFamily: "var(--font-mono)", color: "#cfe8ff", animationDelay: "0.55s" }}>dive into a world of neon, speed &amp; dirty money</div>
            <button onClick={enterSite}
              className="btn-neon mt-10 px-16 py-5 text-2xl font-black text-white cursor-pointer intro-word"
              style={{ background: "linear-gradient(180deg,#ff5fb0,#ff1e7a)", border: "3px solid #ffd0e8", animationDelay: "0.78s", ["--g" as string]: "#ff2e88aa", ["--s" as string]: "#5a0a2e" }}>
              <span className="relative z-10">ENTER THE CITY</span>
            </button>
          </div>
        </div>
      )}

      {/* white flash during the transition */}
      {introLeaving && <div className="absolute inset-0 z-[70] pointer-events-none flash-wipe" style={{ background: "radial-gradient(circle at 50% 50%, #ffffff, #ff8ad0 60%, transparent 100%)" }} />}

      {/* Top bar: ticker */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-start px-6 py-5" style={{ opacity: intro ? 0 : 1, transition: "opacity 0.6s ease 0.3s" }}>
        <div className="px-3 py-1.5 text-[13px] tracking-widest" style={{ fontFamily: "var(--font-mono)", color: "#19e0ff", border: "2px solid #19e0ff", background: "rgba(8,3,16,0.5)", boxShadow: "0 0 14px #19e0ff55", textShadow: "0 0 8px #19e0ff" }}>
          {TICKER}
        </div>
      </div>

      {/* Centered content — tidy aligned column */}
      <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center px-4 ${!intro ? "menu-enter" : ""}`} style={{ opacity: intro ? 0 : 1 }}>
        {/* logo */}
        <div className="bob select-none text-center">
          <div className="text-2xl md:text-3xl tracking-[0.3em]" style={{ color: "#19e0ff", textShadow: "0 0 16px #19e0ff, 2px 2px 0 #06223a" }}>PIXEL</div>
          <div className="text-7xl md:text-9xl font-black title-glow leading-none"
            style={{ backgroundImage: "linear-gradient(180deg,#fff3b0 0%,#ff8a3d 38%,#ff2e88 72%,#a32bd6 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            GTA
          </div>
          <div className="mt-3 text-xs md:text-base tracking-[0.4em]" style={{ color: "#ffb3d9", textShadow: "0 0 10px #ff3e9a88" }}>VICE PIXEL CITY</div>
        </div>

        {/* primary CTAs — equal width */}
        <div className="mt-9 w-full max-w-sm flex flex-col gap-3.5">
          <button onClick={() => enter("guest")}
            className="btn-neon w-full py-4 text-lg md:text-xl font-black text-white cursor-pointer text-center"
            style={{ background: "linear-gradient(180deg,#ff5fb0,#ff1e7a)", border: "3px solid #ffd0e8", ["--g" as string]: "#ff2e88aa", ["--s" as string]: "#5a0a2e" }}>
            <span className="relative z-10">▶ PLAY AS GUEST</span>
          </button>
          <button onClick={walletClick}
            className="btn-neon w-full py-4 text-lg md:text-xl font-black cursor-pointer text-center"
            style={{ color: connected ? "#06121f" : "#bff6ff", background: connected ? "linear-gradient(180deg,#5ff0ff,#19c8e0)" : "linear-gradient(180deg,rgba(25,224,255,0.16),rgba(25,224,255,0.04))", border: "3px solid #19e0ff", ["--g" as string]: "#19e0ff88", ["--s" as string]: "#063040" }}>
            <span className="relative z-10">{connected ? `✓ ${publicKey?.toBase58().slice(0, 4)}…${publicKey?.toBase58().slice(-4)}` : "◈ LOGIN WALLET"}</span>
          </button>
        </div>

        {/* insert coin */}
        <div className="mt-5 text-sm md:text-base tracking-[0.18em] text-center" style={{ fontFamily: "var(--font-mono)", color: "#ffd23d", opacity: blink ? 1 : 0.4, transition: "opacity 0.2s", textShadow: "0 0 8px #ffae33" }}>
          ▶ INSERT COIN · STEAL · DRIVE · EARN {TICKER}
        </div>

        {/* CA + X + secondary — aligned within one column */}
        <div className="mt-5 w-full max-w-sm flex flex-col items-stretch gap-2.5">
          <CADisplay />
          <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="Follow on X"
            className="flex items-center justify-center gap-3 py-2.5 transition-all hover:brightness-110"
            style={{ color: "#fff", background: "rgba(8,3,16,0.55)", border: "2px solid #ff3e9a", boxShadow: "0 0 16px #ff3e9a55", fontFamily: "var(--font-mono)", fontSize: 17, letterSpacing: "0.1em" }}>
            <XIcon size={18} /><span>FOLLOW ON X</span>
          </a>
          <div className="grid grid-cols-3 gap-2.5">
            <MenuChip label="🏆" sub="RANKS" onClick={() => setModal("leaderboard")} />
            <MenuChip label="⚙" sub="SETTINGS" onClick={() => setModal("settings")} />
            <MenuChip label="❔" sub="HOW TO PLAY" onClick={() => setModal("howto")} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-3 left-0 right-0 z-20 text-center text-[11px] tracking-widest" style={{ fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.3)", opacity: intro ? 0 : 1, transition: "opacity 0.6s ease 0.3s" }}>
        {GAME_CONFIG.subtitle} · {GAME_CONFIG.network}
      </div>

      {/* Music player (bottom-right) */}
      {!intro && <MusicPlayer on={musicOn} track={trackName} onToggle={toggleMusic} onNext={nextTrack} />}

      {/* Modals */}
      {modal && <Modal onClose={() => setModal(null)} title={modal === "leaderboard" ? "🏆 LEADERBOARD" : modal === "settings" ? "⚙ SETTINGS" : "❔ HOW TO PLAY"}>
        {modal === "leaderboard" && <Leaderboard />}
        {modal === "settings" && <Settings />}
        {modal === "howto" && <HowTo />}
      </Modal>}
    </main>
  );
}

function MusicPlayer({ on, track, onToggle, onNext }: { on: boolean; track: string; onToggle: () => void; onNext: () => void }) {
  return (
    <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-3 py-2"
      style={{ fontFamily: "var(--font-mono)", background: "rgba(8,3,16,0.62)", border: "2px solid #19e0ff66", boxShadow: "0 0 16px #19e0ff33" }}>
      <span className={on ? "text-[#19e0ff]" : "text-[#19e0ff]/40"} style={{ fontSize: 16 }}>♪</span>
      <div className="flex flex-col leading-tight mr-1">
        <span className="text-[9px] text-white/40">NOW PLAYING</span>
        <span className="text-[12px]" style={{ color: "#ffb3d9" }}>{on ? track : "PAUSED"}</span>
      </div>
      <button onClick={onToggle} aria-label="Play/Pause" className="w-7 h-7 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform" style={{ color: "#ffd23d", border: "2px solid #ffd23d77" }}>
        {on ? "❚❚" : "▶"}
      </button>
      <button onClick={onNext} aria-label="Next" className="w-7 h-7 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform" style={{ color: "#19e0ff", border: "2px solid #19e0ff77" }}>
        ⏭
      </button>
    </div>
  );
}

function CADisplay() {
  const [copied, setCopied] = useState(false);
  const isReal = CA !== "SOON" && CA !== "";
  function copy() { if (!isReal) return; navigator.clipboard.writeText(CA); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 w-full overflow-x-auto"
      style={{ fontFamily: "var(--font-mono)", background: "rgba(8,3,16,0.55)", border: "2px solid #ff3e9a55", boxShadow: "0 0 18px #ff3e9a33", whiteSpace: "nowrap" }}>
      <span className="text-sm shrink-0" style={{ color: "#19e0ff" }}>CA:</span>
      <span className="text-xs md:text-sm whitespace-nowrap" style={{ color: copied ? "#FFD700" : isReal ? "#7CFC6B" : "#ffd0e8", letterSpacing: "0.03em" }}>
        {copied ? "COPIED!" : CA}
      </span>
      {isReal && (
        <button onClick={copy} aria-label="Copy CA" className="flex items-center justify-center transition-all hover:scale-110 cursor-pointer shrink-0"
          style={{ width: 26, height: 26, color: copied ? "#FFD700" : "#19e0ff", background: "rgba(25,224,255,0.1)", border: "2px solid #19e0ff", boxShadow: "0 0 10px #19e0ff55" }}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      )}
    </div>
  );
}

function MenuChip({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center justify-center py-2 transition-all hover:scale-105 hover:brightness-125 cursor-pointer"
      style={{ fontFamily: "var(--font-display)", color: "#bff6ff", background: "rgba(8,3,16,0.5)", border: "2px solid #19e0ff66", boxShadow: "0 0 12px #19e0ff22" }}>
      <span style={{ fontSize: 16 }}>{label}</span>
      <span className="text-[9px] mt-0.5 tracking-wider">{sub}</span>
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(4,2,10,0.78)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md"
        style={{ background: "linear-gradient(180deg,#160a26,#0c0518)", border: "3px solid #ff3e9a", boxShadow: "0 0 40px #ff3e9a55", fontFamily: "var(--font-display)" }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "2px solid #ff3e9a44" }}>
          <span className="text-lg" style={{ color: "#ffd23d", textShadow: "0 0 10px #ffae33" }}>{title}</span>
          <button onClick={onClose} aria-label="Close" className="text-xl text-white/70 hover:text-white cursor-pointer leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Leaderboard() {
  const [rows, setRows] = useState<{ name: string; score: number; you?: boolean }[]>([]);
  useEffect(() => {
    let mine = 0;
    try { const s = localStorage.getItem("pixelgta_save_v1"); if (s) mine = JSON.parse(s).cash || 0; } catch { /* */ }
    const fake = [
      { name: "TommyV", score: 184200 }, { name: "BigSmoke", score: 152800 }, { name: "Sweet", score: 119400 },
      { name: "Lance", score: 98700 }, { name: "Ryder", score: 76500 }, { name: "Ken_R", score: 54300 },
      { name: "Maria", score: 41200 }, { name: "Cesar", score: 28900 },
    ];
    setRows([...fake, { name: "YOU", score: mine, you: true }].sort((a, b) => b.score - a.score).slice(0, 9));
  }, []);
  return (
    <div className="flex flex-col gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-1.5 text-base"
          style={{ background: r.you ? "rgba(255,210,61,0.14)" : "rgba(255,255,255,0.04)", border: r.you ? "2px solid #ffd23d" : "2px solid transparent", color: r.you ? "#ffd23d" : "#cfe8ff" }}>
          <span>{i + 1}. {r.name}</span>
          <span style={{ color: "#7CFC6B" }}>${r.score.toLocaleString()}</span>
        </div>
      ))}
      <div className="mt-2 text-center text-[11px]" style={{ color: "#ffb3d9" }}>your cash is your score — go farm {TICKER}</div>
    </div>
  );
}

function Settings() {
  const [muted, setMuted] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { try { setMuted(localStorage.getItem("pixelgta_muted") === "1"); } catch { /* */ } }, []);
  function toggle() { const n = !muted; setMuted(n); try { localStorage.setItem("pixelgta_muted", n ? "1" : "0"); } catch { /* */ } }
  function reset() { try { localStorage.removeItem("pixelgta_save_v1"); } catch { /* */ } setDone(true); setTimeout(() => setDone(false), 1500); }
  return (
    <div className="flex flex-col gap-4" style={{ fontFamily: "var(--font-mono)" }}>
      <div className="flex items-center justify-between text-lg">
        <span style={{ color: "#cfe8ff" }}>SFX</span>
        <button onClick={toggle} className="px-4 py-1.5 cursor-pointer" style={{ color: muted ? "#ff6b7e" : "#7CFC6B", border: `2px solid ${muted ? "#ff6b7e" : "#7CFC6B"}` }}>
          {muted ? "OFF" : "ON"}
        </button>
      </div>
      <div className="flex items-center justify-between text-lg">
        <span style={{ color: "#cfe8ff" }}>PROGRESS</span>
        <button onClick={reset} className="px-4 py-1.5 cursor-pointer" style={{ color: "#ff6b7e", border: "2px solid #ff6b7e" }}>
          {done ? "DONE ✓" : "RESET"}
        </button>
      </div>
      <div className="text-[11px] mt-1" style={{ color: "#ffb3d9" }}>music has its own player (bottom-right). settings stored on this device.</div>
    </div>
  );
}

function HowTo() {
  const rows = [["WASD", "move / drive"], ["MOUSE", "aim"], ["CLICK", "shoot / punch"], ["F", "enter / exit car"], ["E", "start a job"], ["SPACE", "handbrake"]];
  return (
    <div className="flex flex-col gap-2" style={{ fontFamily: "var(--font-mono)" }}>
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-center justify-between text-base">
          <span className="px-2 py-0.5" style={{ color: "#19e0ff", border: "2px solid #19e0ff66" }}>{k}</span>
          <span style={{ color: "#cfe8ff" }}>{v}</span>
        </div>
      ))}
      <div className="mt-2 text-[12px] leading-relaxed" style={{ color: "#ffb3d9" }}>
        Grab the colorful pickups, jack cars, run jobs (gold $ markers) and spend {TICKER} at blue shop markers. Don&apos;t hit 5 stars.
      </div>
    </div>
  );
}

function CopyIcon() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M5 15V5a1.5 1.5 0 0 1 1.5-1.5H15" /></svg>);
}
function CheckIcon() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>);
}
function XIcon({ size = 12 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>);
}
