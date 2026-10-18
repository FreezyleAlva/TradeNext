// src/components/sections/ValidationA.tsx
import { BarChart } from "@/components/charts/BarChart";
import { Heatmap, HeatLegend } from "@/components/charts/Heatmap";
import { HistogramChart } from "@/components/charts/HistogramChart";
import { TimeChart } from "@/components/charts/TimeChart";
import { KeyValue, Note, Panel, Prose, Section } from "@/components/ui/Section";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import type { Main, SensRow, Summary, Validation } from "@/types/results";
import { date, int, num, pct, rp, rpShort, tone } from "@/lib/format";

const ROWS: { k: keyof Summary; label: string; f: (v: number | null) => string; t?: boolean }[] = [
  { k: "cagr", label: "CAGR", f: (v) => pct(v), t: true },
  { k: "mdd", label: "Max drawdown", f: (v) => pct(v) },
  { k: "calmar", label: "Calmar", f: (v) => num(v) },
  { k: "sharpe", label: "Sharpe", f: (v) => num(v) },
  { k: "profit_factor", label: "Profit factor", f: (v) => num(v) },
  { k: "win_ratio", label: "Win ratio", f: (v) => pct(v) },
  { k: "n_trades", label: "Jumlah trade", f: (v) => int(v) },
  { k: "trades_per_year", label: "Trade per tahun", f: (v) => num(v, 1) },
  { k: "cost_share_of_gross", label: "Porsi biaya", f: (v) => pct(v) },
];

function val(s: Summary, k: keyof Summary): number | null {
  const v = s[k];
  return typeof v === "number" ? v : null;
}

function CompareTable({ caption, cols }: { caption: string; cols: { name: string; s: Summary }[] }) {
  return (
    <Table caption={caption}>
      <thead>
        <tr>
          <Th>Metrik</Th>
          {cols.map((c) => <Th key={c.name} num>{c.name}</Th>)}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((r) => (
          <Tr key={r.k}>
            <Td muted>{r.label}</Td>
            {cols.map((c) => {
              const v = val(c.s, r.k);
              return <Td key={c.name} num tone={r.t ? tone(v) : r.k === "mdd" ? "negative" : "neutral"}>{r.f(v)}</Td>;
            })}
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

export { CompareTable };

function SensTable({ rows, chosen }: { rows: SensRow[]; chosen: Record<string, number> }) {
  return (
    <Table caption="Uji sensitivitas parameter">
      <thead>
        <tr>
          <Th>Parameter</Th>
          <Th num>Pengali</Th>
          <Th num>Nilai</Th>
          <Th num>CAGR</Th>
          <Th num>MDD</Th>
          <Th num>Calmar</Th>
          <Th num>Sharpe</Th>
          <Th num>PF</Th>
          <Th num>Trade</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Tr key={`${r.param}-${r.mult}`} highlight={chosen[r.param] === r.value}>
            <Td><span className="font-mono">{r.param}</span></Td>
            <Td num>x{num(r.mult, 1)}</Td>
            <Td num>{num(r.value, r.value % 1 ? 1 : 0)}</Td>
            <Td num tone={tone(r.cagr)}>{pct(r.cagr)}</Td>
            <Td num tone="negative">{pct(r.mdd)}</Td>
            <Td num>{num(r.calmar)}</Td>
            <Td num>{num(r.sharpe)}</Td>
            <Td num>{num(r.profit_factor)}</Td>
            <Td num>{int(r.n_trades)}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

export function ValidationA({ v, main }: { v: Validation; main: Main }) {
  const io = v.is_oos;
  const wf = v.walk_forward;
  const sens = v.sensitivity;
  const chosen = v.selection.chosen;
  const rob = v.robustness;
  const mc = v.monte_carlo;
  const re = v.random_entry;
  const oa = v.other_asset;
  const chosenCell = { x: chosen.trail_atr, y: chosen.breakout };
  const chosenRec: Record<string, number> = { breakout: chosen.breakout, trend_ma: chosen.trend_ma, trail_atr: chosen.trail_atr };
  const losing = rob.yearly.filter((y) => typeof y.ret === "number" && y.ret < 0);

  return (
    <Section id="validitas-a" icon="validation" code="A" title="Validitas: overfitting dan ketahanan" lead="Pemisahan in-sample dan out-of-sample, walk-forward, sensitivitas parameter, jejak riset, dan pembanding acak.">
      <Panel title="In-sample vs out-of-sample" icon="layers" aside={`IS ${date(io.is_start)} s.d. ${date(io.is_end)} | OOS ${date(io.oos_start)} s.d. ${date(io.oos_end)}`}>
        <CompareTable caption="Perbandingan in-sample dan out-of-sample" cols={[{ name: "In-sample", s: io.is }, { name: "Out-of-sample", s: io.oos }]} />
        <div className="flex flex-wrap gap-x-s5 gap-y-s1 text-xs text-ink-3">
          <span>IHSG IS <span className="font-mono text-ink-1">{pct(io.bench_is.IHSG?.cagr)}</span></span>
          <span>IHSG OOS <span className="font-mono text-ink-1">{pct(io.bench_oos.IHSG?.cagr)}</span></span>
          <span>LQ45 IS <span className="font-mono text-ink-1">{pct(io.bench_is.LQ45?.cagr)}</span></span>
          <span>LQ45 OOS <span className="font-mono text-ink-1">{pct(io.bench_oos.LQ45?.cagr)}</span></span>
        </div>
        {io.oos.small_sample ? <Note tone="warning">OOS ditandai sampel kecil ({int(io.oos.n_trades)} trade). Perbedaan IS dan OOS dibaca dengan hati-hati.</Note> : null}
      </Panel>

      <Panel title="Pemilihan parameter" icon="sensitivity">
        <p className="text-sm text-ink-2">{v.selection.method}</p>
        <KeyValue
          rows={[
            ...Object.entries(v.selection.grid).map(([k, arr]) => ({ k: `Grid ${k}`, v: <span className="font-mono">{arr.join(", ")}</span> })),
            { k: "Terpilih", v: <span className="font-mono text-cyan-3">breakout {chosen.breakout} | trend_ma {chosen.trend_ma} | trail_atr {chosen.trail_atr}</span> },
          ]}
        />
        <Table caption="10 kombinasi teratas in-sample">
          <thead>
            <tr>
              <Th num>breakout</Th><Th num>trend_ma</Th><Th num>trail_atr</Th>
              <Th num>Skor dataran</Th><Th num>Calmar</Th><Th num>CAGR</Th><Th num>MDD</Th><Th num>PF</Th><Th num>Trade</Th><Th>Interior</Th>
            </tr>
          </thead>
          <tbody>
            {v.selection.top.map((g) => (
              <Tr key={`${g.breakout}-${g.trend_ma}-${g.trail_atr}`} highlight={g.breakout === chosen.breakout && g.trend_ma === chosen.trend_ma && g.trail_atr === chosen.trail_atr}>
                <Td num>{g.breakout}</Td><Td num>{g.trend_ma}</Td><Td num>{g.trail_atr}</Td>
                <Td num>{num(g.plateau_score, 3)}</Td><Td num>{num(g.calmar)}</Td>
                <Td num tone={tone(g.cagr)}>{pct(g.cagr)}</Td><Td num tone="negative">{pct(g.mdd)}</Td>
                <Td num>{num(g.profit_factor)}</Td><Td num>{int(g.n_trades)}</Td>
                <Td muted>{g.interior ? "ya" : "tidak"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>

      <Panel title="Walk-forward" icon="walkforward" aside={`${wf.combined.positive_windows} dari ${wf.combined.n_windows} jendela positif`}>
        <p className="text-sm text-ink-2">{wf.scheme}</p>
        <StatGrid>
          <Stat label="CAGR gabungan" value={pct(wf.combined.cagr)} tone={tone(wf.combined.cagr)} sub={`${date(wf.combined.start)} s.d. ${date(wf.combined.end)}`} />
          <Stat label="MDD gabungan" value={pct(wf.combined.mdd)} tone="negative" />
          <Stat label="Ekuitas akhir" value={rpShort(wf.combined.final)} />
          <Stat label="Jendela positif" value={`${wf.combined.positive_windows} / ${wf.combined.n_windows}`} />
        </StatGrid>
        <div className="grid-2">
          <BarChart label="Return tiap jendela uji walk-forward" labels={wf.windows.map((w) => w.test_start.slice(0, 4))} values={wf.windows.map((w) => w.test_return)} />
          <TimeChart
            label="Ekuitas gabungan jendela uji walk-forward"
            dates={wf.equity.map((p) => p.d)}
            height={190}
            series={[{ name: "Ekuitas walk-forward", color: "strategy", values: wf.equity.map((p) => Math.round(p.equity)) }]}
          />
        </div>
        <Table caption="Jendela walk-forward">
          <thead>
            <tr>
              <Th>Latih</Th><Th>Uji</Th><Th>Parameter</Th><Th num>Calmar latih</Th><Th num>Return uji</Th><Th num>MDD uji</Th><Th num>Trade</Th><Th num>Win</Th><Th num>PF</Th>
            </tr>
          </thead>
          <tbody>
            {wf.windows.map((w) => (
              <Tr key={w.test_start}>
                <Td muted><span className="whitespace-nowrap">{w.train_start.slice(0, 7)} s.d. {w.train_end.slice(0, 7)}</span></Td>
                <Td><span className="whitespace-nowrap">{w.test_start.slice(0, 7)} s.d. {w.test_end.slice(0, 7)}</span></Td>
                <Td><span className="font-mono whitespace-nowrap text-xs">{w.params.breakout}/{w.params.trend_ma}/{w.params.trail_atr}</span></Td>
                <Td num>{num(w.train_calmar)}</Td>
                <Td num tone={tone(w.test_return)}>{pct(w.test_return)}</Td>
                <Td num tone="negative">{pct(w.test_mdd)}</Td>
                <Td num>{int(w.test_trades)}</Td>
                <Td num>{pct(w.test_win_ratio, 0)}</Td>
                <Td num>{num(w.test_profit_factor)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>

      <Panel title="Sensitivitas parameter" icon="sensitivity">
        <p className="text-sm text-ink-2">{sens.method}</p>
        <Tabs
          label="Periode uji sensitivitas"
          items={[
            { key: "full", label: "Periode penuh", content: <SensTable rows={sens.full} chosen={chosenRec} /> },
            { key: "is", label: "In-sample", content: <SensTable rows={sens.in_sample} chosen={chosenRec} /> },
          ]}
        />
        <h4 className="text-sm font-semibold text-ink-1">
          Heatmap {sens.heatmap_is.y_param} x {sens.heatmap_is.x_param} ({Object.entries(sens.heatmap_is.fixed).map(([k, x]) => `${k} ${x}`).join(", ")})
        </h4>
        <Tabs
          label="Heatmap sensitivitas"
          items={[
            { key: "is-cal", label: "IS Calmar", content: <Heatmap data={sens.heatmap_is} metric="calmar" chosen={chosenCell} label="Heatmap Calmar in-sample" /> },
            { key: "is-cagr", label: "IS CAGR", content: <Heatmap data={sens.heatmap_is} metric="cagr" chosen={chosenCell} label="Heatmap CAGR in-sample" /> },
            { key: "oos-cal", label: "OOS Calmar", content: <Heatmap data={sens.heatmap_oos} metric="calmar" chosen={chosenCell} label="Heatmap Calmar out-of-sample" /> },
            { key: "oos-cagr", label: "OOS CAGR", content: <Heatmap data={sens.heatmap_oos} metric="cagr" chosen={chosenCell} label="Heatmap CAGR out-of-sample" /> },
          ]}
        />
        <HeatLegend />
        <Note>{sens.heatmap_note} Warna dibagi per kuartil nilai positif di tiap peta.</Note>
      </Panel>

      <Panel title="Jejak riset dan jumlah kombinasi" icon="database">
        <Table caption="Log riset">
          <thead>
            <tr><Th num>Langkah</Th><Th>Tanggal</Th><Th>Apa yang dicoba</Th><Th num>Kombinasi</Th><Th>Temuan</Th></tr>
          </thead>
          <tbody>
            {v.research.log.map((l) => (
              <Tr key={l.step}>
                <Td num>{l.step}</Td>
                <Td muted><span className="whitespace-nowrap">{date(l.date)}</span></Td>
                <Td>{l.what}</Td>
                <Td num>{int(l.combos)}</Td>
                <Td muted>{l.finding}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <StatGrid>
          <Stat label="Parameter dioptimasi" value={int(v.research.n_optimized_params)} />
          <Stat label="Kombinasi grid final" value={int(v.research.distinct_combos_final_grid)} />
          <Stat label="Kombinasi semua iterasi" value={int(v.research.distinct_combos_all_iterations)} />
          <Stat label="Run walk-forward" value={int(v.research.walk_forward_runs)} />
          <Stat label="Run sensitivitas" value={int(v.research.sensitivity_runs)} />
          <Stat label="Run grid OOS (tampilan saja)" value={int(v.research.oos_grid_runs_display_only)} />
        </StatGrid>
      </Panel>

      <div className="grid-2">
        <Panel title={`Tanpa ${rob.without_top5.k} trade terbaik`} icon="cross">
          <StatGrid>
            <Stat label="CAGR tanpa" value={pct(rob.without_top5.cagr_without)} tone={tone(rob.without_top5.cagr_without)} sub={`asli ${pct(main.summary.cagr)}`} />
            <Stat label="PF tanpa" value={num(rob.without_top5.profit_factor_without)} sub={`asli ${num(main.summary.profit_factor)}`} />
            <Stat label="Laba yang dibuang" value={rpShort(rob.without_top5.removed_pnl)} />
            <Stat label="Ekuitas akhir tanpa" value={rpShort(rob.without_top5.final_without)} />
          </StatGrid>
          <Table caption="Trade terbaik yang dibuang">
            <thead><tr><Th>Ticker</Th><Th>Masuk</Th><Th>Keluar</Th><Th num>Laba bersih</Th><Th num>Return</Th></tr></thead>
            <tbody>
              {rob.without_top5.removed.map((t) => (
                <Tr key={`${t.ticker}-${t.entry_date}`}>
                  <Td><span className="font-mono">{t.ticker}</span></Td>
                  <Td muted><span className="whitespace-nowrap">{date(t.entry_date)}</span></Td>
                  <Td muted><span className="whitespace-nowrap">{date(t.exit_date)}</span></Td>
                  <Td num tone={tone(t.net_pnl)}>{rp(t.net_pnl)}</Td>
                  <Td num tone={tone(t.ret_pct)}>{pct(t.ret_pct)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Note>{rob.without_top5.method}</Note>
        </Panel>
        <Panel title="Tahun rugi" icon="calendar" aside={`${int(rob.losing_years)} tahun rugi`}>
          <BarChart label="Return per tahun" labels={rob.yearly.map((y) => String(y.year))} values={rob.yearly.map((y) => y.ret)} height={180} />
          <p className="text-sm text-ink-2">
            {losing.length
              ? `Tahun rugi: ${losing.map((y) => `${y.year} (${pct(y.ret)})`).join(", ")}. Tahun pertama dan terakhir tidak penuh 12 bulan.`
              : "Tidak ada tahun rugi."}
          </p>
        </Panel>
      </div>

      <div className="grid-2">
        <Panel title="Monte Carlo urutan trade" icon="monte_carlo" aside={`${int(mc.n_sims)} simulasi x ${int(mc.n_trades)} trade`}>
          <HistogramChart
            label="Distribusi CAGR Monte Carlo"
            edges={mc.hist_cagr.edges}
            counts={mc.hist_cagr.counts}
            colorBySign={false}
            unit="simulasi"
            markers={typeof mc.original_sequence_cagr === "number" ? [{ value: mc.original_sequence_cagr, label: "urutan asli" }] : []}
          />
          <Table caption="Persentil Monte Carlo">
            <thead><tr><Th>Metrik</Th><Th num>P5</Th><Th num>P50</Th><Th num>P95</Th><Th num>Urutan asli</Th></tr></thead>
            <tbody>
              <Tr><Td muted>CAGR</Td><Td num tone={tone(mc.cagr_p5)}>{pct(mc.cagr_p5)}</Td><Td num tone={tone(mc.cagr_p50)}>{pct(mc.cagr_p50)}</Td><Td num tone={tone(mc.cagr_p95)}>{pct(mc.cagr_p95)}</Td><Td num>{pct(mc.original_sequence_cagr)}</Td></Tr>
              <Tr><Td muted>MDD urutan trade</Td><Td num tone="negative">{pct(mc.mdd_p5)}</Td><Td num tone="negative">{pct(mc.mdd_p50)}</Td><Td num tone="negative">{pct(mc.mdd_p95)}</Td><Td num tone="negative">{pct(mc.original_sequence_mdd)}</Td></Tr>
            </tbody>
          </Table>
          <p className="text-sm text-ink-2">Peluang rugi: <span className="font-mono text-ink-1">{pct(mc.prob_loss, 1)}</span></p>
          <Note>{mc.method}</Note>
        </Panel>
        <Panel title="Entry acak" icon="dice" aside={`${int(re.n_runs)} run, peluang masuk ${pct(re.entry_prob, 2)}`}>
          <HistogramChart
            label="Distribusi CAGR entry acak dibanding strategi"
            edges={re.hist_cagr.edges}
            counts={re.hist_cagr.counts}
            colorBySign={false}
            unit="run"
            markers={typeof re.strategy_cagr === "number" ? [{ value: re.strategy_cagr, label: "strategi" }] : []}
          />
          <StatGrid>
            <Stat label="Persentil strategi" value={typeof re.strategy_percentile === "number" ? `P${num(re.strategy_percentile * 100, 0)}` : "-"} />
            <Stat label="CAGR acak P5 / P50 / P95" value={`${pct(re.cagr_p5)} / ${pct(re.cagr_p50)} / ${pct(re.cagr_p95)}`} />
            <Stat label="Rata-rata trade acak" value={num(re.mean_trades, 1)} />
          </StatGrid>
          <p className="text-xs text-ink-3">Kalibrasi peluang masuk: {re.calibration.map((c) => `${pct(c.prob, 2)} = ${int(c.trades)} trade`).join(" | ")}</p>
          <Note>{re.method}</Note>
        </Panel>
      </div>

      <Panel title={`Aset lain: ${oa.asset}`} icon="benchmark">
        <StatGrid>
          <Stat label="CAGR aturan di indeks" value={pct(oa.cagr)} tone={tone(oa.cagr)} />
          <Stat label="MDD aturan di indeks" value={pct(oa.mdd)} tone="negative" />
          <Stat label="Trade" value={int(oa.n_trades)} sub={`win ${pct(oa.win_ratio)}`} />
          <Stat label="Beli dan tahan" value={pct(oa.buy_hold_cagr)} sub={`MDD ${pct(oa.buy_hold_mdd)}`} />
        </StatGrid>
        <Note>{oa.method}</Note>
      </Panel>

      <Panel title="Ringkasan ketahanan" icon="info">
        <Prose
          items={[
            `CAGR OOS ${pct(io.oos.cagr)} vs IS ${pct(io.is.cagr)}; walk-forward ${pct(wf.combined.cagr)} dengan ${wf.combined.positive_windows} dari ${wf.combined.n_windows} jendela positif.`,
            `Tanpa ${rob.without_top5.k} trade terbaik CAGR menjadi ${pct(rob.without_top5.cagr_without)}; 10 trade terbaik menyumbang ${pct(rob.top10_share_of_net)} laba bersih.`,
            `Strategi berada di persentil ${typeof re.strategy_percentile === "number" ? num(re.strategy_percentile * 100, 0) : "-"} dari entry acak dengan universe dan biaya yang sama.`,
          ]}
        />
      </Panel>
    </Section>
  );
}
