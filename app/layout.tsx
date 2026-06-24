import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import { SolanaProviders } from "./providers";

const pixelFont = Press_Start_2P({ subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Pixel Grand Theft Auto — $PIXELGTA",
  description: "Top-down open-world pixel crime game on Solana. Steal, drive, earn, survive.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={pixelFont.className}>
        <SolanaProviders>{children}</SolanaProviders>
      </body>
    </html>
  );
}
