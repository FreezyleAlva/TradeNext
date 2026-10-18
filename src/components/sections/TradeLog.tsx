// src/components/sections/TradeLog.tsx
"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Trade } from "@/types/results";
import { date, int, num, pct, rp, tone } from "@/lib/format";

type Key = "id" | "ticker" | "entry_date" | "entry_price" | "entry_lots" | "exit_date" | "exit_price" | "hold_days" | "total_cost" | "dividends" | "net_pnl" | "ret_pct";
type Outcome = "semua" | "untung" | "rugi";

const COLS: { key: Key; label: string; num: boolean }[] = [
  { key: "id", label: "#", num: true },
  { key: "ticker", label: "Ticker", num: false },
  { key: "entry_date", label: "Masuk", num: false },
  { key: "entry_price", label: "Harga masuk", num: true },
  { key: "entry_lots", label: "Lot", num: true },
  { key: "exit_date", label: "Keluar", num: false },
  { key: "exit_price", label: "Harga keluar", num: true },
  { key: "hold_days", label: "Hari", num: true },
  { key: "total_cost", label: "Biaya", num: true },
  { key: "dividends", label: "Dividen", num: true },
  { key: "net_pnl", label: "Laba bersih", num: true },
  { key: "ret_pct", label: "Return", num: true },
];

const toneCls = { positive: "text-positive", negative: "text-negative", neutral: "text-ink-1" } as const;

export function TradeLog({ trades }: { trades: Trade[] }) {
  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("semua");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "id", dir: 1 });

  const rows = useMemo(() => {
    const needle = q.trim().toUpperCase();
    const out = trades.filter((t) => {
      if (outcome === "untung" && !((t.net_pnl ?? 0) > 0)) return false;
      if (outcome === "rugi" && !((t.net_pnl ?? 0) < 0)) return false;
      if (!needle) return true;
      return (
        t.ticker.toUpperCase().includes(needle) ||
        t.entry_date.includes(needle) ||
        (t.exit_date ?? "").includes(needle) ||
        String(t.id) === needle
      );
    });
    const { key, dir } = sort;
    return out.sort((a, b) => {
      const x = a[key];
      const y = b[key];
      if (x === y) return a.id - b.id;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x < y ? -1 : 1) * dir;
    });
  }, [trades, q, outcome, sort]);

  const sum = rows.reduce((a, t) => a + (t.net_pnl ?? 0), 0);

  function toggle(key: Key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "ticker" || key === "id" || key.endsWith("date") ? 1 : -1 }));
  }

  return (
    <div className="flex flex-col gap-s3">
      <div className="flex flex-wrap items-center gap-s3">
        <label className="flex min-w-0 flex-1 items-center gap-s2 rounded-md bg-surface-2 px-s3 sm:flex-none">
          <Icon name="search" className="size-s4 text-ink-3" />
          <span className="sr-only">Cari trade</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari ticker, tanggal (2025-05), atau nomor"
            className="tap w-full min-w-0 bg-transparent text-sm text-ink-1 placeholder:text-ink-4 focus:outline-none"
          />
        </label>
        <div role="radiogroup" aria-label="Saring hasil trade" className="flex gap-s1 rounded-md bg-surface-2 p-s1">
          {(["semua", "untung", "rugi"] as const).map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={outcome === o}
              onClick={() => setOutcome(o)}
              className={`tap rounded-sm px-s3 text-sm capitalize ${outcome === o ? "bg-surface-4 text-ink-1" : "text-ink-3 hover:text-ink-1"}`}
            >
              {o}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-3" aria-live="polite">
          {int(rows.length)} dari {int(trades.length)} trade | total laba bersih <span className={`font-mono ${toneCls[tone(sum)]}`}>{rp(sum, true)}</span>
        </p>
      </div>
      <div className="table-wrap table-scroll rounded-md bg-surface-2" tabIndex={0} role="region" aria-label="Log trade">
        <table className="data-table w-full text-sm">
          <caption className="sr-only">Log trade, klik judul kolom untuk mengurutkan</caption>
          <thead>
            <tr>
              {COLS.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`p-0 ${c.num ? "text-right" : "text-left"}`}>
                    <button
                      type="button"
                      onClick={() => toggle(c.key)}
                      className={`tap inline-flex w-full items-center gap-s1 px-s3 text-xs font-medium whitespace-nowrap ${c.num ? "justify-end" : "justify-start"} ${active ? "text-ink-1" : "text-ink-3 hover:text-ink-1"}`}
                    >
                      {c.label}
                      <Icon name={active ? (sort.dir === 1 ? "arrow_up" : "arrow_down") : "sort"} className="size-s3" />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="px-s3 py-s2 text-right font-mono text-ink-3 tabular-nums">{t.id}</td>
                <td className="px-s3 py-s2 font-mono text-ink-1">{t.ticker}</td>
                <td className="px-s3 py-s2 whitespace-nowrap text-ink-2" title={`Sinyal ${date(t.signal_date)} ${t.entry_time}`}>{date(t.entry_date)}</td>
                <td className="px-s3 py-s2 text-right font-mono tabular-nums text-ink-1">{num(t.entry_price, 0)}</td>
                <td className="px-s3 py-s2 text-right font-mono tabular-nums text-ink-2">{int(t.entry_lots)}</td>
                <td className="px-s3 py-s2 whitespace-nowrap text-ink-2" title={t.exit_reason ?? undefined}>{date(t.exit_date)}</td>
                <td className="px-s3 py-s2 text-right font-mono tabular-nums text-ink-1">{num(t.exit_price, 0)}</td>
                <td className="px-s3 py-s2 text-right font-mono tabular-nums text-ink-2">{int(t.hold_days)}</td>
                <td className="px-s3 py-s2 text-right font-mono tabular-nums text-ink-3">{rp(t.total_cost)}</td>
                <td className="px-s3 py-s2 text-right font-mono tabular-nums text-ink-3">{t.dividends ? rp(t.dividends) : "-"}</td>
                <td className={`px-s3 py-s2 text-right font-mono tabular-nums ${toneCls[tone(t.net_pnl)]}`}>{rp(t.net_pnl, true)}</td>
                <td className={`px-s3 py-s2 text-right font-mono tabular-nums ${toneCls[tone(t.ret_pct)]}`}>{pct(t.ret_pct, 1, true)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} className="px-s3 py-s4 text-center text-ink-3">Tidak ada trade yang cocok.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
