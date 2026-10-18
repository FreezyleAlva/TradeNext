// src/components/sections/DocsSections.tsx
import { Note, Panel, Prose, Section } from "@/components/ui/Section";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import type { Docs, Identity, Main, Meta, OpenPosition, Trade } from "@/types/results";
import { date, int } from "@/lib/format";
import { TradeLog } from "./TradeLog";

function OpenPositions({ rows, title }: { rows: OpenPosition[]; title: string }) {
  if (!rows.length) {
    return <p className="text-sm text-ink-3">{title}: tidak ada posisi terbuka di akhir periode.</p>;
  }
  const cols = Object.keys(rows[0] ?? {});
  return (
    <Table caption={title}>
      <thead><tr>{cols.map((c) => <Th key={c} num={typeof rows[0]?.[c] === "number"}>{c}</Th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <Tr key={i}>
            {cols.map((c) => {
              const v = r[c];
              return <Td key={c} num={typeof v === "number"}>{v === null || v === undefined ? "-" : String(v)}</Td>;
            })}
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

export function TradeLogSection({ main, forwardTrades, forwardOpen }: { main: Main; forwardTrades: Trade[]; forwardOpen: OpenPosition[] }) {
  return (
    <Section id="log" icon="tradelog" title="Log trade" lead={`Semua ${int(main.trades.length)} trade tertutup periode backtest. Harga dalam rupiah per lembar, 1 lot = 100 lembar, eksekusi di pembukaan sesi.`}>
      <Panel title="Trade tertutup" icon="tradelog">
        <TradeLog trades={main.trades} />
      </Panel>
      <Panel title="Posisi terbuka (terpisah dari log)" icon="layers">
        <OpenPositions rows={main.open_positions} title="Backtest" />
        <OpenPositions rows={forwardOpen} title="Forward test" />
        <p className="text-sm text-ink-3">Trade forward test: {int(forwardTrades.length)}.</p>
      </Panel>
    </Section>
  );
}

export function LimitationsSection({ docs }: { docs: Docs }) {
  return (
    <Section id="keterbatasan" icon="layers" title="Keterbatasan dan pelajaran">
      <div className="grid-2">
        <Panel title="Keterbatasan" icon="risk">
          <Prose items={docs.limitations} />
        </Panel>
        <Panel title="Pelajaran" icon="info">
          <Prose items={docs.lessons} />
        </Panel>
      </div>
    </Section>
  );
}

export function StatementSection({ docs, id, meta }: { docs: Docs; id: Identity; meta: Meta }) {
  const ai = docs.ai_statement;
  return (
    <Section id="pernyataan" icon="statement" title="Pernyataan keaslian dan penggunaan AI">
      <Panel>
        <Table caption="Alat AI yang dipakai">
          <thead><tr><Th>Alat</Th><Th>Dipakai untuk</Th></tr></thead>
          <tbody>
            {ai.tools.map((t) => (
              <Tr key={t.tool}>
                <Td>
                  <span className="flex flex-col">
                    <span className="text-ink-1">{t.tool}</span>
                    {t.platform ? <span className="text-xs text-ink-3">berjalan di {t.platform}</span> : null}
                  </span>
                </Td>
                <Td muted>{t.used_for}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <p className="text-sm text-ink-2"><span className="text-ink-1">Peran mahasiswa:</span> {ai.human_role}</p>
        <Note>{ai.integrity}</Note>
        <p className="text-xs text-ink-3">
          {id.nama} ({id.nim}) | {meta.strategy_name} v{meta.strategy_version} | dibekukan {date(meta.freeze_date)} | results.json dibuat {meta.generated_at}
        </p>
      </Panel>
    </Section>
  );
}
