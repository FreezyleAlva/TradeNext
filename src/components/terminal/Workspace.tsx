// src/components/terminal/Workspace.tsx
"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { parseTicker, type MarketMeta, type TickerSeries } from "@/lib/engine/market";
import { date, int, pct, rp, rpShort, tone } from "@/lib/format";
import { aggregate, dailyBars, strategyOverlays, trailingStopLine, type Timeframe, type TradeMark } from "@/lib/terminal/indicators";
import { CandleChart, type ChartMark, type OverlayLine } from "./CandleChart";
import type { OfficialTrade, TerminalProps } from "./types";

export interface LabTradeMark {
  ticker: string;
  entry_date: string;
  exit_date: string | null;
  entry_price: number;
  exit_price: number | null;
  net_pnl: number | null;
  ret_pct: number | null;
}

const SPEEDS = [1, 5, 20, 60] as const;

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`tap rounded-sm px-s3 text-xs ${on ? "bg-surface-4 text-ink-1" : "text-ink-3 hover:text-ink-1"}`}>
      {children}
    </button>
  );
}

export function Workspace({
  props,
  meta,
  labTrades,
  labParams,
}: {
  props: TerminalProps;
  meta: MarketMeta | null;
  labTrades: LabTradeMark[] | null;
  labParams: { breakout: number; trend_ma: number; trail_atr: number } | null;
}) {
  const [ticker, setTicker] = useState(() => {
    const counts = new Map<string, number>();
    for (const t of props.trades) counts.set(t.ticker, (counts.get(t.ticker) ?? 0) + (t.net_pnl ?? 0));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? props.tickers[0] ?? "";
  });
  const [query, setQuery] = useState("");
  const [series, setSeries] = useState<{ t: string; s: TickerSeries } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [tf, setTf] = useState<Timeframe>("D");
  const [log, setLog] = useState(false);
  const [show, setShow] = useState({ ma: true, hh: true, stop: true, marks: true });
  const [source, setSource] = useState<"official" | "lab">("official");
  const [replay, setReplay] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(5);
  const [focus, setFocus] = useState<{ bar: number; nonce: number } | null>(null);

  const dates = meta?.dates ?? [];
  const n = dates.length;

  useEffect(() => {
    if (!meta || !ticker) return;
    const ctrl = new AbortController();
    setLoadErr(null);
    fetch(`/data/t/${ticker}.bin`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((b) => setSeries({ t: ticker, s: parseTicker(b, meta.n) }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setLoadErr(`Data ${ticker} gagal dimuat: ${(e as Error).message}`);
      });
    return () => ctrl.abort();
  }, [meta, ticker]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let carry = 0;
    const id = window.setInterval(() => {
      const now = performance.now();
      carry += ((now - last) * speed) / 1000;
      last = now;
      const steps = Math.floor(carry);
      if (steps < 1) return;
      carry -= steps;
      setCursor((c) => Math.min(n - 1, c + steps));
    }, Math.max(16, Math.round(1000 / speed)));
    return () => window.clearInterval(id);
  }, [playing, speed, n]);

  useEffect(() => {
    if (playing && cursor >= n - 1) setPlaying(false);
  }, [playing, cursor, n]);

  const cursorInit = useRef(false);
  useEffect(() => {
    if (!n || cursorInit.current) return;
    cursorInit.current = true;
    setCursor(Math.max(0, dates.indexOf(props.meta.backtest_start)));
  }, [n, dates, props.meta.backtest_start]);

  const usingLab = source === "lab" && labTrades !== null;
  const params = usingLab && labParams ? labParams : props.params;
  const tradeList: (OfficialTrade | LabTradeMark)[] = useMemo(
    () => (usingLab ? labTrades ?? [] : props.trades).filter((t) => t.ticker === ticker),
    [usingLab, labTrades, props.trades, ticker],
  );

  const view = useMemo(() => {
    if (!series || series.t !== ticker || !n) return null;
    const s = series.s;
    const daily = dailyBars(s, dates);
    const bars = aggregate(daily, tf);
    const ov = strategyOverlays(s, params.breakout, params.trend_ma);
    const pos = new Map(dates.map((d, i) => [d, i]));
    const tm: TradeMark[] = tradeList.map((t) => ({
      entryIdx: pos.get(t.entry_date) ?? 0,
      exitIdx: t.exit_date ? pos.get(t.exit_date) ?? null : null,
      entryPrice: t.entry_price,
      exitPrice: t.exit_price,
      net: t.net_pnl,
      ret: t.ret_pct,
      label: t.entry_date,
    }));
    const stop = trailingStopLine(s, ov.atr, tm, params.trail_atr);
    const pick = (arr: Float64Array) => bars.idx.map((i) => arr[i]!);
    const barOf = new Map(bars.idx.map((i, k) => [i, k]));
    const nearestBar = (i: number) => {
      for (let j = i; j < n; j++) { const k = barOf.get(j); if (k !== undefined) return k; }
      return bars.idx.length - 1;
    };
    const tfBar = (dailyIdx: number) => {
      if (tf === "D") return nearestBar(dailyIdx);
      let lo = 0, hi = bars.idx.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (bars.idx[mid]! < dailyIdx) lo = mid + 1; else hi = mid; }
      return lo;
    };
    const marks: ChartMark[] = [];
    for (const t of tm) {
      const f = s.factor[t.entryIdx]! || 1;
      marks.push({ bar: tfBar(t.entryIdx), kind: "buy", price: t.entryPrice / f, tone: "neutral", text: "B" });
      if (t.exitIdx !== null && t.exitPrice !== null) {
        const fx = s.factor[t.exitIdx]! || 1;
        marks.push({ bar: tfBar(t.exitIdx), kind: "sell", price: t.exitPrice / fx, tone: tone(t.net), text: "S" });
      }
    }
    return { bars, ma: pick(ov.ma), hh: pick(ov.hh), stop: pick(stop), marks, tm, tfBar };
  }, [series, ticker, n, dates, tf, params, tradeList]);

  const limitBar = useMemo(() => {
    if (!view) return 0;
    if (!replay) return view.bars.dates.length - 1;
    let lo = 0, hi = view.bars.idx.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (view.bars.idx[mid]! <= cursor) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return Math.max(0, ans);
  }, [view, replay, cursor]);

  const overlays: OverlayLine[] = useMemo(() => {
    if (!view || tf !== "D") return [];
    const o: OverlayLine[] = [];
    if (show.ma) o.push({ name: `SMA${params.trend_ma}`, values: view.ma, color: "chart-benchmark-1" });
    if (show.hh) o.push({ name: `High ${params.breakout}h`, values: view.hh, color: "blue-3", dashed: true });
    if (show.stop) o.push({ name: `Stop ${params.trail_atr}xATR`, values: view.stop, color: "warning" });
    return o;
  }, [view, tf, show, params]);

  const marks = useMemo(() => {
    if (!view || !show.marks) return [];
    return replay ? view.marks.filter((m) => m.bar <= limitBar) : view.marks;
  }, [view, show.marks, replay, limitBar]);

  const filtered = props.tickers.filter((t) => t.includes(query.trim().toUpperCase()));
  const cursorDate = dates[cursor] ?? "";
  const eqIdx = useMemo(() => {
    const E = props.equity.d;
    let lo = 0, hi = E.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (E[mid]! <= cursorDate) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }, [props.equity.d, cursorDate]);
  const openNow = useMemo(
    () => (replay ? props.trades.filter((t) => t.entry_date <= cursorDate && (!t.exit_date || t.exit_date > cursorDate)) : []),
    [replay, props.trades, cursorDate],
  );
  const tickerStats = useMemo(() => {
    const done = tradeList.filter((t) => t.net_pnl !== null);
    return { n: tradeList.length, net: done.reduce((a, t) => a + (t.net_pnl ?? 0), 0), wins: done.filter((t) => (t.net_pnl ?? 0) > 0).length };
  }, [tradeList]);

  return (
    <div className="flex flex-col gap-s3">
      <div className="flex flex-wrap items-center gap-s2 rounded-md bg-surface-1 p-s2">
        <label className="flex items-center gap-s2 rounded-sm bg-surface-2 px-s2">
          <Icon name="search" className="size-s4 text-ink-3" />
          <span className="sr-only">Cari saham</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari kode" className="tap ticker-input min-w-0 bg-transparent text-sm uppercase text-ink-1 placeholder:normal-case placeholder:text-ink-4 focus:outline-none" />
        </label>
        <label className="flex items-center gap-s2 text-xs text-ink-3">
          <span className="sr-only">Pilih saham</span>
          <select value={ticker} onChange={(e) => setTicker(e.target.value)} className="tap rounded-sm bg-surface-2 px-s2 font-mono text-sm text-ink-1">
            {(filtered.length ? filtered : props.tickers).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <div className="flex gap-s1 rounded-sm bg-surface-2 p-s1" role="group" aria-label="Timeframe">
          {(["D", "W", "M"] as const).map((x) => <Toggle key={x} on={tf === x} onClick={() => setTf(x)}>{x === "D" ? "1H" : x === "W" ? "1M" : "1B"}</Toggle>)}
        </div>
        <div className="flex gap-s1 rounded-sm bg-surface-2 p-s1" role="group" aria-label="Skala dan indikator">
          <Toggle on={log} onClick={() => setLog((v) => !v)}>Log</Toggle>
          <Toggle on={show.ma} onClick={() => setShow((s) => ({ ...s, ma: !s.ma }))}>SMA</Toggle>
          <Toggle on={show.hh} onClick={() => setShow((s) => ({ ...s, hh: !s.hh }))}>Breakout</Toggle>
          <Toggle on={show.stop} onClick={() => setShow((s) => ({ ...s, stop: !s.stop }))}>Stop</Toggle>
          <Toggle on={show.marks} onClick={() => setShow((s) => ({ ...s, marks: !s.marks }))}>Trade</Toggle>
        </div>
        <div className="flex gap-s1 rounded-sm bg-surface-2 p-s1" role="group" aria-label="Sumber trade">
          <Toggle on={source === "official"} onClick={() => setSource("official")}>Resmi</Toggle>
          <Toggle on={source === "lab"} onClick={() => setSource("lab")}>{labTrades ? "Lab" : "Lab (belum run)"}</Toggle>
        </div>
        <Toggle on={replay} onClick={() => { setReplay((v) => !v); setPlaying(false); }}>
          <span className="flex items-center gap-s1"><Icon name="clock" className="size-s3" />Replay</span>
        </Toggle>
      </div>

      {replay ? (
        <div className="flex flex-col gap-s2 rounded-md bg-surface-1 p-s3">
          <div className="flex flex-wrap items-center gap-s2">
            <button type="button" className="tap rounded-sm bg-surface-3 px-s3 text-sm text-ink-1" onClick={() => setCursor((c) => Math.max(0, c - 1))} aria-label="Mundur satu bar">-1</button>
            <button type="button" className="tap rounded-sm bg-cyan-1 px-s4 text-sm text-ink-1" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>{playing ? "Jeda" : "Putar"}</button>
            <button type="button" className="tap rounded-sm bg-surface-3 px-s3 text-sm text-ink-1" onClick={() => setCursor((c) => Math.min(n - 1, c + 1))} aria-label="Maju satu bar">+1</button>
            <button type="button" className="tap rounded-sm bg-surface-3 px-s3 text-sm text-ink-1" onClick={() => setCursor((c) => Math.min(n - 1, c + 21))} aria-label="Maju satu bulan">+1 bln</button>
            <div className="flex gap-s1 rounded-sm bg-surface-2 p-s1" role="group" aria-label="Kecepatan replay">
              {SPEEDS.map((sp) => <Toggle key={sp} on={speed === sp} onClick={() => setSpeed(sp)}>{sp} bar/dtk</Toggle>)}
            </div>
            <label className="flex items-center gap-s2 text-xs text-ink-3">
              Lompat ke
              <input type="date" min={dates[0]} max={dates[n - 1]} value={cursorDate} onChange={(e) => { const i = dates.findIndex((d) => d >= e.target.value); if (i >= 0) setCursor(i); }} className="tap rounded-sm bg-surface-2 px-s2 font-mono text-ink-1" />
            </label>
          </div>
          <input type="range" min={0} max={Math.max(0, n - 1)} value={cursor} onChange={(e) => setCursor(Number(e.target.value))} aria-label="Posisi replay" className="w-full accent-cyan-2" />
          <div className="stat-grid grid gap-s2">
            <ReplayStat label="Tanggal replay" value={date(cursorDate)} />
            <ReplayStat label="Ekuitas strategi resmi" value={eqIdx >= 0 ? rp(props.equity.v[eqIdx]) : "-"} sub={eqIdx < 0 ? "sebelum periode backtest" : undefined} />
            <ReplayStat label="Drawdown" value={eqIdx >= 0 ? pct(props.equity.dd[eqIdx]) : "-"} toneCls={eqIdx >= 0 && (props.equity.dd[eqIdx] ?? 0) < 0 ? "text-negative" : "text-ink-1"} />
            <ReplayStat label="Posisi terbuka" value={`${int(openNow.length)} / ${props.meta.max_positions}`} sub={openNow.map((t) => t.ticker).join(", ") || "kas penuh"} />
          </div>
        </div>
      ) : null}

      <div className="terminal-grid grid gap-s3">
        <div className="min-w-0 rounded-md bg-surface-1 p-s2">
          {loadErr ? <p className="p-s3 text-sm text-negative">{loadErr}</p> : null}
          {view ? (
            <CandleChart title={ticker} bars={view.bars} limit={limitBar} overlays={overlays} marks={marks} log={log} height={480} focus={focus} />
          ) : (
            <div className="flex items-center justify-center rounded-md bg-surface-2 p-s7 text-sm text-ink-3">{meta ? `Memuat ${ticker}` : "Memuat data pasar lokal"}</div>
          )}
          <p className="mt-s2 px-s1 text-xs text-ink-3">
            Harga disesuaikan split (sama dengan yang dipakai sinyal). Penanda B/S dari {usingLab ? "run lab terakhir" : "log trade resmi results.json"}; harga eksekusi dipetakan ke skala yang disesuaikan.
            {tf !== "D" ? " Indikator strategi hanya tampil di timeframe harian." : ""} Seret untuk geser, roda mouse untuk zoom, klik ganda untuk reset.
          </p>
        </div>
        <aside className="flex min-w-0 flex-col gap-s2 rounded-md bg-surface-1 p-s3">
          <h3 className="flex items-center justify-between text-sm font-semibold text-ink-1">
            <span className="font-mono">{ticker}</span>
            <span className="text-xs font-normal text-ink-3">{usingLab ? "trade lab" : "trade resmi"}</span>
          </h3>
          <div className="grid grid-cols-3 gap-s2 text-xs">
            <ReplayStat label="Trade" value={int(tickerStats.n)} />
            <ReplayStat label="Menang" value={int(tickerStats.wins)} />
            <ReplayStat label="Laba" value={rpShort(tickerStats.net)} toneCls={tickerStats.net > 0 ? "text-positive" : tickerStats.net < 0 ? "text-negative" : "text-ink-1"} />
          </div>
          <ul className="side-trades flex flex-col gap-s1 overflow-y-auto text-xs">
            {tradeList.length === 0 ? <li className="text-ink-3">Tidak ada trade di saham ini.</li> : null}
            {tradeList.map((t) => (
              <li key={`${t.entry_date}-${t.exit_date}`}>
                <button
                  type="button"
                  className="tap flex w-full items-center justify-between gap-s2 rounded-sm bg-surface-2 px-s2 py-s1 text-left hover:bg-surface-3"
                  onClick={() => {
                    if (!view) return;
                    const i = dates.indexOf(t.entry_date);
                    if (i >= 0) { setReplay(false); setPlaying(false); setFocus({ bar: view.tfBar(i), nonce: Date.now() }); }
                  }}
                  aria-label={`Tampilkan trade ${ticker} ${date(t.entry_date)} di chart`}
                >
                <span className="flex flex-col">
                  <span className="text-ink-2">{date(t.entry_date)}</span>
                  <span className="text-ink-3">{t.exit_date ? date(t.exit_date) : "terbuka"}</span>
                </span>
                <span className={`font-mono tabular-nums ${tone(t.ret_pct) === "positive" ? "text-positive" : tone(t.ret_pct) === "negative" ? "text-negative" : "text-ink-2"}`}>{pct(t.ret_pct, 1, true)}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function ReplayStat({ label, value, sub, toneCls = "text-ink-1" }: { label: string; value: string; sub?: string; toneCls?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-s1 rounded-sm bg-surface-2 p-s2">
      <span className="text-xs text-ink-3">{label}</span>
      <span className={`truncate font-mono text-sm tabular-nums ${toneCls}`}>{value}</span>
      {sub ? <span className="truncate text-xs text-ink-3">{sub}</span> : null}
    </div>
  );
}
