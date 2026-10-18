// src/components/sections/IdentitySection.tsx
import { KeyValue, Note, Panel, Section } from "@/components/ui/Section";
import type { Identity, Meta, Rules } from "@/types/results";
import { date, int, pct, rp } from "@/lib/format";

const isPlaceholder = (v: string | undefined) => !v || v.startsWith("ISI ");

export function IdentitySection({ id, meta, rules }: { id: Identity; meta: Meta; rules: Rules }) {
  const prodi = id.prodi ?? id.kelas;
  const placeholder = [id.nama, id.nim, prodi].some(isPlaceholder);
  return (
    <Section id="identitas" icon="user" title="Identitas dan strategi" lead={rules.summary}>
      <div className="grid-2">
        <Panel title="Pemilik tugas" icon="user">
          <KeyValue
            rows={[
              { k: "Nama", v: id.nama },
              { k: "NIM", v: <span className="font-mono tabular-nums">{id.nim}</span> },
              { k: "Prodi", v: prodi ?? "-" },
              { k: "Mata kuliah", v: id.mata_kuliah },
              { k: "Tugas", v: id.tugas },
            ]}
          />
          {placeholder ? <Note tone="warning">Identitas masih placeholder. Isi data/identity.json lalu build ulang.</Note> : null}
        </Panel>
        <Panel title="Strategi" icon="rules">
          <KeyValue
            rows={[
              { k: "Nama strategi", v: `${meta.strategy_name} v${meta.strategy_version}` },
              { k: "Parameter", v: <span className="font-mono">breakout {meta.params.breakout} | trend_ma {meta.params.trend_ma} | trail_atr {meta.params.trail_atr}</span> },
              { k: "Periode backtest", v: `${date(meta.backtest_start)} s.d. ${date(meta.backtest_end)}` },
              { k: "Akhir data riset", v: date(meta.research_end) },
              { k: "Tanggal pembekuan", v: <span className="text-cyan-3">{date(meta.freeze_date)}</span> },
              { k: "Forward test", v: `${date(meta.forward_start)} s.d. ${date(meta.data_last_date)}` },
              { k: "Modal awal", v: <span className="font-mono tabular-nums">{rp(meta.initial_capital)}</span> },
              { k: "Ukuran posisi", v: `${int(meta.max_positions)} slot x ${pct(meta.position_fraction, 0)} ekuitas, ${meta.compounding ? "compounding" : "tanpa compounding"}` },
            ]}
          />
        </Panel>
      </div>
    </Section>
  );
}
