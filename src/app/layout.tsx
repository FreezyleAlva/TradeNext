// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { loadSurface0 } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freezyle Traiding",
  description: "Dashboard UTS Algorithmic Trading: trend breakout KOMPAS100, backtest 10 tahun dengan biaya BEI dan uji validitas.",
};

export function generateViewport(): Viewport {
  return { themeColor: loadSurface0(), colorScheme: "dark" };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="backdrop" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
