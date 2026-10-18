// src/components/sections/MetricsSection.tsx
import { Note, Panel, Section } from "@/components/ui/Section";
import { Stat, StatGrid } from "@/components/ui/Stat";
import type { Benchmark, SummaryFull } from "@/types/results";
import { date, int, num, pct, rp, rpShort, tone } from "@/lib/format";

export function MetricsSection({
  s,
  benchmarks,
  rfNote,
}: {
  s: SummaryFull;
  benchmarks: Record<string, Benchmark>;
  rfNote: string | undefined;
}) {
  const ihsg = benchmarks.IHSG;
  const lq45 = benchmarks.LQ45;
  return (
    <Section
      id="metrik"
      icon="metrics"
      title="Metrik kinerja"
      lead={`Periode ${date(s.start)} s.d. ${date(s.end)}, sesudah semua biaya. Modal awal ${rp(s.initial)}, ekuitas akhir ${rp(s.final)}.`}
    >
      <Panel title="Metrik utama" icon="metrics">
        <StatGrid cols="lg">
          <Stat size="lg" label="CAGR" value={pct(s.cagr)} tone={tone(s.cagr)} sub={`IHSG ${pct(ihsg?.cagr)} | LQ45 ${pct(lq45?.cagr)}`} />
          <Stat size="lg" label="Win ratio" value={pct(s.win_ratio)} sub={`${int(s.n_wins)} menang dari ${int(s.n_trades)} trade`} />
          <Stat size="lg" label="Rata-rata profit" value={pct(s.avg_win_pct, 1, true)} tone="positive" sub={rp(s.avg_win_rp, true)} />
          <Stat size="lg" label="Rata-rata loss" value={pct(s.avg_loss_pct, 1)} tone="negative" sub={rp(s.avg_loss_rp)} />
          <Stat size="lg" label="Profit factor" value={num(s.profit_factor)} sub={`${rpShort(s.gross_win_rp)} / ${rpShort(s.gross_loss_rp)}`} />
          <Stat size="lg" label="Bulan dengan rekor ekuitas baru" value={pct(s.record_month_share)} sub={`dari ${int(s.n_months)} bulan`} />
        </StatGrid>
      </Panel>
      <Panel title="Metrik pelengkap" icon="layers">
        <StatGrid>
          <Stat label="Max drawdown" value={pct(s.mdd)} tone="negative" sub={`IHSG ${pct(ihsg?.mdd)} | LQ45 ${pct(lq45?.mdd)}`} />
          <Stat label="Bulan terlama tanpa rekor" value={`${int(s.longest_months_no_record)} bulan`} />
          <Stat label="Jumlah trade" value={int(s.n_trades)} sub={`${num(s.trades_per_year, 1)} per tahun`} />
          <Stat label="Rata-rata hari pegang" value={`${num(s.avg_hold_days, 1)} hari`} sub={`${num(s.avg_hold_bars, 1)} hari bursa`} />
          <Stat label="Expectancy per trade" value={pct(s.expectancy_pct, 2, true)} tone={tone(s.expectancy_pct)} />
          <Stat label="Payoff ratio" value={num(s.payoff_ratio)} sub="avg profit / avg loss" />
          <Stat label="Sharpe (tanpa rf)" value={num(s.sharpe)} sub={`Excess rf: ${num(s.sharpe_excess)}`} />
          <Stat label="Calmar" value={num(s.calmar)} sub="CAGR / |MDD|" />
          <Stat label="Sortino" value={num(s.sortino)} />
          <Stat label="Exposure (hari)" value={pct(s.exposure_days)} sub={`Modal terpakai rata-rata ${pct(s.avg_capital_used)}`} />
          <Stat label="Porsi biaya dari laba kotor" value={pct(s.cost_share_of_gross)} sub={`Biaya ${rpShort(s.total_cost)}`} />
          <Stat label="Kekalahan beruntun terpanjang" value={`${int(s.longest_losing_streak)} trade`} />
          <Stat label="Kontribusi 10 trade terbaik" value={pct(s.top10_share_of_net)} sub={`${rpShort(s.top10_pnl)} dari laba bersih ${rpShort(s.net_pnl)}`} />
          <Stat label="Tahun rugi" value={`${int(s.losing_years)} dari ${int(s.n_years_measured)}`} />
          <Stat label="Laba bersih" value={rpShort(s.net_pnl)} tone={tone(s.net_pnl)} sub={`Kotor ${rpShort(s.gross_pnl)}`} />
          <Stat label="Return bulanan rata-rata" value={pct(s.monthly_mean, 2, true)} sub={`Std ${pct(s.monthly_std, 2)}`} />
        </StatGrid>
        <Note>
          {s.small_sample
            ? "Sampel kecil: jumlah trade terlalu sedikit untuk menarik kesimpulan statistik yang kuat."
            : `Jumlah trade ${int(s.n_trades)} cukup untuk metrik dasar, tetapi laba bergantung pada sedikit trade besar (lihat kontribusi 10 trade terbaik dan uji tanpa 5 trade terbaik).`}
          {rfNote ? ` ${rfNote}` : null}
        </Note>
      </Panel>
    </Section>
  );
}
