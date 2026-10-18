// src/lib/terminal/indicators.ts
import { fmax, rollingMaxShift1, rollingMean } from "@/lib/engine/num";
import type { TickerSeries } from "@/lib/engine/market";

export type Timeframe = "D" | "W" | "M";

export interface Bars {
  idx: number[];
  dates: string[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
}

export function dailyBars(s: TickerSeries, dates: string[]): Bars {
  const out: Bars = { idx: [], dates: [], o: [], h: [], l: [], c: [], v: [] };
  for (let i = 0; i < dates.length; i++) {
    const c = s.close[i]!;
    if (!Number.isFinite(c) || !Number.isFinite(s.open[i]!)) continue;
    out.idx.push(i);
    out.dates.push(dates[i]!);
    out.o.push(s.open[i]!);
    out.h.push(s.high[i]!);
    out.l.push(s.low[i]!);
    out.c.push(c);
    out.v.push(s.volume[i]!);
  }
  return out;
}

function weekKey(d: string): string {
  const t = Date.parse(`${d}T00:00:00Z`);
  const day = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - day * 86400000).toISOString().slice(0, 10);
}

export function aggregate(b: Bars, tf: Timeframe): Bars {
  if (tf === "D") return b;
  const key = tf === "W" ? weekKey : (d: string) => d.slice(0, 7);
  const out: Bars = { idx: [], dates: [], o: [], h: [], l: [], c: [], v: [] };
  let cur = "";
  for (let i = 0; i < b.dates.length; i++) {
    const k = key(b.dates[i]!);
    const last = out.dates.length - 1;
    if (k !== cur) {
      cur = k;
      out.idx.push(b.idx[i]!);
      out.dates.push(b.dates[i]!);
      out.o.push(b.o[i]!);
      out.h.push(b.h[i]!);
      out.l.push(b.l[i]!);
      out.c.push(b.c[i]!);
      out.v.push(b.v[i]!);
    } else {
      out.idx[last] = b.idx[i]!;
      out.dates[last] = b.dates[i]!;
      out.h[last] = Math.max(out.h[last]!, b.h[i]!);
      out.l[last] = Math.min(out.l[last]!, b.l[i]!);
      out.c[last] = b.c[i]!;
      out.v[last] = out.v[last]! + b.v[i]!;
    }
  }
  return out;
}

export interface Overlays {
  ma: Float64Array;
  hh: Float64Array;
  atr: Float64Array;
}

export function strategyOverlays(s: TickerSeries, breakout: number, trendMa: number, atrWindow = 20): Overlays {
  const n = s.close.length;
  const tr = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const pc = i > 0 ? s.close[i - 1]! : NaN;
    const h = s.high[i]!;
    const l = s.low[i]!;
    tr[i] = fmax(h - l, fmax(Math.abs(h - pc), Math.abs(l - pc)));
  }
  return { ma: rollingMean(s.close, trendMa), hh: rollingMaxShift1(s.high, breakout), atr: rollingMean(tr, atrWindow) };
}

export interface TradeMark {
  entryIdx: number;
  exitIdx: number | null;
  entryPrice: number;
  exitPrice: number | null;
  net: number | null;
  ret: number | null;
  label: string;
}

export function trailingStopLine(s: TickerSeries, atr: Float64Array, marks: TradeMark[], trail: number): Float64Array {
  const n = s.close.length;
  const out = new Float64Array(n).fill(NaN);
  for (const t of marks) {
    let hc = Number.isFinite(s.close[t.entryIdx]!) ? s.close[t.entryIdx]! : s.open[t.entryIdx]!;
    const end = t.exitIdx ?? n - 1;
    for (let i = t.entryIdx; i <= end && i < n; i++) {
      const c = s.close[i]!;
      if (Number.isFinite(c)) hc = Math.max(hc, c);
      const a = atr[i]!;
      if (Number.isFinite(a)) out[i] = hc - trail * a;
    }
  }
  return out;
}
