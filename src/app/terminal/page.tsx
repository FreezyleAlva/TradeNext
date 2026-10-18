// src/app/terminal/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Terminal } from "@/components/terminal/Terminal";
import { loadResults } from "@/lib/data";
import { date } from "@/lib/format";

export const metadata: Metadata = {
  title: "Terminal | Freezyle Traiding",
  description: "Chart candlestick, replay, dan lab backtest strategi Freezyle Trend Breakout K100.",
};

export default function TerminalPage() {
  const r = loadResults();
  const m = r.meta;
  const eq = r.main.equity;
  return (
    <div className="terminal-shell flex flex-col gap-s5">
      <header className="flex flex-wrap items-center justify-between gap-s3 rounded-md bg-surface-1 px-s4 py-s3">
        <div className="flex items-center gap-s3">
          <img src="/icons/logo.png" alt="" width={32} height={32} className="size-s6 rounded-sm" />
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-ink-1">{m.dashboard} Terminal</h1>
            <span className="text-xs text-ink-3">{m.strategy_name} v{m.strategy_version} | data s.d. {date(m.data_last_date)} | dibekukan {date(m.freeze_date)}</span>
          </div>
        </div>
        <Link href="/" className="tap flex items-center gap-s2 rounded-md bg-surface-2 px-s3 text-sm text-ink-1 no-underline hover:bg-surface-3">
          <Icon name="overview" className="size-s4 text-cyan-2" />
          Dashboard tugas
        </Link>
      </header>
      <Terminal
        tickers={[...m.universe].sort()}
        params={m.params}
        trades={r.main.trades.map((t) => ({ id: t.id, ticker: t.ticker, entry_date: t.entry_date, exit_date: t.exit_date, entry_price: t.entry_price, exit_price: t.exit_price, net_pnl: t.net_pnl, ret_pct: t.ret_pct }))}
        equity={{ d: eq.map((p) => p.d), v: eq.map((p) => Math.round(p.equity)), dd: eq.map((p) => p.dd), open: eq.map((p) => p.n_open) }}
        meta={{
          backtest_start: m.backtest_start,
          backtest_end: m.backtest_end,
          research_end: m.research_end,
          forward_start: m.forward_start,
          data_last_date: m.data_last_date,
          initial_capital: m.initial_capital,
          max_positions: m.max_positions,
          position_fraction: m.position_fraction,
          strategy_name: m.strategy_name,
        }}
        official={{
          final: r.main.summary.final,
          n_trades: r.main.summary.n_trades,
          cagr: r.main.summary.cagr,
          mdd: r.main.summary.mdd,
          profit_factor: r.main.summary.profit_factor,
        }}
        grid={r.validation.selection.grid}
      />
      <footer className="text-xs text-ink-3">
        Chart dan lab memakai CSV Yahoo Finance yang sama dengan backtest Python, disalin ke folder dashboard saat build. Tidak ada data waktu nyata; mode replay memutar ulang data historis bar per bar.
      </footer>
    </div>
  );
}
