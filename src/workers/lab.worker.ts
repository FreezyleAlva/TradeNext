// src/workers/lab.worker.ts
import { runBacktest, type RunConfig } from "@/lib/engine/engine";
import { Market, parseTicker, type MarketMeta } from "@/lib/engine/market";
import { summarize } from "@/lib/engine/metrics";
import type { FromWorker, LabRun, OptCell, ToWorker } from "@/lib/engine/protocol";

const ctx = self as unknown as { postMessage: (m: FromWorker) => void; onmessage: ((e: MessageEvent<ToWorker>) => void) | null };
let marketP: Promise<Market> | null = null;
const cancelled = new Set<number>();

async function loadMarket(): Promise<Market> {
  const t0 = performance.now();
  const meta = (await (await fetch("/data/market.json")).json()) as MarketMeta;
  const bufs = await Promise.all(meta.tickers.map(async (t) => {
    const r = await fetch(`/data/t/${t.ticker}.bin`);
    if (!r.ok) throw new Error(`Gagal memuat data ${t.ticker} (${r.status})`);
    return r.arrayBuffer();
  }));
  const m = new Market(meta, bufs.map((b) => parseTicker(b, meta.n)));
  ctx.postMessage({ kind: "ready", ms: Math.round(performance.now() - t0), tickers: m.tickers.length, days: m.n, first: m.dates[0] ?? "", last: m.dates[m.n - 1] ?? "" });
  return m;
}

function normBench(m: Market, name: string, dates: string[], initial: number): number[] {
  const b = m.bench[name] ?? [];
  const i0 = m.dates.indexOf(dates[0] ?? "");
  const base = b[i0] ?? null;
  return dates.map((_, k) => {
    const v = b[i0 + k] ?? null;
    return v !== null && base ? (v / base) * initial : NaN;
  });
}

function doRun(m: Market, cfg: RunConfig): LabRun {
  const t0 = performance.now();
  const r = runBacktest(m, cfg);
  const { s, series } = summarize(r, cfg.initial);
  return {
    cfg,
    summary: s,
    dates: r.dates,
    equity: Array.from(r.equity),
    dd: Array.from(series.dd),
    nOpen: Array.from(r.nOpen),
    bench: { ihsg: normBench(m, "IHSG", r.dates, cfg.initial), lq45: normBench(m, "LQ45", r.dates, cfg.initial) },
    monthly: series.monthly,
    yearly: series.yearly,
    trades: r.trades,
    open: r.open,
    blocked: r.blocked,
    ms: Math.round(performance.now() - t0),
  };
}

ctx.onmessage = async (e) => {
  const msg = e.data;
  try {
    if (msg.kind === "cancel") { cancelled.add(msg.id); return; }
    marketP ??= loadMarket();
    const m = await marketP;
    if (msg.kind === "init") return;
    if (msg.kind === "run") {
      ctx.postMessage({ kind: "result", id: msg.id, run: doRun(m, msg.cfg) });
      return;
    }
    if (msg.kind === "optimize") {
      const t0 = performance.now();
      const cells: OptCell[] = [];
      const total = msg.xs.length * msg.ys.length;
      let done = 0;
      for (const y of msg.ys) {
        for (const x of msg.xs) {
          if (cancelled.has(msg.id)) { cancelled.delete(msg.id); return; }
          const cfg: RunConfig = { ...msg.cfg, params: { ...msg.cfg.params, [msg.xKey]: x, [msg.yKey]: y } };
          const r = runBacktest(m, cfg);
          const { s } = summarize(r, cfg.initial);
          cells.push({ x, y, cagr: s.cagr, mdd: s.mdd, calmar: s.calmar, sharpe: s.sharpe, profit_factor: s.profit_factor, n_trades: s.n_trades, final: s.final });
          done++;
          ctx.postMessage({ kind: "progress", id: msg.id, done, total });
          await new Promise((res) => setTimeout(res, 0));
        }
      }
      ctx.postMessage({ kind: "optimized", id: msg.id, cells, ms: Math.round(performance.now() - t0) });
    }
  } catch (err) {
    marketP = null;
    ctx.postMessage({ kind: "error", id: "id" in msg ? msg.id : undefined, message: err instanceof Error ? err.message : String(err) });
  }
};
