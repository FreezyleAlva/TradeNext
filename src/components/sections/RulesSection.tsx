// src/components/sections/RulesSection.tsx
import { Icon } from "@/components/ui/Icon";
import { KeyValue, Panel, Prose, Section } from "@/components/ui/Section";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import type { CostItem, Meta, Rules } from "@/types/results";
import { date, int, num } from "@/lib/format";

const FIXED_LABEL: Record<string, string> = {
  atr_window: "Jendela ATR",
  regime_ma: "SMA rezim IHSG",
  rank_window: "Jendela momentum peringkat",
  min_adv_value: "Nilai transaksi rata-rata minimum (Rp)",
  min_price: "Harga minimum (Rp)",
};

export function RulesSection({ rules, meta, costs }: { rules: Rules; meta: Meta; costs: CostItem[] }) {
  return (
    <Section id="aturan" icon="rules" title="Aturan strategi" lead="Aturan lengkap yang dibekukan. Semua order market di pembukaan bar berikutnya.">
      <div className="grid-2">
        <Panel title="Masuk (entry)" icon="arrow_up">
          <Prose items={rules.entry} />
        </Panel>
        <div className="flex min-w-0 flex-col gap-s4">
          <Panel title="Keluar (exit)" icon="arrow_down">
            <Prose items={rules.exit} />
          </Panel>
          <Panel title="Ukuran posisi" icon="layers">
            <Prose items={rules.sizing} />
          </Panel>
        </div>
      </div>
      <div className="grid-2">
        <Panel title="Universe, timeframe, parameter" icon="filter">
          <KeyValue
            rows={[
              { k: "Universe", v: `${rules.universe} (${int(meta.universe.length)} ticker)` },
              { k: "Timeframe", v: rules.timeframe },
              { k: "Dioptimasi", v: <span className="font-mono">{rules.parameters.optimized.join(", ")}</span> },
              ...Object.entries(rules.parameters.fixed).map(([k, v]) => ({
                k: FIXED_LABEL[k] ?? k,
                v: <span className="font-mono tabular-nums">{num(v, 0)}</span>,
              })),
            ]}
          />
          <details className="text-sm text-ink-2">
            <summary className="tap flex cursor-pointer items-center gap-s2 text-ink-1">
              <Icon name="chevron_right" className="size-s4 text-ink-3" />
              Daftar {int(meta.universe.length)} ticker
            </summary>
            <p className="mt-s2 font-mono text-xs leading-relaxed text-ink-2">{meta.universe.join("  ")}</p>
          </details>
        </Panel>
        <Panel title="Sumber data" icon="database">
          <KeyValue
            rows={[
              { k: "Sumber harga", v: meta.data_source },
              { k: "Tanggal unduh", v: date(meta.data_downloaded_on) },
              { k: "Jumlah file", v: <span className="font-mono tabular-nums">{int(meta.data_files)}</span> },
              { k: "Data terakhir", v: date(meta.data_last_date) },
              {
                k: "Sumber universe",
                v: (
                  <span>
                    {meta.universe_source}{" "}
                    <a href={meta.universe_source_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-s1">
                      tautan <Icon name="external" className="size-s3" />
                    </a>
                  </span>
                ),
              },
              ...Object.entries(meta.benchmarks).map(([k, v]) => ({ k: `Pembanding ${k}`, v })),
            ]}
          />
        </Panel>
      </div>
      <Panel title="Asumsi biaya dan eksekusi" icon="cost">
        <Table caption="Asumsi biaya dan eksekusi">
          <thead>
            <tr>
              <Th>Komponen</Th>
              <Th>Nilai</Th>
              <Th>Rincian</Th>
            </tr>
          </thead>
          <tbody>
            {costs.map((c) => (
              <Tr key={c.item}>
                <Td>{c.item}</Td>
                <Td><span className="font-mono whitespace-nowrap">{c.value}</span></Td>
                <Td muted>{c.detail}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </Section>
  );
}
