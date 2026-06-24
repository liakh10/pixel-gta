"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GAME_CONFIG, X_URL, CA, TICKER } from "./config";
import { display, mono } from "./fonts";

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 650);
    return () => clearInterval(t);
  }, []);

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
      {/* Center darken so the centred UI pops */}
      <div className="absolute inset-0 z-[1]" style={{ background: "radial-gradient(60% 75% at 50% 52%, rgba(8,3,16,0.86) 0%, rgba(10,4,20,0.55) 45%, rgba(10,4,20,0.15) 75%, transparent 100%)" }} />
      <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(0deg, rgba(8,3,16,0.9) 0%, transparent 35%)" }} />
      <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.14) 2px, rgba(0,0,0,0.14) 3px)" }} />

      {/* Top bar: ticker + X (always) */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
        <div className="px-3 py-1.5 text-[13px] tracking-widest" style={{ fontFamily: "var(--font-mono)", color: "#19e0ff", border: "2px solid #19e0ff", background: "rgba(8,3,16,0.5)", boxShadow: "0 0 14px #19e0ff55", textShadow: "0 0 8px #19e0ff" }}>
          {TICKER}
        </div>
        <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="X"
          className="flex items-center justify-center transition-all hover:scale-110"
          style={{ width: 42, height: 42, color: "#fff", background: "rgba(8,3,16,0.55)", border: "2px solid #ff3e9a", boxShadow: "0 0 16px #ff3e9a88" }}>
          <XIcon size={20} />
        </a>
      </div>

      {/* Centered content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4">
        <div className="bob select-none">
          <div className="text-2xl md:text-3xl tracking-[0.25em]" style={{ color: "#19e0ff", textShadow: "0 0 16px #19e0ff, 2px 2px 0 #06223a" }}>
            PIXEL
          </div>
          <div className="text-7xl md:text-9xl font-black title-glow leading-none"
            style={{
              backgroundImage: "linear-gradient(180deg,#fff3b0 0%,#ff8a3d 38%,#ff2e88 72%,#a32bd6 100%)",
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
            GTA
          </div>
          <div className="mt-3 text-[13px] md:text-base tracking-[0.35em]" style={{ color: "#ffb3d9", textShadow: "0 0 10px #ff3e9a88" }}>
            VICE PIXEL CITY
          </div>
        </div>

        {/* Big animated buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-5 items-center">
          <button onClick={() => enter("guest")}
            className="btn-neon px-12 py-5 text-xl md:text-2xl font-black text-white cursor-pointer"
            style={{ background: "linear-gradient(180deg,#ff5fb0,#ff1e7a)", border: "3px solid #ffd0e8", ["--g" as string]: "#ff2e88aa", ["--s" as string]: "#5a0a2e" }}>
            <span className="relative z-10">▶ PLAY AS GUEST</span>
          </button>
          <button onClick={walletClick}
            className="btn-neon px-12 py-5 text-xl md:text-2xl font-black cursor-pointer"
            style={{ color: connected ? "#06121f" : "#bff6ff", background: connected ? "linear-gradient(180deg,#5ff0ff,#19c8e0)" : "linear-gradient(180deg,rgba(25,224,255,0.18),rgba(25,224,255,0.05))", border: "3px solid #19e0ff", ["--g" as string]: "#19e0ff88", ["--s" as string]: "#063040" }}>
            <span className="relative z-10">{connected ? `✓ ${publicKey?.toBase58().slice(0, 4)}…${publicKey?.toBase58().slice(-4)}` : "◈ LOGIN WALLET"}</span>
          </button>
        </div>

        {/* Insert-coin blink */}
        <div className="mt-7 text-base md:text-lg tracking-[0.2em]" style={{ fontFamily: "var(--font-mono)", color: "#ffd23d", opacity: blink ? 1 : 0.35, transition: "opacity 0.2s", textShadow: "0 0 8px #ffae33" }}>
          ▶ INSERT COIN · STEAL · DRIVE · EARN {TICKER}
        </div>

        {/* CA — large */}
        <CADisplay />
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 z-20 text-center text-[12px] tracking-widest" style={{ fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.35)" }}>
        {GAME_CONFIG.subtitle} · {GAME_CONFIG.network}
      </div>
    </main>
  );
}

function CADisplay() {
  const [copied, setCopied] = useState(false);
  const isReal = CA !== "SOON" && CA !== "";
  function copy() { if (!isReal) return; navigator.clipboard.writeText(CA); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <div className="mt-6 flex items-center gap-3 px-5 py-2"
      style={{ fontFamily: "var(--font-mono)", background: "rgba(8,3,16,0.55)", border: "2px solid #ff3e9a55", boxShadow: "0 0 18px #ff3e9a33" }}>
      <span className="text-base md:text-lg" style={{ color: "#19e0ff" }}>CA:</span>
      <span
        className="text-base md:text-lg"
        style={{ color: copied ? "#FFD700" : isReal ? "#7CFC6B" : "#ffd0e8", letterSpacing: "0.05em", wordBreak: "break-all" }}>
        {copied ? "COPIED!" : CA}
      </span>
      {isReal && (
        <button onClick={copy} aria-label="Copy CA"
          className="flex items-center justify-center transition-all hover:scale-110 cursor-pointer shrink-0"
          style={{ width: 30, height: 30, color: copied ? "#FFD700" : "#19e0ff", background: "rgba(25,224,255,0.1)", border: "2px solid #19e0ff", boxShadow: "0 0 10px #19e0ff55" }}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      )}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M5 15V5a1.5 1.5 0 0 1 1.5-1.5H15" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
