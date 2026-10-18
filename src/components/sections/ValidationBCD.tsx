// src/components/sections/ValidationBCD.tsx
import { TimeChart } from "@/components/charts/TimeChart";
import { Badge, KeyValue, Note, Panel, Prose, Section, type BadgeTone } from "@/components/ui/Section";
import { Stat, StatGrid } from "@/components/ui/Stat";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import type { Forward, Main, Meta, Validation } from "@/types/results";
import { date, int, num, pct, rp, rpShort, tone } from "@/lib/format";
import { CompareTable } from "./ValidationA";

export function ValidationB({ f, meta }: { f: Forward; meta: Meta }) {
  const s = f.summary;
  const zero = (s.n_trades ?? 0) === 0;
  return (
    <Section id="validitas-b" icon="forward" code="B" title="Validitas: forward test terpisah" lead={f.nature}>
      <Panel title="Hold-out sesudah riset" icon="forward" aside={`${date(f.start)} s.d. ${date(f.end)} | ${num(f.weeks, 1)} minggu`}>
        <StatGrid>
          <Stat label="Tanggal pembekuan" value={date(f.freeze_date)} />
          <Stat label="Jumlah trade" value={int(s.n_trades)} />
          <Stat label="CAGR" value={pct(s.cagr)} tone={tone(s.cagr)} sub={`Ekuitas ${rp(s.initial)} ke ${rp(s.final)}`} />
          <Stat label="MDD" value={pct(s.mdd)} />
          <Stat label="IHSG" value={`${num(f.benchmarks.IHSG?.start_value, 0)} ke ${num(f.benchmarks.IHSG?.end_value, 0)}`} sub={`MDD ${pct(f.benchmarks.IHSG?.mdd)} | CAGR disetahunkan ${pct(f.benchmarks.IHSG?.cagr)}`} />
          <Stat label="LQ45" value={`${num(f.benchmarks.LQ45?.start_value, 0)} ke ${num(f.benchmarks.LQ45?.end_value, 0)}`} sub={`MDD ${pct(f.benchmarks.LQ45?.mdd)} | CAGR disetahunkan ${pct(f.benchmarks.LQ45?.cagr)}`} />
        </StatGrid>
        <TimeChart
          label="Ekuitas forward test dibanding IHSG dan LQ45"
          dates={f.equity.map((p) => p.d)}
          height={200}
          series={[
            { name: "Strategi", color: "strategy", values: f.equity.map((p) => Math.round(p.equity)) },
            { name: "IHSG", color: "benchmark-1", values: f.equity.map((p) => Math.round(p.ihsg)) },
            { name: "LQ45", color: "benchmark-2", values: f.equity.map((p) => Math.round(p.lq45)) },
          ]}
        />
        {zero ? (
          <Note tone="warning">
            Nol trade selama forward test. Aturan rezim mensyaratkan IHSG di atas SMA200; sepanjang periode ini syarat itu tidak terpenuhi sehingga strategi memegang kas penuh.
            Metrik berbasis trade (win ratio, profit factor, Sharpe) tidak terdefinisi dan ditampilkan sebagai &quot;-&quot;, bukan nol. CAGR IHSG/LQ45 di atas disetahunkan dari periode {num(f.weeks, 1)} minggu, jadi angkanya membesar dan tidak layak dibandingkan langsung.
          </Note>
        ) : null}
        <p className="text-xs text-ink-3">Data terakhir {date(meta.data_last_date)}. Jalankan ulang backtest tiap minggu tanpa mengubah config agar periode forward memanjang.</p>
      </Panel>
    </Section>
  );
}

const statusTone = (s: string): BadgeTone => (s === "Lolos" ? "positive" : s === "Tidak berlaku" || s === "Lihat hasil" ? "neutral" : "negative");

export function ValidationC({ v, main }: { v: Validation; main: Main }) {
  const c = v.lookahead.contamination;
  const d = v.delay;
  return (
    <Section id="validitas-c" icon="lookahead" code="C" title="Validitas: look-ahead, kontaminasi, survivorship" lead="Pemeriksaan bahwa keputusan hanya memakai data yang sudah tersedia saat itu.">
      <Panel title="Pemeriksaan look-ahead" icon="lookahead">
        <Table caption="Pemeriksaan look-ahead">
          <thead><tr><Th>Aturan</Th><Th>Cara memeriksa</Th><Th>Status</Th></tr></thead>
          <tbody>
            {v.lookahead.checks.map((k) => (
              <Tr key={k.rule}>
                <Td>{k.rule}</Td>
                <Td muted>{k.how}</Td>
                <Td><Badge tone={statusTone(k.status)}>{k.status}</Badge></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <div className="grid-2">
        <Panel title="Uji kontaminasi masa depan" icon="database" aside={<Badge tone={c.passed ? "positive" : "negative"}>{c.passed ? "Lolos" : "Gagal"}</Badge>}>
          <p className="text-sm text-ink-2">{c.method}</p>
          <KeyValue
            rows={[
              { k: "Tanggal batas", v: date(c.cutoff) },
              { k: "Selisih ekuitas maks sebelum batas", v: <span className="font-mono tabular-nums">{rp(c.max_equity_diff_before)}</span> },
              { k: "Selisih ekuitas maks sesudah batas", v: <span className="font-mono tabular-nums">{rp(c.max_equity_diff_after)}</span> },
              { k: "Trade sebelum batas (asli / terkontaminasi)", v: <span className="font-mono tabular-nums">{int(c.trades_before_original)} / {int(c.trades_before_contaminated)}</span> },
              { k: "Trade identik", v: c.trades_identical ? "ya" : "tidak" },
            ]}
          />
        </Panel>
        <Panel title="Eksekusi ditunda 1 bar" icon="delay">
          <CompareTable caption="Eksekusi normal vs ditunda 1 bar" cols={[{ name: "Normal (t+1)", s: d.base }, { name: "Tunda (t+2)", s: d.delayed }]} />
          <TimeChart
            label="Ekuitas normal dibanding ekuitas eksekusi ditunda 1 bar, skala log"
            dates={main.equity.map((p) => p.d)}
            log
            height={180}
            series={[
              { name: "Normal", color: "strategy", values: main.equity.map((p) => Math.round(p.equity)) },
              { name: "Tunda 1 bar", color: "warning", values: d.equity_delayed.map((p) => Math.round(p.equity)), dashed: true },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Survivorship bias" icon="layers">
        <Prose items={v.survivorship.text} />
      </Panel>
    </Section>
  );
}

const BLOCKED_LABEL: Record<string, string> = {
  buy_lock_up: "Beli diblok: terkunci ARA",
  buy_untradable: "Beli gagal: tidak diperdagangkan / suspensi",
  buy_liquidity_capped: "Beli dipangkas batas likuiditas",
  buy_too_small: "Beli batal: kurang dari 1 lot",
  sell_lock_down: "Jual tertunda: terkunci ARB",
  sell_untradable: "Jual tertunda: tidak diperdagangkan",
  buy_no_slot: "Sinyal beli tanpa slot kosong",
};

export function ValidationD({ v, main }: { v: Validation; main: Main }) {
  const cs = v.costs;
  const s = main.summary_full;
  return (
    <Section id="validitas-d" icon="execution" code="D" title="Validitas: biaya dan realisme eksekusi" lead="Fee, spread, fraksi harga, lot, likuiditas, ARA/ARB, dan sensitivitas terhadap biaya. Rincian asumsi ada di bagian aturan strategi.">
      <div className="grid-2">
        <Panel title="Biaya yang dibayar" icon="cost">
          <StatGrid>
            <Stat label="Total fee" value={rpShort(s.total_fee)} />
            <Stat label="Total spread" value={rpShort(s.total_spread)} />
            <Stat label="Total biaya" value={rpShort(s.total_cost)} />
            <Stat label="Porsi dari laba kotor" value={pct(s.cost_share_of_gross)} />
          </StatGrid>
        </Panel>
        <Panel title="Order terblokir / tidak terisi" icon="cross">
          <Table caption="Order terblokir">
            <thead><tr><Th>Kejadian</Th><Th num>Jumlah</Th></tr></thead>
            <tbody>
              {Object.entries(main.blocked_orders).map(([k, n]) => (
                <Tr key={k}>
                  <Td muted>{BLOCKED_LABEL[k] ?? k}</Td>
                  <Td num>{int(n)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
      <Panel title="Tanpa biaya / biaya dasar / biaya 2x" icon="sensitivity">
        <CompareTable caption="Perbandingan skenario biaya" cols={[{ name: "Tanpa biaya", s: cs.zero }, { name: "Biaya dasar", s: cs.base }, { name: "Biaya 2x", s: cs.double }]} />
        <Note>Biaya 2x: {cs.double_definition}</Note>
      </Panel>
    </Section>
  );
}

export function RedFlagsSection({ v }: { v: Validation }) {
  const n = v.red_flags.filter((f) => f.triggered).length;
  const fmt = (flag: string, x: number | number[] | null) => {
    if (x === null) return "-";
    if (Array.isArray(x)) return x.map((y) => pct(y)).join(" / ");
    if (/profit factor/i.test(flag)) return num(x);
    if (/tahun rugi/i.test(flag)) return int(x);
    return pct(x);
  };
  return (
    <Section id="bahaya" icon="risk" title="Tanda bahaya" lead={`${n} dari ${v.red_flags.length} tanda bahaya terpicu.`}>
      <Panel>
        <Table caption="Tanda bahaya">
          <thead><tr><Th>Tanda</Th><Th num>Nilai</Th><Th>Status</Th></tr></thead>
          <tbody>
            {v.red_flags.map((f) => (
              <Tr key={f.flag}>
                <Td>{f.flag}</Td>
                <Td num>{fmt(f.flag, f.value)}</Td>
                <Td>{f.triggered ? <Badge tone="warning">Terpicu</Badge> : <Badge tone="positive">Aman</Badge>}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </Section>
  );
}
