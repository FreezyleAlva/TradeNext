// src/lib/engine/engine.ts
import type { Market } from "./market";
import { daysBetween, pyFloorDiv, roundHalfEven } from "./num";

export interface StrategyParams {
  breakout: number;
  trend_ma: number;
  trail_atr: number;
}

export interface RunConfig {
  start: string;
  end: string;
  params: StrategyParams;
  initial: number;
  maxPositions: number;
  positionFraction: number;
  feeBuy: number;
  feeSell: number;
  spreadTicks: number;
  delay: number;
  lotSize: number;
  liquidityCap: number;
  dividendTax: number;
  compounding: boolean;
}

export const DEFAULT_CONFIG: Omit<RunConfig, "start" | "end" | "params"> = {
  initial: 100_000_000,
  maxPositions: 10,
  positionFraction: 0.1,
  feeBuy: 0.0015,
  feeSell: 0.0025,
  spreadTicks: 1,
  delay: 0,
  lotSize: 100,
  liquidityCap: 0.05,
  dividendTax: 0.1,
  compounding: true,
};

export interface EngineTrade {
  ticker: string;
  signal_date: string;
  entry_date: string;
  entry_price: number;
  entry_shares: number;
  entry_lots: number;
  exit_signal_date: string;
  exit_date: string;
  exit_price: number;
  exit_shares: number;
  fee_buy: number;
  fee_sell: number;
  spread_cost: number;
  dividends: number;
  cost_basis: number;
  gross_pnl: number;
  net_pnl: number;
  ret_pct: number;
  hold_days: number;
  hold_bars: number;
  entry_equity: number;
  exit_reason: string;
}

export interface EngineOpen {
  ticker: string;
  entry_date: string;
  entry_price: number;
  shares: number;
  cost_basis: number;
  mark_price: number;
  unrealized_pnl: number;
  unrealized_pct: number;
  exit_pending: boolean;
}

export interface EngineResult {
  dates: string[];
  equity: Float64Array;
  cash: Float64Array;
  invested: Float64Array;
  nOpen: Int32Array;
  trades: EngineTrade[];
  open: EngineOpen[];
  blocked: Record<string, number>;
}

interface Position {
  j: number;
  signalDate: string;
  entryIdx: number;
  entryPrice: number;
  entryMid: number;
  entryShares: number;
  shares: number;
  feeBuy: number;
  spreadBuy: number;
  entryEquity: number;
  highestClose: number;
  dividends: number;
  exitPending: boolean;
  exitReason: string;
  exitSignalDate: string;
  exitExecIdx: number;
}

export function tickSize(p: number): number {
  if (p < 200) return 1;
  if (p < 500) return 2;
  if (p < 2000) return 5;
  if (p < 5000) return 10;
  return 25;
}

export function roundToTick(price: number): number {
  const t = tickSize(price);
  const r = roundHalfEven(price / t) * t;
  const t2 = tickSize(r);
  return roundHalfEven(r / t2) * t2;
}

export function offerPrice(rawOpen: number, ticks: number): number {
  let out = roundToTick(rawOpen);
  for (let k = 0; k < ticks; k++) out = out + tickSize(out);
  return out;
}

export function bidPrice(rawOpen: number, ticks: number): number {
  let out = roundToTick(rawOpen);
  for (let k = 0; k < ticks; k++) out = out - tickSize(Math.max(out - 1e-9, 1));
  return Math.max(out, 1);
}

export function runBacktest(m: Market, cfg: RunConfig): EngineResult {
  const [i0, i1] = m.sliceIndex(cfg.start, cfg.end);
  const n = Math.max(0, i1 - i0 + 1);
  const T = m.tickers.length;
  const trail = cfg.params.trail_atr;
  const hh = m.hh(Math.round(cfg.params.breakout));
  const ma = m.ma(Math.round(cfg.params.trend_ma));
  const S = m.series;
  const D = m.d;
  const dates = m.dates;

  let cash = cfg.initial;
  const positions = new Map<number, Position>();
  const pending = new Map<number, { j: number; score: number; sig: number }[]>();
  const trades: EngineTrade[] = [];
  const blocked: Record<string, number> = { buy_lock_up: 0, buy_untradable: 0, buy_liquidity_capped: 0, buy_too_small: 0, sell_lock_down: 0, sell_untradable: 0, buy_no_slot: 0 };
  const eq = new Float64Array(n);
  const cashArr = new Float64Array(n);
  const invArr = new Float64Array(n);
  const nOpen = new Int32Array(n);
  let lastEquity = cash;
  const trailLabel = `Trailing stop: close < highest close - ${trail} x ATR20`;

  const closePosition = (p: Position, d: number, price: number, mid: number, reason: string) => {
    const proceeds = price * p.shares;
    const fee = proceeds * cfg.feeSell;
    cash += proceeds - fee;
    const cost = p.entryPrice * p.entryShares + p.feeBuy;
    const net = proceeds - fee - cost + p.dividends;
    const gross = mid * p.shares - p.entryMid * p.entryShares + p.dividends;
    const spreadSell = (mid - price) * p.shares;
    trades.push({
      ticker: m.tickers[p.j]!,
      signal_date: p.signalDate,
      entry_date: dates[p.entryIdx]!,
      entry_price: p.entryPrice,
      entry_shares: p.entryShares,
      entry_lots: Math.floor(p.entryShares / cfg.lotSize),
      exit_signal_date: p.exitSignalDate,
      exit_date: dates[d]!,
      exit_price: price,
      exit_shares: p.shares,
      fee_buy: p.feeBuy,
      fee_sell: fee,
      spread_cost: p.spreadBuy + spreadSell,
      dividends: p.dividends,
      cost_basis: cost,
      gross_pnl: gross,
      net_pnl: net,
      ret_pct: net / cost,
      hold_days: daysBetween(dates[p.entryIdx]!, dates[d]!),
      hold_bars: d - p.entryIdx,
      entry_equity: p.entryEquity,
      exit_reason: reason,
    });
  };

  for (let k = 0; k < n; k++) {
    const d = i0 + k;
    for (const p of [...positions.values()]) {
      const s = S[p.j]!.split[d]!;
      if (s !== 1 && Number.isFinite(s) && s > 0) p.shares = Math.floor(p.shares * s + 1e-9);
      const dv = S[p.j]!.divRaw[d]!;
      if (dv > 0) {
        const net = dv * p.shares * (1 - cfg.dividendTax);
        p.dividends += net;
        cash += net;
      }
    }

    for (const [j, p] of [...positions.entries()]) {
      if (!p.exitPending || p.exitExecIdx > d) continue;
      if (D[j]!.tradable[d]! <= 0) { blocked.sell_untradable!++; continue; }
      if (D[j]!.lockDown[d]! > 0) { blocked.sell_lock_down!++; continue; }
      const ro = D[j]!.rawOpen[d]!;
      closePosition(p, d, bidPrice(ro, cfg.spreadTicks), roundToTick(ro), p.exitReason);
      positions.delete(j);
    }

    const orders = pending.get(d);
    if (orders) {
      pending.delete(d);
      orders.sort((a, b) => b.score - a.score);
      const sizing = cfg.compounding ? lastEquity : cfg.initial;
      for (const o of orders) {
        const j = o.j;
        if (positions.has(j)) continue;
        if (positions.size >= cfg.maxPositions) { blocked.buy_no_slot!++; continue; }
        if (D[j]!.tradable[d]! <= 0) { blocked.buy_untradable!++; continue; }
        if (D[j]!.lockUp[d]! > 0) { blocked.buy_lock_up!++; continue; }
        const ro = D[j]!.rawOpen[d]!;
        const mid = roundToTick(ro);
        const price = offerPrice(ro, cfg.spreadTicks);
        let target = sizing * cfg.positionFraction;
        const liq = cfg.liquidityCap * D[j]!.adv[o.sig]!;
        if (liq < target) { blocked.buy_liquidity_capped!++; target = liq; }
        const budget = Math.min(target, cash);
        const lots = Math.trunc(pyFloorDiv(budget, price * cfg.lotSize * (1 + cfg.feeBuy)));
        if (!(lots >= 1)) { blocked.buy_too_small!++; continue; }
        const shares = lots * cfg.lotSize;
        const fee = price * shares * cfg.feeBuy;
        cash -= price * shares + fee;
        const c = S[j]!.close[d]!;
        positions.set(j, {
          j,
          signalDate: dates[o.sig]!,
          entryIdx: d,
          entryPrice: price,
          entryMid: mid,
          entryShares: shares,
          shares,
          feeBuy: fee,
          spreadBuy: (price - mid) * shares,
          entryEquity: sizing,
          highestClose: Number.isFinite(c) ? c : S[j]!.open[d]!,
          dividends: 0,
          exitPending: false,
          exitReason: "",
          exitSignalDate: "",
          exitExecIdx: 0,
        });
      }
    }

    let invested = 0;
    for (const [j, p] of positions) invested += p.shares * D[j]!.markClose[d]!;
    const equity = cash + invested;
    eq[k] = equity;
    cashArr[k] = cash;
    invArr[k] = invested;
    nOpen[k] = positions.size;
    lastEquity = equity;

    const exec = d + 1 + cfg.delay;
    if (exec > i1) continue;
    for (const [j, p] of positions) {
      const c = S[j]!.close[d]!;
      if (!Number.isFinite(c) || p.exitPending) continue;
      p.highestClose = Math.max(p.highestClose, c);
      const atr = D[j]!.atr[d]!;
      if (Number.isFinite(atr) && c < p.highestClose - trail * atr) {
        p.exitPending = true;
        p.exitReason = trailLabel;
        p.exitSignalDate = dates[d]!;
        p.exitExecIdx = exec;
      }
    }
    if (m.regime[d]) {
      let list = pending.get(exec);
      for (let j = 0; j < T; j++) {
        if (!D[j]!.baseEligible[d]) continue;
        const c = S[j]!.close[d]!;
        const h = hh[j]![d]!;
        const a = ma[j]![d]!;
        if (!(c > h && c > a)) continue;
        if (positions.has(j)) continue;
        if (!list) { list = []; pending.set(exec, list); }
        list.push({ j, score: D[j]!.roc[d]!, sig: d });
      }
    }
  }

  const open: EngineOpen[] = [];
  if (n > 0) {
    for (const [j, p] of positions) {
      const mark = D[j]!.markClose[i1]!;
      const cost = p.entryPrice * p.entryShares + p.feeBuy;
      const value = mark * p.shares;
      open.push({
        ticker: m.tickers[j]!,
        entry_date: dates[p.entryIdx]!,
        entry_price: p.entryPrice,
        shares: p.shares,
        cost_basis: cost,
        mark_price: mark,
        unrealized_pnl: value - cost + p.dividends,
        unrealized_pct: (value - cost + p.dividends) / cost,
        exit_pending: p.exitPending,
      });
    }
  }

  return { dates: dates.slice(i0, i1 + 1), equity: eq, cash: cashArr, invested: invArr, nOpen, trades, open, blocked };
}
