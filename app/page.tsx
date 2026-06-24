"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GAME_CONFIG, X_URL, CA, TICKER } from "./config";

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

  // wallet → play bridge
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
    <main className="fixed inset-0 overflow-hidden" style={{ fontFamily: "'Press Start 2P', monospace" }}>
      {/* Full-bleed hero artwork */}
      <div className="absolute inset-0 z-0"
        style={{ backgroundImage: "url(/hero.png)", backgroundSize: "cover", backgroundPosition: "center" }} />
      {/* Sunset gradient wash + readability gradient (left + bottom) */}
      <div className="absolute inset-0 z-[1]"
        style={{ background: "linear-gradient(90deg, rgba(10,4,20,0.92) 0%, rgba(20,6,34,0.55) 38%, rgba(20,6,34,0) 62%)" }} />
      <div className="absolute inset-0 z-[1]"
        style={{ background: "linear-gradient(0deg, rgba(8,3,16,0.95) 0%, rgba(8,3,16,0.2) 30%, transparent 55%)" }} />
      {/* magenta/cyan neon haze */}
      <div className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: "radial-gradient(120% 80% at 15% 85%, rgba(255,40,140,0.18) 0%, transparent 55%)" }} />
      {/* scanlines */}
      <div className="absolute inset-0 z-[2] pointer-events-none"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.16) 2px, rgba(0,0,0,0.16) 3px)" }} />

      {/* Top bar: ticker (left) + X (right) */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-4">
        <div className="px-3 py-1.5 text-[10px]" style={{ color: "#19e0ff", border: "2px solid #19e0ff", background: "rgba(8,3,16,0.5)", boxShadow: "0 0 14px #19e0ff55", textShadow: "0 0 8px #19e0ff" }}>
          {TICKER}
        </div>
        <a href={X_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 transition-all hover:opacity-80"
          style={{ fontSize: 9, color: "#ff3e9a", textDecoration: "none", textShadow: "0 0 8px #ff3e9a" }}>
          <XIcon /><span>FOLLOW</span>
        </a>
      </div>

      {/* Bottom-left content block */}
      <div className="absolute z-20 left-0 bottom-0 p-6 md:p-12 w-full md:max-w-2xl">
        {/* neon accent line */}
        <div className="mb-4 h-[3px] w-24" style={{ background: "linear-gradient(90deg,#ff3e9a,#19e0ff)", boxShadow: "0 0 12px #ff3e9a" }} />

        <div className="leading-none select-none">
          <div className="text-xl md:text-2xl mb-2" style={{ color: "#19e0ff", textShadow: "0 0 14px #19e0ff, 2px 2px 0 #06223a" }}>
            PIXEL
          </div>
          <div className="text-6xl md:text-8xl font-bold"
            style={{
              backgroundImage: "linear-gradient(180deg,#fff3b0 0%,#ff8a3d 40%,#ff2e88 75%,#a32bd6 100%)",
              WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 24px rgba(255,46,136,0.55)) drop-shadow(4px 6px 0 rgba(60,10,40,0.8))",
            }}>
            GTA
          </div>
          <div className="mt-3 text-[10px] tracking-[0.3em]" style={{ color: "#ffb3d9", textShadow: "0 0 10px #ff3e9a88" }}>
            VICE PIXEL CITY · SOLANA
          </div>
        </div>

        {/* CTAs: guest + wallet */}
        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <button onClick={() => enter("guest")}
            className="px-8 py-4 text-sm font-bold text-white cursor-pointer active:scale-95 transition-all"
            style={{ background: "linear-gradient(180deg,#ff5fb0,#ff1e7a)", border: "3px solid #ffd0e8", boxShadow: "0 0 28px #ff2e8899, 5px 5px 0 #5a0a2e" }}>
            ▶ PLAY AS GUEST
          </button>
          <button onClick={walletClick}
            className="px-8 py-4 text-sm font-bold cursor-pointer active:scale-95 transition-all"
            style={{ color: connected ? "#06121f" : "#19e0ff", background: connected ? "linear-gradient(180deg,#5ff0ff,#19c8e0)" : "rgba(8,3,16,0.4)", border: "3px solid #19e0ff", boxShadow: "0 0 24px #19e0ff66, 5px 5px 0 #063040" }}>
            {connected ? `✓ ${publicKey?.toBase58().slice(0, 4)}…${publicKey?.toBase58().slice(-4)}` : "◈ LOGIN WALLET"}
          </button>
        </div>

        {/* press start blink + CA */}
        <div className="mt-6 flex flex-col gap-2">
          <div className="text-[9px]" style={{ color: "#ffd23d", opacity: blink ? 1 : 0.35, transition: "opacity 0.2s", textShadow: "0 0 8px #ffae33" }}>
            ▶ INSERT COIN · STEAL · DRIVE · EARN {TICKER}
          </div>
          <CADisplay />
          <div className="text-[8px] text-white/30">{GAME_CONFIG.subtitle} · {GAME_CONFIG.network}</div>
        </div>
      </div>
    </main>
  );
}

function CADisplay() {
  const [copied, setCopied] = useState(false);
  const isReal = CA !== "SOON" && CA !== "";
  function copy() { if (!isReal) return; navigator.clipboard.writeText(CA); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <div>
      <span className="text-[7px] text-white/40">CA: </span>
      <span onClick={copy}
        className={isReal ? "text-[7px] cursor-pointer transition-opacity hover:opacity-70" : "text-[7px]"}
        style={{ color: copied ? "#FFD700" : isReal ? "#7CFC6B" : "#b8859a" }}
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
