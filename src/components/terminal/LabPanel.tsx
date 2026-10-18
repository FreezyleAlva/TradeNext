// src/components/terminal/LabPanel.tsx
"use client";
import { useMemo, useState, type ReactNode } from "react";
import { TimeChart } from "@/components/charts/TimeChart";
import { Heatmap, HeatLegend } from "@/components/charts/Heatmap";
import { TradeLog } from "@/components/sections/TradeLog";
import { Badge, Note } from "@/components/ui/Section";
import { Stat } from "@/components/ui/Stat";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { DEFAULT_CONFIG, type RunConfig } from "@/lib/engine/engine";
import type { LabRun, OptCell, ParamKey } from "@/lib/engine/protocol";
import { date, int, num, pct, rp, rpShort, tone } from "@/lib/format";
import type { Heatmap as HeatmapData, Trade } from "@/types/results";
import type { TerminalProps } from "./types";
import type { useLab } from "./useLab";

type Lab = ReturnType<typeof useLab>;

interface Form {
  start: string;
  end: string;
  initial: string;
  breakout: string;
  trend_ma: string;
  trail_atr: string;
  maxPositions: string;
  fraction: string;
  feeBuy: string;
  feeSell: string;
  spread: string;
  delay: string;
  compounding: boolean;
}

const PARAM_LABEL: Record<ParamKey, string> = { breakout: "Breakout (hari)", trend_ma: "SMA tren (hari)", trail_atr: "Trailing (x ATR20)" };

function toForm(p: TerminalProps, start: string, end: string): Form {
  return {
    start, end,
    initial: String(p.meta.initial_capital),
    breakout: String(p.params.breakout),
    trend_ma: String(p.params.trend_ma),
    trail_atr: String(p.params.trail_atr),
    maxPositions: String(p.meta.max_positions),
    fraction: String(p.meta.position_fraction * 100),
    feeBuy: String(DEFAULT_CONFIG.feeBuy * 100),
    feeSell: String(DEFAULT_CONFIG.feeSell * 100),
    spread: String(DEFAULT_CONFIG.spreadTicks),
    delay: "0",
    compounding: true,
  };
}

function parse(f: Form): { cfg: RunConfig | null; errors: string[] } {
  const errors: string[] = [];
  const numIn = (v: string, label: string, lo: number, hi: number, int = false) => {
    const x = Number(v.replace(",", "."));
    if (!Number.isFinite(x) || x < lo || x > hi || (int && !Number.isInteger(x))) { errors.push(`${label} harus ${int ? "bilangan bulat " : ""}${lo} s.d. ${hi}`); return NaN; }
    return x;
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.start) || !/^\d{4}-\d{2}-\d{2}$/.test(f.end) || f.start >= f.end) errors.push("Tanggal mulai harus sebelum tanggal akhir");
  const cfg: RunConfig = {
    ...DEFAULT_CONFIG,
    start: f.start,
    end: f.end,
    initial: numIn(f.initial, "Modal awal", 1_000_000, 1e13),
    params: {
      breakout: numIn(f.breakout, "Breakout", 5, 400, true),
      trend_ma: numIn(f.trend_ma, "SMA tren", 5, 400, true),
      trail_atr: numIn(f.trail_atr, "Trailing ATR", 0.5, 20),
    },
    maxPositions: numIn(f.maxPositions, "Maks posisi", 1, 50, true),
    positionFraction: numIn(f.fraction, "Ukuran posisi %", 1, 100) / 100,
    feeBuy: numIn(f.feeBuy, "Fee beli %", 0, 5) / 100,
    feeSell: numIn(f.feeSell, "Fee jual %", 0, 5) / 100,
    spreadTicks: numIn(f.spread, "Spread fraksi", 0, 10, true),
    delay: numIn(f.delay, "Tunda bar", 0, 10, true),
    compounding: f.compounding,
  };
  return { cfg: errors.length ? null : cfg, errors };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-s1 text-xs text-ink-3">
      {label}
      {children}
    </label>
  );
}

const inputCls = "tap w-full min-w-0 rounded-sm bg-surface-2 px-s2 font-mono text-sm text-ink-1 tabular-nums";

function toTrades(run: LabRun): Trade[] {
  return run.trades.map((t, i) => ({
    id: i + 1,
    ticker: t.ticker,
    signal_date: t.signal_date,
    entry_date: t.entry_date,
    entry_time: "09:00",
    entry_price: t.entry_price,
    entry_lots: t.entry_lots,
    entry_shares: t.entry_shares,
    exit_signal_date: t.exit_signal_date,
    exit_date: t.exit_date,
    exit_time: "09:00",
    exit_price: t.exit_price,
    exit_lots: Math.floor(t.exit_shares / 100),
    exit_shares: t.exit_shares,
    fee_buy: t.fee_buy,
    fee_sell: t.fee_sell,
    spread_cost: t.spread_cost,
    total_cost: t.fee_buy + t.fee_sell + t.spread_cost,
    dividends: t.dividends,
    cost_basis: t.cost_basis,
    gross_pnl: t.gross_pnl,
    net_pnl: t.net_pnl,
    ret_pct: t.ret_pct,
    hold_days: t.hold_days,
    hold_bars: t.hold_bars,
    entry_equity: t.entry_equity,
    exit_reason: t.exit_reason,
  }));
}

function Report({ run }: { run: LabRun }) {
  const s = run.summary;
  const rows: [string, string, number | null | undefined][] = [
    ["Periode", `${date(s.start)} s.d. ${date(s.end)}`, null],
    ["Modal awal / akhir", `${rp(s.initial)} / ${rp(s.final)}`, s.final - s.initial],
    ["Laba bersih trade tertutup", rp(s.net_pnl, true), s.net_pnl],
    ["CAGR", pct(s.cagr), s.cagr],
    ["Max drawdown", pct(s.mdd), s.mdd],
    ["Calmar", num(s.calmar), null],
    ["Sharpe (tanpa rf) / excess rf 5%", `${num(s.sharpe)} / ${num(s.sharpe_excess)}`, null],
    ["Sortino", num(s.sortino), null],
    ["Jumlah trade / per tahun", `${int(s.n_trades)} / ${num(s.trades_per_year, 1)}`, null],
    ["Win ratio", pct(s.win_ratio), null],
    ["Rata-rata profit (% / Rp)", `${pct(s.avg_win_pct, 1, true)} / ${rp(s.avg_win_rp, true)}`, 1],
    ["Rata-rata loss (% / Rp)", `${pct(s.avg_loss_pct)} / ${rp(s.avg_loss_rp)}`, -1],
    ["Profit factor", num(s.profit_factor), null],
    ["Payoff ratio", num(s.payoff_ratio), null],
    ["Expectancy per trade", pct(s.expectancy_pct, 2, true), s.expectancy_pct],
    ["Bulan rekor baru / terlama tanpa rekor", `${pct(s.record_month_share)} / ${int(s.longest_months_no_record)} bulan`, null],
    ["Rata-rata pegang", `${num(s.avg_hold_days, 1)} hari (${num(s.avg_hold_bars, 1)} bar)`, null],
    ["Exposure / modal terpakai", `${pct(s.exposure_days)} / ${pct(s.avg_capital_used)}`, null],
    ["Biaya total (fee + spread)", `${rp(s.total_cost)} (${pct(s.cost_share_of_gross)} laba kotor)`, null],
    ["Kalah beruntun / menang beruntun", `${int(s.longest_losing_streak)} / ${int(s.max_consecutive_wins)}`, null],
    ["Kontribusi 10 trade terbaik", pct(s.top10_share_of_net), null],
    ["Tahun rugi", `${int(s.losing_years)} dari ${int(s.n_years_measured)}`, null],
    ["Posisi terbuka di akhir", `${int(s.n_open_at_end)} (belum terealisasi ${rp(s.open_unrealized, true)})`, null],
  ];
  return (
    <div className="flex flex-col gap-s3">
      <div className="stat-grid grid gap-s2">
        <Stat label="CAGR" value={pct(s.cagr)} tone={tone(s.cagr)} size="lg" />
        <Stat label="Max drawdown" value={pct(s.mdd)} tone="negative" size="lg" />
        <Stat label="Profit factor" value={num(s.profit_factor)} size="lg" />
        <Stat label="Win ratio" value={pct(s.win_ratio)} size="lg" sub={`${int(s.n_trades)} trade`} />
        <Stat label="Ekuitas akhir" value={rpShort(s.final)} size="lg" sub={`dihitung ${int(run.ms)} ms`} />
      </div>
      <Tabs
        label="Laporan lab"
        items={[
          {
            key: "eq",
            label: "Ekuitas",
            content: (
              <TimeChart
                label="Ekuitas run lab dibanding IHSG dan LQ45"
                dates={run.dates}
                log
                height={280}
                series={[
                  { name: "Run lab", color: "strategy", values: run.equity },
                  { name: "IHSG", color: "benchmark-1", values: run.bench.ihsg },
                  { name: "LQ45", color: "benchmark-2", values: run.bench.lq45 },
                ]}
                drawdown={[{ name: "DD run lab", color: "strategy", values: run.dd }]}
              />
            ),
          },
          {
            key: "stat",
            label: "Statistik",
            content: (
              <Table caption="Statistik run lab">
                <tbody>
                  {rows.map(([k, v, t]) => (
                    <Tr key={k}>
                      <Td muted>{k}</Td>
                      <Td num tone={t === null || t === undefined ? "neutral" : tone(t)}>{v}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ),
          },
          {
            key: "month",
            label: "Bulanan",
            content: <MonthlyGrid monthly={run.monthly} yearly={run.yearly} />,
          },
          { key: "trades", label: `Trade (${run.trades.length})`, content: <TradeLog trades={toTrades(run)} /> },
          {
            key: "exec",
            label: "Eksekusi",
            content: (
              <Table caption="Order terblokir run lab">
                <thead><tr><Th>Kejadian</Th><Th num>Jumlah</Th></tr></thead>
                <tbody>
                  {Object.entries(run.blocked).map(([k, v]) => <Tr key={k}><Td muted><span className="font-mono">{k}</span></Td><Td num>{int(v)}</Td></Tr>)}
                  {run.open.map((o) => <Tr key={o.ticker}><Td>Terbuka: <span className="font-mono">{o.ticker}</span> sejak {date(o.entry_date)}</Td><Td num tone={tone(o.unrealized_pnl)}>{rp(o.unrealized_pnl, true)}</Td></Tr>)}
                </tbody>
              </Table>
            ),
          },
        ]}
      />
    </div>
  );
}

function MonthlyGrid({ monthly, yearly }: { monthly: { ym: string; ret: number }[]; yearly: { year: number; ret: number }[] }) {
  const byYear = new Map<number, (number | null)[]>();
  for (const m of monthly) {
    const y = Number(m.ym.slice(0, 4));
    const arr = byYear.get(y) ?? new Array<number | null>(12).fill(null);
    arr[Number(m.ym.slice(5, 7)) - 1] = m.ret;
    byYear.set(y, arr);
  }
  const yr = new Map(yearly.map((y) => [y.year, y.ret]));
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return (
    <Table caption="Return bulanan run lab">
      <thead><tr><Th>Tahun</Th>{months.map((m) => <Th key={m} num>{m}</Th>)}<Th num>Tahun</Th></tr></thead>
      <tbody>
        {[...byYear.entries()].map(([y, arr]) => (
          <Tr key={y}>
            <Td><span className="font-mono">{y}</span></Td>
            {arr.map((v, i) => <Td key={i} num tone={tone(v)}>{pct(v)}</Td>)}
            <Td num tone={tone(yr.get(y))}>{pct(yr.get(y))}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

function parseList(s: string): number[] {
  const tokens = s.split(/[\s;]+/).flatMap((t) => (/^\d+,\d+$/.test(t) ? [t.replace(",", ".")] : t.split(",")));
  const vals = tokens.map((x) => Number(x.trim())).filter((x) => x !== 0 && Number.isFinite(x) && x > 0);
  return [...new Set(vals)].sort((a, b) => a - b).slice(0, 15);
}

export function LabPanel({ props, lab, onRun }: { props: TerminalProps; lab: Lab; onRun: (r: LabRun) => void }) {
  const [form, setForm] = useState<Form>(() => toForm(props, props.meta.backtest_start, props.meta.backtest_end));
  const [run, setRun] = useState<LabRun | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [opt, setOpt] = useState({ x: "trail_atr" as ParamKey, y: "breakout" as ParamKey, xs: (props.grid.trail_atr ?? [2, 3, 4, 5, 6]).join(" "), ys: (props.grid.breakout ?? [20, 60, 100, 150]).join(" "), metric: "calmar" as "calmar" | "cagr" });
  const [cells, setCells] = useState<{ cells: OptCell[]; xKey: ParamKey; yKey: ParamKey; xs: number[]; ys: number[]; base: RunConfig } | null>(null);
  const [repro, setRepro] = useState<{ match: number; total: number; finalDiff: number; js: LabRun } | null>(null);
  const set = (k: keyof Form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function doRun(f: Form = form) {
    const { cfg, errors: errs } = parse(f);
    setErrors(errs);
    if (!cfg) return;
    try {
      const r = await lab.run(cfg);
      setRun(r);
      onRun(r);
    } catch {
      return;
    }
  }

  async function doRepro() {
    const f = toForm(props, props.meta.backtest_start, props.meta.backtest_end);
    const { cfg } = parse(f);
    if (!cfg) return;
    const r = await lab.run(cfg);
    let match = 0;
    props.trades.forEach((t, i) => {
      const u = r.trades[i];
      if (u && u.ticker === t.ticker && u.entry_date === t.entry_date && u.exit_date === t.exit_date && Math.abs(u.net_pnl - (t.net_pnl ?? NaN)) <= 0.01) match++;
    });
    setRepro({ match, total: props.trades.length, finalDiff: r.summary.final - (props.official.final ?? NaN), js: r });
  }

  async function doOptimize() {
    const { cfg, errors: errs } = parse(form);
    const xs = parseList(opt.xs);
    const ys = parseList(opt.ys);
    const e = [...errs];
    if (opt.x === opt.y) e.push("Parameter X dan Y harus berbeda");
    if (!xs.length || !ys.length) e.push("Daftar nilai X dan Y wajib diisi");
    setErrors(e);
    if (!cfg || e.length) return;
    const res = await lab.optimize(cfg, opt.x, xs, opt.y, ys);
    if (res) setCells({ cells: res, xKey: opt.x, yKey: opt.y, xs, ys, base: cfg });
  }

  const heat: HeatmapData | null = useMemo(() => {
    if (!cells) return null;
    const map = new Map(cells.cells.map((c) => [`${c.x}|${c.y}`, c]));
    return {
      x_param: cells.xKey,
      y_param: cells.yKey,
      fixed: {},
      x: cells.xs,
      y: cells.ys,
      cells: cells.ys.map((y) => cells.xs.map((x) => {
        const c = map.get(`${x}|${y}`);
        return c ? { cagr: c.cagr, calmar: c.calmar, mdd: c.mdd } : null;
      })),
    };
  }, [cells]);

  const top = useMemo(() => (cells ? [...cells.cells].sort((a, b) => (b[opt.metric] ?? -Infinity) - (a[opt.metric] ?? -Infinity)).slice(0, 10) : []), [cells, opt.metric]);
  const busy = lab.state.busy !== null || !lab.state.ready;
  const preset = (start: string, end: string) => setForm((f) => ({ ...f, start, end }));

  return (
    <div className="lab-grid">
      <form
        className="flex min-w-0 flex-col gap-s3 rounded-md bg-surface-1 p-s3"
        onSubmit={(e) => { e.preventDefault(); void doRun(); }}
        aria-label="Pengaturan backtest lab"
      >
        <h3 className="text-sm font-semibold text-ink-1">Pengaturan</h3>
        <div className="flex flex-wrap gap-s1">
          <button type="button" className="tap rounded-sm bg-surface-2 px-s2 text-xs text-ink-2 hover:text-ink-1" onClick={() => setForm(toForm(props, props.meta.backtest_start, props.meta.backtest_end))}>Parameter beku</button>
          <button type="button" className="tap rounded-sm bg-surface-2 px-s2 text-xs text-ink-2 hover:text-ink-1" onClick={() => preset(props.meta.backtest_start, "2023-08-31")}>In-sample</button>
          <button type="button" className="tap rounded-sm bg-surface-2 px-s2 text-xs text-ink-2 hover:text-ink-1" onClick={() => preset("2023-09-01", props.meta.backtest_end)}>Out-of-sample</button>
          <button type="button" className="tap rounded-sm bg-surface-2 px-s2 text-xs text-ink-2 hover:text-ink-1" onClick={() => preset(props.meta.forward_start, props.meta.data_last_date)}>Forward</button>
        </div>
        <div className="field-grid">
          <Field label="Mulai"><input type="date" className={inputCls} value={form.start} onChange={(e) => set("start", e.target.value)} /></Field>
          <Field label="Akhir"><input type="date" className={inputCls} value={form.end} onChange={(e) => set("end", e.target.value)} /></Field>
          <Field label={PARAM_LABEL.breakout}><input inputMode="numeric" className={inputCls} value={form.breakout} onChange={(e) => set("breakout", e.target.value)} /></Field>
          <Field label={PARAM_LABEL.trend_ma}><input inputMode="numeric" className={inputCls} value={form.trend_ma} onChange={(e) => set("trend_ma", e.target.value)} /></Field>
          <Field label={PARAM_LABEL.trail_atr}><input inputMode="decimal" className={inputCls} value={form.trail_atr} onChange={(e) => set("trail_atr", e.target.value)} /></Field>
          <Field label="Modal awal (Rp)"><input inputMode="numeric" className={inputCls} value={form.initial} onChange={(e) => set("initial", e.target.value)} /></Field>
          <Field label="Maks posisi"><input inputMode="numeric" className={inputCls} value={form.maxPositions} onChange={(e) => set("maxPositions", e.target.value)} /></Field>
          <Field label="Ukuran posisi (%)"><input inputMode="decimal" className={inputCls} value={form.fraction} onChange={(e) => set("fraction", e.target.value)} /></Field>
          <Field label="Fee beli (%)"><input inputMode="decimal" className={inputCls} value={form.feeBuy} onChange={(e) => set("feeBuy", e.target.value)} /></Field>
          <Field label="Fee jual (%)"><input inputMode="decimal" className={inputCls} value={form.feeSell} onChange={(e) => set("feeSell", e.target.value)} /></Field>
          <Field label="Spread (fraksi)"><input inputMode="numeric" className={inputCls} value={form.spread} onChange={(e) => set("spread", e.target.value)} /></Field>
          <Field label="Tunda eksekusi (bar)"><input inputMode="numeric" className={inputCls} value={form.delay} onChange={(e) => set("delay", e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-s2 text-sm text-ink-2">
          <input type="checkbox" checked={form.compounding} onChange={(e) => set("compounding", e.target.checked)} className="accent-cyan-2" />
          Compounding
        </label>
        {errors.length ? (
          <ul className="flex flex-col gap-s1 rounded-sm bg-surface-2 p-s2 text-xs text-negative" role="alert">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        ) : null}
        <button type="submit" disabled={busy} className="tap rounded-sm bg-cyan-1 px-s4 text-sm font-medium text-ink-1 disabled:bg-surface-3 disabled:text-ink-3">
          {lab.state.busy === "run" ? "Menghitung" : lab.state.ready ? "Jalankan backtest" : "Memuat data pasar"}
        </button>
        <p className="text-xs text-ink-3">
          {lab.state.ready
            ? `Data lokal: ${lab.state.ready.tickers} saham, ${int(lab.state.ready.days)} hari bursa (${date(lab.state.ready.first)} s.d. ${date(lab.state.ready.last)}), dimuat ${int(lab.state.ready.ms)} ms.`
            : "Memuat 100 file harga dari folder dashboard sendiri, tanpa internet."}
        </p>
        {lab.state.error ? <p className="text-xs text-negative" role="alert">{lab.state.error}</p> : null}
      </form>

      <div className="flex min-w-0 flex-col gap-s3">
        <Tabs
          label="Mode lab"
          items={[
            {
              key: "report",
              label: "Hasil backtest",
              content: run ? <Report run={run} /> : <Note>Atur parameter lalu jalankan. Engine lab adalah port satu banding satu dari engine Python (eksekusi pembukaan t+1, fraksi BEI, lot 100, fee, spread, ARA/ARB, likuiditas 5% ADV20, dividen, split).</Note>,
            },
            {
              key: "opt",
              label: "Optimasi",
              content: (
                <div className="flex flex-col gap-s3">
                  <div className="field-grid">
                    <Field label="Parameter X">
                      <select className={inputCls} value={opt.x} onChange={(e) => setOpt((o) => ({ ...o, x: e.target.value as ParamKey }))}>
                        {(Object.keys(PARAM_LABEL) as ParamKey[]).map((k) => <option key={k} value={k}>{PARAM_LABEL[k]}</option>)}
                      </select>
                    </Field>
                    <Field label="Nilai X (pisah spasi)"><input className={inputCls} value={opt.xs} onChange={(e) => setOpt((o) => ({ ...o, xs: e.target.value }))} /></Field>
                    <Field label="Parameter Y">
                      <select className={inputCls} value={opt.y} onChange={(e) => setOpt((o) => ({ ...o, y: e.target.value as ParamKey }))}>
                        {(Object.keys(PARAM_LABEL) as ParamKey[]).map((k) => <option key={k} value={k}>{PARAM_LABEL[k]}</option>)}
                      </select>
                    </Field>
                    <Field label="Nilai Y (pisah spasi)"><input className={inputCls} value={opt.ys} onChange={(e) => setOpt((o) => ({ ...o, ys: e.target.value }))} /></Field>
                    <Field label="Urutkan menurut">
                      <select className={inputCls} value={opt.metric} onChange={(e) => setOpt((o) => ({ ...o, metric: e.target.value as "calmar" | "cagr" }))}>
                        <option value="calmar">Calmar</option>
                        <option value="cagr">CAGR</option>
                      </select>
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-center gap-s2">
                    <button type="button" disabled={busy} onClick={() => void doOptimize()} className="tap rounded-sm bg-cyan-1 px-s4 text-sm text-ink-1 disabled:bg-surface-3 disabled:text-ink-3">
                      Jalankan optimasi ({parseList(opt.xs).length * parseList(opt.ys).length} kombinasi)
                    </button>
                    {lab.state.busy === "optimize" ? <button type="button" onClick={lab.cancel} className="tap rounded-sm bg-surface-3 px-s3 text-sm text-ink-1">Batal</button> : null}
                    {lab.state.progress && lab.state.busy === "optimize" ? (
                      <span className="flex items-center gap-s2 text-xs text-ink-3">
                        <progress value={lab.state.progress.done} max={lab.state.progress.total} className="opt-progress" />
                        {lab.state.progress.done} / {lab.state.progress.total}
                      </span>
                    ) : null}
                  </div>
                  <Note>Periode dan parameter lain diambil dari panel pengaturan. Optimasi di periode yang sudah dipakai untuk menilai hasil (OOS atau forward) adalah overfitting; pemilihan resmi hanya memakai in-sample.</Note>
                  {heat && cells ? (
                    <>
                      <Heatmap data={heat} metric={opt.metric} label="Heatmap optimasi lab" chosen={cells.xKey === "trail_atr" && cells.yKey === "breakout" ? { x: props.params.trail_atr, y: props.params.breakout } : undefined} />
                      <HeatLegend />
                      <Table caption="10 kombinasi teratas">
                        <thead><tr><Th num>{cells.xKey}</Th><Th num>{cells.yKey}</Th><Th num>Calmar</Th><Th num>CAGR</Th><Th num>MDD</Th><Th num>Sharpe</Th><Th num>PF</Th><Th num>Trade</Th><Th>Aksi</Th></tr></thead>
                        <tbody>
                          {top.map((c) => (
                            <Tr key={`${c.x}|${c.y}`}>
                              <Td num>{num(c.x, c.x % 1 ? 1 : 0)}</Td>
                              <Td num>{num(c.y, c.y % 1 ? 1 : 0)}</Td>
                              <Td num>{num(c.calmar)}</Td>
                              <Td num tone={tone(c.cagr)}>{pct(c.cagr)}</Td>
                              <Td num tone="negative">{pct(c.mdd)}</Td>
                              <Td num>{num(c.sharpe)}</Td>
                              <Td num>{num(c.profit_factor)}</Td>
                              <Td num>{int(c.n_trades)}</Td>
                              <Td>
                                <button type="button" className="tap rounded-sm bg-surface-3 px-s2 text-xs text-ink-1" onClick={() => {
                                  const next = { ...form, [cells.xKey]: String(c.x), [cells.yKey]: String(c.y) };
                                  setForm(next);
                                  void doRun(next);
                                }}>Pakai</button>
                              </Td>
                            </Tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  ) : null}
                </div>
              ),
            },
            {
              key: "repro",
              label: "Uji reproduksi",
              content: (
                <div className="flex flex-col gap-s3">
                  <p className="text-sm text-ink-2">
                    Menjalankan engine browser dengan parameter beku ({props.params.breakout} / {props.params.trend_ma} / {props.params.trail_atr}) pada {date(props.meta.backtest_start)} s.d. {date(props.meta.backtest_end)}, lalu membandingkan tiap trade dengan log resmi dari Python.
                  </p>
                  <button type="button" disabled={busy} onClick={() => void doRepro()} className="tap self-start rounded-sm bg-cyan-1 px-s4 text-sm text-ink-1 disabled:bg-surface-3 disabled:text-ink-3">Jalankan uji reproduksi</button>
                  {repro ? (
                    <div className="flex flex-col gap-s2">
                      <div className="flex flex-wrap items-center gap-s2">
                        <Badge tone={repro.match === repro.total && Math.abs(repro.finalDiff) < 0.01 ? "positive" : "warning"}>
                          {repro.match === repro.total && Math.abs(repro.finalDiff) < 0.01 ? "Identik dengan Python" : "Ada selisih"}
                        </Badge>
                      </div>
                      <Table caption="Perbandingan engine browser dan Python">
                        <thead><tr><Th>Ukuran</Th><Th num>Browser</Th><Th num>Python (results.json)</Th></tr></thead>
                        <tbody>
                          <Tr><Td muted>Trade identik</Td><Td num>{int(repro.match)} / {int(repro.total)}</Td><Td num>{int(props.official.n_trades)}</Td></Tr>
                          <Tr><Td muted>Ekuitas akhir</Td><Td num>{rp(repro.js.summary.final)}</Td><Td num>{rp(props.official.final)}</Td></Tr>
                          <Tr><Td muted>Selisih ekuitas akhir</Td><Td num>{rp(repro.finalDiff)}</Td><Td num>-</Td></Tr>
                          <Tr><Td muted>CAGR</Td><Td num>{pct(repro.js.summary.cagr, 2)}</Td><Td num>{pct(props.official.cagr, 2)}</Td></Tr>
                          <Tr><Td muted>MDD</Td><Td num>{pct(repro.js.summary.mdd, 2)}</Td><Td num>{pct(props.official.mdd, 2)}</Td></Tr>
                          <Tr><Td muted>Profit factor</Td><Td num>{num(repro.js.summary.profit_factor, 4)}</Td><Td num>{num(props.official.profit_factor, 4)}</Td></Tr>
                        </tbody>
                      </Table>
                    </div>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
