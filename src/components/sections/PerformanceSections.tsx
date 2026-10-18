// src/components/sections/PerformanceSections.tsx
import { HistogramChart } from "@/components/charts/HistogramChart";
import { TimeChart } from "@/components/charts/TimeChart";
import { Note, Panel, Section } from "@/components/ui/Section";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import type { Benchmark, Main } from "@/types/results";
import { int, pct, rp, tone } from "@/lib/format";

export function EquitySection({ main }: { main: Main }) {
  const eq = main.equity;
  const dates = eq.map((p) => p.d);
  const ihsg: Benchmark | undefined = main.benchmarks.IHSG;
  return (
    <Section
      id="ekuitas"
      icon="equity"
      title="Kurva ekuitas dan drawdown"
      lead="Skala logaritmik. IHSG dan LQ45 dinormalisasi ke modal awal yang sama; keduanya indeks harga tanpa dividen."
    >
      <Panel title="Ekuitas strategi vs IHSG vs LQ45" icon="equity" aside={`${int(eq.length)} hari bursa`}>
        <TimeChart
          label="Kurva ekuitas strategi dibanding IHSG dan LQ45, skala log, dengan panel drawdown"
          dates={dates}
          log
          height={300}
          series={[
            { name: "Strategi", color: "strategy", values: eq.map((p) => Math.round(p.equity)) },
            { name: "IHSG", color: "benchmark-1", values: eq.map((p) => Math.round(p.ihsg)) },
            { name: "LQ45", color: "benchmark-2", values: eq.map((p) => Math.round(p.lq45)) },
          ]}
          drawdown={[
            { name: "DD strategi", color: "strategy", values: eq.map((p) => p.dd) },
            { name: "DD IHSG", color: "benchmark-1", values: eq.map((p) => p.ihsg_dd ?? 0) },
          ]}
        />
        <div className="flex flex-wrap gap-x-s5 gap-y-s1 text-xs text-ink-3">
          <span>Akhir strategi <span className="font-mono text-ink-1">{rp(main.summary.final)}</span></span>
          <span>MDD strategi <span className="font-mono text-negative">{pct(main.summary.mdd)}</span></span>
          <span>MDD IHSG <span className="font-mono text-negative">{pct(ihsg?.mdd)}</span></span>
        </div>
      </Panel>
    </Section>
  );
}

export function MonthlySection({ main }: { main: Main }) {
  const { month_labels, rows } = main.monthly;
  const yearlyIhsg = new Map(main.yearly.map((y) => [y.year, y.ihsg ?? null]));
  const hasIhsg = main.yearly.some((y) => typeof y.ihsg === "number");
  return (
    <Section id="bulanan" icon="calendar" title="Return bulanan dan tahunan" lead="Return ekuitas per bulan kalender dan total per tahun. Sel kosong = di luar periode backtest.">
      <Panel>
        <Table caption="Return bulanan per tahun">
          <thead>
            <tr>
              <Th>Tahun</Th>
              {month_labels.map((m) => (
                <Th key={m} num>{m}</Th>
              ))}
              <Th num>Tahun</Th>
              {hasIhsg ? <Th num>IHSG</Th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.year}>
                <Td><span className="font-mono">{r.year}</span></Td>
                {r.months.map((v, i) => (
                  <Td key={i} num tone={tone(v)}>{pct(v)}</Td>
                ))}
                <Td num tone={tone(r.total)}><span className="font-semibold">{pct(r.total)}</span></Td>
                {hasIhsg ? <Td num tone={tone(yearlyIhsg.get(r.year))}>{pct(yearlyIhsg.get(r.year))}</Td> : null}
              </Tr>
            ))}
          </tbody>
        </Table>
        {!hasIhsg ? <Note>Return tahunan IHSG per tahun tidak tersedia di results.json (bernilai null), jadi tidak ditampilkan. Pembanding IHSG keseluruhan ada di kartu metrik.</Note> : null}
      </Panel>
    </Section>
  );
}

export function HistogramSection({ main }: { main: Main }) {
  const h = main.histogram;
  const s = main.summary_full;
  return (
    <Section id="distribusi" icon="histogram" title="Distribusi return per trade" lead={h.note}>
      <Panel title={`${int(s.n_trades)} trade tertutup`} icon="histogram" aside={`Menang ${int(s.n_wins)} | Kalah ${int(s.n_losses)}`}>
        <HistogramChart label="Histogram return per trade" edges={h.edges} counts={h.counts} unit="trade" />
      </Panel>
    </Section>
  );
}
