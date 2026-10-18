// src/components/terminal/Terminal.tsx
"use client";
import { useEffect, useState } from "react";
import type { MarketMeta } from "@/lib/engine/market";
import type { LabRun } from "@/lib/engine/protocol";
import { LabPanel } from "./LabPanel";
import type { TerminalProps } from "./types";
import { useLab } from "./useLab";
import { Workspace, type LabTradeMark } from "./Workspace";

export function Terminal(props: TerminalProps) {
  const lab = useLab();
  const [meta, setMeta] = useState<MarketMeta | null>(null);
  const [metaErr, setMetaErr] = useState<string | null>(null);
  const [labRun, setLabRun] = useState<{ trades: LabTradeMark[]; params: TerminalProps["params"] } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/data/market.json", { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<MarketMeta>;
      })
      .then(setMeta)
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setMetaErr((e as Error).message);
      });
    return () => ctrl.abort();
  }, []);

  function onRun(r: LabRun) {
    setLabRun({
      params: r.cfg.params,
      trades: [
        ...r.trades.map((t) => ({ ticker: t.ticker, entry_date: t.entry_date, exit_date: t.exit_date, entry_price: t.entry_price, exit_price: t.exit_price, net_pnl: t.net_pnl, ret_pct: t.ret_pct })),
        ...r.open.map((o) => ({ ticker: o.ticker, entry_date: o.entry_date, exit_date: null, entry_price: o.entry_price, exit_price: null, net_pnl: null, ret_pct: o.unrealized_pct })),
      ],
    });
  }

  return (
    <div className="flex flex-col gap-s6">
      <section aria-labelledby="chart-h" className="flex flex-col gap-s3">
        <h2 id="chart-h" className="text-lg font-semibold text-ink-1">Chart dan replay</h2>
        {metaErr ? <p className="text-sm text-negative" role="alert">Data pasar lokal gagal dimuat: {metaErr}. Jalankan BUILD.bat ulang.</p> : null}
        <Workspace props={props} meta={meta} labTrades={labRun?.trades ?? null} labParams={labRun?.params ?? null} />
      </section>
      <section aria-labelledby="lab-h" className="flex flex-col gap-s3">
        <h2 id="lab-h" className="text-lg font-semibold text-ink-1">Lab backtest</h2>
        <p className="max-w-prose text-sm text-ink-2">
          Uji ulang aturan yang sama dengan parameter, periode, dan biaya yang bisa diubah, lalu optimasi dua parameter sekaligus. Semua jalan di browser lewat Web Worker dari data lokal. Angka resmi tugas tetap yang di dashboard utama.
        </p>
        <LabPanel props={props} lab={lab} onRun={onRun} />
      </section>
    </div>
  );
}
