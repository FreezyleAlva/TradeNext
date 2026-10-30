// src/components/sections/RevisionSection.tsx
import { TimeChart, type Series, type SeriesColor } from "@/components/charts/TimeChart";
import { Badge, Panel, Section } from "@/components/ui/Section";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { date, int, num, pct, rp, tone } from "@/lib/format";
import type { Meta, Main } from "@/types/results";
import type { Revision } from "@/types/revision";

const LABEL: Record<string, string> = {
  final: "Ekuitas akhir",
  cagr: "CAGR",
  mdd: "Max drawdown",
  sharpe: "Sharpe",
  win_ratio: "Win ratio",
  profit_factor: "Profit factor",
  n_trades: "Jumlah trade",
  total_cost: "Total biaya",
  cagr_in_sample: "CAGR in-sample",
  cagr_out_of_sample: "CAGR out-of-sample",
};

const fmt = (k: string, v: number) => (k === "final" || k === "total_cost" ? rp(v) : k === "n_trades" ? int(v) : /sharpe|profit/.test(k) ? num(v, 4) : pct(v, 3));

const CHART: [string, SeriesColor][] = [
  ["base", "strategy"],
  ["spread3", "benchmark-1"],
  ["capacity", "warning"],
  ["conservative", "benchmark-2"],
];

export function RevisionSection({ rev, meta, main }: { rev: Revision; meta: Meta; main: Main }) {
  const rp_ = rev.reproduction;
  const ig = rev.integrity;
  const q = rev.quality;
  const sc = rev.scenarios;
  const snap = ig.snapshot;
  const diff = snap ? Object.values(snap.bars_different).reduce((a, b) => a + b, 0) : null;
  const by = (k: string) => sc.find((x) => x.key === k);
  const base = by("base")!;
  const dates = base.equity.map((p) => p[0]);
  const series: Series[] = CHART.flatMap(([k, color]) => {
    const x = by(k);
    if (!x) return [];
    const scale = k === "capacity" ? 1e8 / 1e10 : 1;
    const m = new Map(x.equity.map((p) => [p[0], p[1] * scale]));
    return [{ name: x.label, color, values: dates.map((d) => Math.round(m.get(d) ?? NaN)) }];
  });
  const lo = Math.min(0, rev.range.cagr_min);
  const span = Math.max(1e-4, rev.range.cagr_max - lo);
  const at = (v: number) => ((v - lo) / span) * 100;
  const ihsg = main.benchmarks.IHSG?.cagr ?? null;
  const steps: [string, string][] = [
    ["Mesin backtest ikut di repositori", "Folder backtest/ (Python) sekarang berada di repositori yang sama dengan dashboard, bersama 102 file harga mentah. Satu perintah memverifikasi semua klaim."],
    ["Reproduksi bit demi bit", `${rp_.trades_identical} dari ${rp_.trades_claimed} trade identik (aset, tanggal, lot, laba bersih). Selisih ekuitas akhir ${rp(rp_.final_equity_diff)}.`],
    ["Data terbukti asli", `SHA256 ${ig.sha256_match}/${ig.files} file cocok dengan manifest.${snap ? ` Unduh ulang Yahoo ${date(snap.downloaded_on)}: ${int(snap.bars_compared)} bar dibandingkan, ${int(diff)} berbeda.` : ""}`],
    ["Audit kualitas data", `${int(q.bars)} bar diperiksa terhadap batas ARA/ARB BEI. ${q.glitches.length} bar glitch Yahoo ditemukan dan dibersihkan; ${q.trades_touched.length} trade tersentuh.`],
    ["Sensitivitas data dan eksekusi", `${sc.length} skenario dijalankan dengan mesin yang sama: data bersih, spread, biaya, tunda, universe tanpa IPO baru, kapasitas modal.`],
    ["Parameter tidak disentuh", `Parameter beku ${meta.params.breakout} / ${meta.params.trend_ma} / ${meta.params.trail_atr} tetap. Revisi hanya menambah bukti, tidak mencari angka yang lebih bagus.`],
  ];
  return (
    <Section id="revisi" icon="check" title="Revisi UTS" lead="Perbaikan sesudah feedback: mesin backtest, reproduksi, integritas dan kualitas data, sensitivitas hasil terhadap data dan eksekusi.">
      <blockquote className="quote">
        &quot;AUDIT: mesin backtest ADA (sebelumnya terlewat) &amp; mereproduksi klaim persis; data rumah 10,2%.&quot;
        <small>Feedback UTS Dashboard Algoritma Trading. Revisi ini menjawab dua hal: mesin backtest tidak boleh lagi terlewat, dan hasil harus diuji terhadap perbedaan data.</small>
      </blockquote>
      <ol className="steps">
        {steps.map(([t, d], i) => (
          <li key={t}>
            <span className="n">{String(i + 1).padStart(2, "0")}</span>
            <b>{t}</b>
            <p>{d}</p>
          </li>
        ))}
      </ol>

      <Panel title="1. Reproduksi klaim" icon="check" aside={rp_.command}>
        <p className="text-sm text-ink-2">Mesin dijalankan ulang dari data mentah dan dibandingkan dengan angka dashboard UTS (results.json). Toleransi: identik sampai presisi floating point.</p>
        <Table caption="Reproduksi klaim">
          <thead>
            <tr><Th>Metrik</Th><Th num>Klaim UTS</Th><Th num>Hasil ulang</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {rp_.checks.map((c) => (
              <Tr key={c.metric}>
                <Td>{LABEL[c.metric] ?? c.metric}</Td>
                <Td num>{fmt(c.metric, c.claimed)}</Td>
                <Td num>{fmt(c.metric, c.reproduced)}</Td>
                <Td><Badge tone={c.match ? "positive" : "negative"}>{c.match ? "Cocok" : "Beda"}</Badge></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <pre className="code">{`python -m backtest verify      # cek semua klaim
python -m backtest revision    # hitung ulang bagian Revisi
python -m backtest download    # unduh ulang Yahoo ke data/snapshots/<tanggal>`}</pre>
      </Panel>

      <div className="grid-2">
        <Panel title="2. Snapshot beku" icon="database">
          <StatGrid>
            <Stat label="Sumber" value={ig.source.split(" (")[0]} />
            <Stat label="Diunduh" value={date(ig.downloaded_on)} />
            <Stat label="SHA256 cocok" value={`${ig.sha256_match} / ${ig.files}`} tone={ig.sha256_match === ig.files ? "positive" : "negative"} />
          </StatGrid>
          <p className="text-xs text-ink-3">{ig.hash_note}</p>
        </Panel>
        <Panel title="Unduh ulang independen" icon="download">
          {snap ? (
            <StatGrid>
              <Stat label="Tanggal unduh" value={date(snap.downloaded_on)} />
              <Stat label="Bar dibandingkan" value={int(snap.bars_compared)} />
              <Stat label="Bar berbeda" value={int(diff)} tone={diff === 0 ? "positive" : "negative"} />
              <Stat label="CAGR data baru" value={pct(snap.result.cagr, 2)} />
            </StatGrid>
          ) : (
            <p className="text-sm text-ink-3">Belum ada snapshot.</p>
          )}
          <p className="text-xs text-ink-3">Open, High, Low, Close, dan Volume 2016-2026 dibandingkan per bar. Data bukan sintetis: siapa pun bisa mengunduh ulang dari Yahoo dan mendapat angka yang sama.</p>
        </Panel>
      </div>

      <Panel title="3. Audit kualitas data" icon="filter">
        <ul className="flex flex-col gap-s1 text-sm text-ink-2">
          {q.rules.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <StatGrid>
          <Stat label="Bar diperiksa" value={int(q.bars)} />
          <Stat label="Lompatan melewati batas" value={int(q.totals.beyond_ara)} sub={`${pct(q.flagged_share, 3)} dari semua bar`} />
          <Stat label="Glitch dibersihkan" value={int(q.glitches.length)} />
          <Stat label="OHLC tidak konsisten" value={int(q.totals.ohlc_inconsistent)} />
          <Stat label="Trade tersentuh" value={int(q.trades_touched.length)} sub={q.trades_touched.map((t) => `${t.ticker} ${t.entry_date}`).join(", ")} />
        </StatGrid>
        <div className="grid-2">
          <Table caption="Glitch yang dibersihkan">
            <thead><tr><Th>Aset</Th><Th>Tanggal</Th><Th num>Close Yahoo</Th></tr></thead>
            <tbody>
              {q.glitches.map((g) => (
                <Tr key={g.ticker + g.date}><Td><span className="font-mono">{g.ticker}</span></Td><Td><span className="font-mono">{g.date}</span></Td><Td num tone="negative">{num(g.close, 2)}</Td></Tr>
              ))}
            </tbody>
          </Table>
          <div className="table-scroll">
            <Table caption="Lompatan melewati batas ARA/ARB">
              <thead><tr><Th>Aset</Th><Th>Tanggal</Th><Th num>Lompatan</Th><Th num>Batas</Th></tr></thead>
              <tbody>
                {q.events.map((e) => (
                  <Tr key={e.ticker + e.date}><Td><span className="font-mono">{e.ticker}</span></Td><Td><span className="font-mono">{e.date}</span></Td><Td num tone={tone(e.value)}>{pct(e.value, 1, true)}</Td><Td num muted>{pct(e.limit, 0)}</Td></Tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
        <p className="text-xs text-ink-3">Contoh: MAPI 2 Mei 2018 tercatat Rp82,25 padahal sehari sebelum dan sesudahnya sekitar Rp820; harga bergeser satu digit desimal. Di data mentah, glitch ini memicu trailing stop MAPI yang semestinya tidak terjadi.</p>
      </Panel>

      <Panel title="4. Sensitivitas hasil terhadap data dan eksekusi" icon="sensitivity">
        <p className="text-sm text-ink-2">Semua skenario memakai parameter beku dan mesin yang sama. Yang diubah hanya data atau asumsi eksekusi.</p>
        <Table caption="Skenario sensitivitas">
          <thead>
            <tr><Th>Skenario</Th><Th>Perubahan</Th><Th num>CAGR</Th><Th num>CAGR OOS</Th><Th num>MDD</Th><Th num>Sharpe</Th><Th num>PF</Th><Th num>Trade</Th></tr>
          </thead>
          <tbody>
            {sc.map((x) => (
              <Tr key={x.key} highlight={x.key === "base"}>
                <Td>{x.label}</Td>
                <Td muted>{x.detail}</Td>
                <Td num tone={tone(x.summary.cagr)}>{pct(x.summary.cagr)}</Td>
                <Td num tone={tone(x.oos_cagr)}>{pct(x.oos_cagr)}</Td>
                <Td num tone="negative">{pct(x.summary.mdd)}</Td>
                <Td num>{num(x.summary.sharpe)}</Td>
                <Td num>{num(x.summary.profit_factor)}</Td>
                <Td num>{int(x.summary.n_trades)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <div className="range" role="img" aria-label="Rentang CAGR semua skenario">
          <i style={{ left: `${at(rev.range.cagr_min).toFixed(2)}%`, right: `${(100 - at(rev.range.cagr_max)).toFixed(2)}%` }} />
          <b style={{ left: `${at(base.summary.cagr ?? 0).toFixed(2)}%` }} />
        </div>
        <StatGrid>
          <Stat label="Terendah" value={pct(rev.range.cagr_min)} />
          <Stat label="Klaim UTS" value={pct(base.summary.cagr)} />
          <Stat label="Tertinggi" value={pct(rev.range.cagr_max)} />
          <Stat label="IHSG periode sama" value={pct(ihsg)} tone={tone(ihsg)} />
        </StatGrid>
        <TimeChart label="Ekuitas per skenario, dinormalkan ke modal Rp100 juta, skala log" dates={dates} series={series} log height={280} />
      </Panel>

      <Panel title="5. Membaca angka 10,2%" icon="info">
        <ol className="flex list-decimal flex-col gap-s2 pl-s5 text-sm text-ink-2">
          <li>Data rumah yang dipakai penilai tidak tersedia bagi mahasiswa, jadi angka 10,2% tidak bisa direproduksi langsung. Yang bisa dibuktikan: dengan data Yahoo, mesin ini menghasilkan klaim UTS persis, dan data Yahoo itu stabil saat diunduh ulang.</li>
          <li>Beda data bukan satu-satunya penjelasan. Dengan data yang sama, CAGR turun ke {pct(by("spread3")?.summary.cagr)} bila spread 3 fraksi, dan ke {pct(by("capacity")?.summary.cagr)} bila modal Rp10 miliar sehingga batas likuiditas mulai menahan ukuran order. Angka penilai dekat dengan ujung bawah rentang yang bisa dijelaskan oleh asumsi eksekusi dan ukuran modal.</li>
          <li>Survivorship bias tidak bisa dikoreksi penuh tanpa daftar konstituen historis. Uji tanpa IPO baru ({pct(by("since2016")?.summary.cagr)}) hanya menghapus satu sumber bias; saham yang delisting atau keluar indeks tetap tidak ada di data, jadi angka sebenarnya kemungkinan lebih rendah dari klaim.</li>
          <li>Kesimpulan revisi: ekspektasi realistis strategi ini adalah CAGR belasan persen dengan drawdown 35-45%, bukan 16,7% sebagai angka pasti. Strategi tetap di atas IHSG ({pct(ihsg)}) di semua skenario.</li>
        </ol>
      </Panel>
    </Section>
  );
}
