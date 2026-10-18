// src/lib/engine/market.ts
import { fmax, rollingMaxShift1, rollingMean } from "./num";

export interface MarketIndexEntry {
  ticker: string;
  symbol: string;
  first: string | null;
  last: string | null;
  rows: number;
  sha256: string | null;
}

export interface MarketMeta {
  source: string;
  downloaded_on: string;
  fields: string[];
  n: number;
  dates: string[];
  bench: Record<string, (number | null)[]>;
  tickers: MarketIndexEntry[];
}

export interface TickerSeries {
  open: Float64Array;
  high: Float64Array;
  low: Float64Array;
  close: Float64Array;
  volume: Float64Array;
  split: Float64Array;
  divRaw: Float64Array;
  factor: Float64Array;
}

export interface Derived {
  tradable: Uint8Array;
  lockUp: Uint8Array;
  lockDown: Uint8Array;
  adv: Float64Array;
  rawOpen: Float64Array;
  rawClose: Float64Array;
  markClose: Float64Array;
  atr: Float64Array;
  roc: Float64Array;
  baseEligible: Uint8Array;
}

export const MARKET_RULES = {
  liquidityWindow: 20,
  lockMove: 0.065,
  atrWindow: 20,
  rankWindow: 120,
  regimeMa: 200,
  minAdv: 5_000_000_000,
  minPrice: 100,
};

export function parseTicker(buf: ArrayBuffer, n: number): TickerSeries {
  const f = new Float64Array(buf);
  const col = (k: number) => f.subarray(k * n, (k + 1) * n);
  return {
    open: col(0), high: col(1), low: col(2), close: col(3),
    volume: col(4), split: col(5), divRaw: col(6), factor: col(7),
  };
}

export function derive(s: TickerSeries): Derived {
  const n = s.close.length;
  const R = MARKET_RULES;
  const tradable = new Uint8Array(n);
  const lockUp = new Uint8Array(n);
  const lockDown = new Uint8Array(n);
  const value = new Float64Array(n);
  const rawOpen = new Float64Array(n);
  const rawClose = new Float64Array(n);
  const markClose = new Float64Array(n);
  const tr = new Float64Array(n);
  const roc = new Float64Array(n).fill(NaN);
  let ff = NaN;
  for (let i = 0; i < n; i++) {
    const c = s.close[i]!;
    const prevFf = ff;
    if (!Number.isNaN(c)) ff = c;
    const move = c / prevFf - 1;
    const flat = Math.abs(s.high[i]! - s.low[i]!) < 1e-9;
    lockUp[i] = flat && move >= R.lockMove ? 1 : 0;
    lockDown[i] = flat && move <= -R.lockMove ? 1 : 0;
    tradable[i] = !Number.isNaN(c) && s.volume[i]! > 0 && s.open[i]! > 0 ? 1 : 0;
    value[i] = tradable[i] ? c * s.volume[i]! : NaN;
    rawOpen[i] = s.open[i]! * s.factor[i]!;
    rawClose[i] = c * s.factor[i]!;
    markClose[i] = ff * s.factor[i]!;
    const pc = i > 0 ? s.close[i - 1]! : NaN;
    const h = s.high[i]!;
    const l = s.low[i]!;
    tr[i] = fmax(h - l, fmax(Math.abs(h - pc), Math.abs(l - pc)));
    if (i >= R.rankWindow) roc[i] = c / s.close[i - R.rankWindow]! - 1;
  }
  const adv = rollingMean(value, R.liquidityWindow);
  const atr = rollingMean(tr, R.atrWindow);
  const baseEligible = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = Number.isNaN(adv[i]!) ? 0 : adv[i]!;
    const rc = Number.isNaN(rawClose[i]!) ? 0 : rawClose[i]!;
    baseEligible[i] = tradable[i] && a >= R.minAdv && rc >= R.minPrice && Number.isFinite(atr[i]!) && Number.isFinite(roc[i]!) ? 1 : 0;
  }
  return { tradable, lockUp, lockDown, adv, rawOpen, rawClose, markClose, atr, roc, baseEligible };
}

export function regimeOf(ihsg: (number | null)[]): Uint8Array {
  const v = Float64Array.from(ihsg, (x) => (x === null ? NaN : x));
  const ma = rollingMean(v, MARKET_RULES.regimeMa);
  const out = new Uint8Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i]! > ma[i]! ? 1 : 0;
  return out;
}

export class Market {
  readonly dates: string[];
  readonly n: number;
  readonly tickers: string[];
  readonly series: TickerSeries[];
  readonly d: Derived[];
  readonly regime: Uint8Array;
  readonly bench: Record<string, (number | null)[]>;
  private hhCache = new Map<number, Float64Array[]>();
  private maCache = new Map<number, Float64Array[]>();

  constructor(meta: MarketMeta, series: TickerSeries[]) {
    this.dates = meta.dates;
    this.n = meta.n;
    this.tickers = meta.tickers.map((t) => t.ticker);
    this.series = series;
    this.d = series.map(derive);
    this.bench = meta.bench;
    this.regime = regimeOf(meta.bench.IHSG ?? []);
  }

  hh(w: number): Float64Array[] {
    let c = this.hhCache.get(w);
    if (!c) {
      c = this.series.map((s) => rollingMaxShift1(s.high, w));
      this.hhCache.set(w, c);
    }
    return c;
  }

  ma(w: number): Float64Array[] {
    let c = this.maCache.get(w);
    if (!c) {
      c = this.series.map((s) => rollingMean(s.close, w));
      this.maCache.set(w, c);
    }
    return c;
  }

  sliceIndex(start: string, end: string): [number, number] {
    let i0 = this.dates.findIndex((x) => x >= start);
    if (i0 < 0) i0 = this.n;
    let i1 = -1;
    for (let i = this.n - 1; i >= 0; i--) if (this.dates[i]! <= end) { i1 = i; break; }
    return [i0, i1];
  }
}
