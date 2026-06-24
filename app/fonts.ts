import { Orbitron, VT323 } from "next/font/google";

// Vice City synthwave identity — distinct from other games.
export const display = Orbitron({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-display" });
export const mono = VT323({ subsets: ["latin"], weight: "400", variable: "--font-mono" });
