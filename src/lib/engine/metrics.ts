// src/lib/engine/metrics.ts
import type { EngineResult, EngineTrade } from "./engine";
import { daysBetween } from "./num";

export interface LabSummary {
  start: string;
  end: string;
  years: number;
  initial: number;
  final: number;
  cagr: number | null;
  mdd: number;
  calmar: number | null;
  sharpe: number | null;
  sharpe_excess: number | null;
  sortino: number | null;
  monthly_mean: number | null;
  monthly_std: number | null;
  n_months: number;
  record_month_share: number | null;
  longest_months_no_record: number;
  exposure_days: number | null;
  avg_capital_used: number | null;
  losing_years: number;
  n_years_measured: number;
  n_open_at_end: number;
  open_unrealized: number;
  n_trades: number;
  n_wins: number | null;
  n_losses: number | null;
  win_ratio: number | null;
  avg_win_pct: number | null;
  avg_loss_pct: number | null;
  avg_win_rp: number | null;
  avg_loss_rp: number | null;
  gross_win_rp: number | null;
  gross_loss_rp: number | null;
  profit_factor: number | null;
  expectancy_pct: number | null;
  payoff_ratio: number | null;
  trades_per_year: number | null;
  avg_hold_days: number | null;
  avg_hold_bars: number | null;
  total_fee: number | null;
  total_spread: number | null;
  total_cost: number | null;
  gross_pnl: number | null;
  net_pnl: number | null;
  cost_share_of_gross: number | null;
  longest_losing_streak: number | null;
  top10_share_of_net: number | null;
  max_consecutive_wins: number | null;
}

export interface LabSeries {
  dd: Float64Array;
  monthly: { ym: string; ret: number }[];
  yearly: { year: number; ret: number }[];
}

const fin = (v: number): number | null => (Number.isFinite(v) ? v : null);
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

export function cagr(startV: number, endV: number, startD: string, endD: string): number {
  const years = daysBetween(startD, endD) / 365.25;
  if (years <= 0 || startV <= 0 || endV <= 0) return NaN;
  return (endV / startV) ** (1 / years) - 1;
}

function lastPerPeriod(dates: string[], eq: Float64Array, len: number) {
  const out: { key: string; v: number; idx: number }[] = [];
  for (let i = 0; i < dates.length; i++) {
    const key = dates[i]!.slice(0, len);
    const last = out[out.length - 1];
    if (last && last.key === key) { last.v = eq[i]!; last.idx = i; } else out.push({ key, v: eq[i]!, idx: i });
  }
  return out;
}

function tradeStats(trades: EngineTrade[], years: number) {
  const n = trades.length;
  if (!n) return null;
  const wins = trades.filter((t) => t.net_pnl > 0);
  const losses = trades.filter((t) => t.net_pnl <= 0);
  const winRatio = wins.length / n;
  const avgWinPct = wins.length ? mean(wins.map((t) => t.ret_pct)) : 0;
  const avgLossPct = losses.length ? mean(losses.map((t) => t.ret_pct)) : 0;
  const grossWin = wins.reduce((a, t) => a + t.net_pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.net_pnl, 0));
  const totalFee = trades.reduce((a, t) => a + t.fee_buy + t.fee_sell, 0);
  const totalSpread = trades.reduce((a, t) => a + t.spread_cost, 0);
  const grossPnl = trades.reduce((a, t) => a + t.gross_pnl, 0);
  const netPnl = trades.reduce((a, t) => a + t.net_pnl, 0);
  const top10 = [...trades].map((t) => t.net_pnl).sort((a, b) => b - a).slice(0, 10).reduce((a, b) => a + b, 0);
  let streak = 0, best = 0, wStreak = 0, wBest = 0;
  for (const t of trades) {
    if (t.net_pnl <= 0) { streak++; best = Math.max(best, streak); wStreak = 0; }
    else { streak = 0; wStreak++; wBest = Math.max(wBest, wStreak); }
  }
  return {
    n_wins: wins.length,
    n_losses: losses.length,
    win_ratio: winRatio,
    avg_win_pct: avgWinPct,
    avg_loss_pct: avgLossPct,
    avg_win_rp: wins.length ? mean(wins.map((t) => t.net_pnl)) : 0,
    avg_loss_rp: losses.length ? mean(losses.map((t) => t.net_pnl)) : 0,
    gross_win_rp: grossWin,
    gross_loss_rp: grossLoss,
    profit_factor: grossLoss > 0 ? grossWin / grossLoss : null,
    expectancy_pct: winRatio * avgWinPct + (1 - winRatio) * avgLossPct,
    payoff_ratio: avgLossPct !== 0 ? avgWinPct / Math.abs(avgLossPct) : null,
    trades_per_year: years > 0 ? n / years : null,
    avg_hold_days: mean(trades.map((t) => t.hold_days)),
    avg_hold_bars: mean(trades.map((t) => t.hold_bars)),
    total_fee: totalFee,
    total_spread: totalSpread,
    total_cost: totalFee + totalSpread,
    gross_pnl: grossPnl,
    net_pnl: netPnl,
    cost_share_of_gross: grossPnl > 0 ? (totalFee + totalSpread) / grossPnl : null,
    longest_losing_streak: best,
    top10_share_of_net: netPnl > 0 ? top10 / netPnl : null,
    max_consecutive_wins: wBest,
  };
}

export function summarize(r: EngineResult, initial: number, rfAnnual = 0.05): { s: LabSummary; series: LabSeries } {
  const n = r.dates.length;
  const start = r.dates[0] ?? "";
  const end = r.dates[n - 1] ?? "";
  const years = n ? daysBetween(start, end) / 365.25 : 0;
  const final = n ? r.equity[n - 1]! : initial;
  let peak = initial;
  let mdd = 0;
  const dd = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    peak = Math.max(peak, r.equity[i]!);
    dd[i] = r.equity[i]! / peak - 1;
    if (dd[i]! < mdd) mdd = dd[i]!;
  }
  const c = cagr(initial, final, start, end);
  const months = lastPerPeriod(r.dates, r.equity, 7);
  const mret = months.map((m, i) => ({ ym: m.key, ret: m.v / (i ? months[i - 1]!.v : initial) - 1 }));
  const rets = mret.map((m) => m.ret);
  const mm = mean(rets);
  const sd = rets.length > 1 ? Math.sqrt(rets.reduce((a, x) => a + (x - mm) ** 2, 0) / (rets.length - 1)) : NaN;
  const rfM = (1 + rfAnnual) ** (1 / 12) - 1;
  const dsd = rets.length ? Math.sqrt(mean(rets.map((x) => Math.min(x, 0) ** 2))) : NaN;
  let prior = initial;
  let dailyPeak = -Infinity;
  let cursor = 0;
  let longest = 0;
  let run = 0;
  let recs = 0;
  for (const m of months) {
    const flag = m.v >= prior - 1e-6;
    if (flag) recs++;
    run = flag ? 0 : run + 1;
    longest = Math.max(longest, run);
    for (; cursor <= m.idx; cursor++) dailyPeak = Math.max(dailyPeak, r.equity[cursor]!);
    prior = Math.max(prior, dailyPeak);
  }
  const yrs = lastPerPeriod(r.dates, r.equity, 4);
  const yret = yrs.map((y, i) => ({ year: Number(y.key), ret: y.v / (i ? yrs[i - 1]!.v : initial) - 1 }));
  let exp = 0;
  let used = 0;
  let usedN = 0;
  for (let i = 0; i < n; i++) {
    if (r.nOpen[i]! > 0) exp++;
    if (r.equity[i]! > 0) { used += r.invested[i]! / r.equity[i]!; usedN++; }
  }
  const ts = tradeStats(r.trades, years);
  const s: LabSummary = {
    start, end, years, initial, final,
    cagr: fin(c),
    mdd,
    calmar: mdd < 0 && Number.isFinite(c) ? c / Math.abs(mdd) : null,
    sharpe: sd > 0 ? (mm / sd) * Math.sqrt(12) : null,
    sharpe_excess: sd > 0 ? ((mm - rfM) / sd) * Math.sqrt(12) : null,
    sortino: dsd > 0 ? (mm / dsd) * Math.sqrt(12) : null,
    monthly_mean: fin(mm),
    monthly_std: fin(sd),
    n_months: months.length,
    record_month_share: months.length ? recs / months.length : null,
    longest_months_no_record: longest,
    exposure_days: n ? exp / n : null,
    avg_capital_used: usedN ? used / usedN : null,
    losing_years: yret.filter((y) => y.ret < 0).length,
    n_years_measured: yret.length,
    n_open_at_end: r.open.length,
    open_unrealized: r.open.reduce((a, o) => a + o.unrealized_pnl, 0),
    n_trades: r.trades.length,
    n_wins: ts?.n_wins ?? null,
    n_losses: ts?.n_losses ?? null,
    win_ratio: ts?.win_ratio ?? null,
    avg_win_pct: ts?.avg_win_pct ?? null,
    avg_loss_pct: ts?.avg_loss_pct ?? null,
    avg_win_rp: ts?.avg_win_rp ?? null,
    avg_loss_rp: ts?.avg_loss_rp ?? null,
    gross_win_rp: ts?.gross_win_rp ?? null,
    gross_loss_rp: ts?.gross_loss_rp ?? null,
    profit_factor: ts?.profit_factor ?? null,
    expectancy_pct: ts?.expectancy_pct ?? null,
    payoff_ratio: ts?.payoff_ratio ?? null,
    trades_per_year: ts?.trades_per_year ?? null,
    avg_hold_days: ts?.avg_hold_days ?? null,
    avg_hold_bars: ts?.avg_hold_bars ?? null,
    total_fee: ts?.total_fee ?? null,
    total_spread: ts?.total_spread ?? null,
    total_cost: ts?.total_cost ?? null,
    gross_pnl: ts?.gross_pnl ?? null,
    net_pnl: ts?.net_pnl ?? null,
    cost_share_of_gross: ts?.cost_share_of_gross ?? null,
    longest_losing_streak: ts?.longest_losing_streak ?? null,
    top10_share_of_net: ts?.top10_share_of_net ?? null,
    max_consecutive_wins: ts?.max_consecutive_wins ?? null,
  };
  return { s, series: { dd, monthly: mret, yearly: yret } };
}
