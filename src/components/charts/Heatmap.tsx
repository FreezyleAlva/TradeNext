// src/components/charts/Heatmap.tsx
import type { Heatmap as HeatmapData, HeatCell } from "@/types/results";
import { num, pct } from "@/lib/format";

type Metric = "calmar" | "cagr";

const STEPS = ["bg-surface-3", "bg-blue-1", "bg-cyan-1", "bg-cyan-2"] as const;

function bucket(v: number, positives: number[]): string {
  if (v < 0) return "bg-negative text-surface-0";
  const n = positives.length;
  if (!n) return STEPS[0];
  const rank = positives.filter((p) => p <= v).length / n;
  const i = Math.min(STEPS.length - 1, Math.floor(rank * STEPS.length - 1e-9));
  return `${STEPS[Math.max(0, i)]} ${i >= 3 ? "text-surface-0" : "text-ink-1"}`;
}

export function Heatmap({
  data,
  metric,
  chosen,
  label,
}: {
  data: HeatmapData;
  metric: Metric;
  chosen?: { x: number; y: number };
  label: string;
}) {
  const vals = data.cells.flat().map((c: HeatCell | null) => c?.[metric]).filter((v): v is number => typeof v === "number");
  const positives = vals.filter((v) => v >= 0).sort((a, b) => a - b);
  const fmt = metric === "cagr" ? (v: number | null | undefined) => pct(v ?? null) : (v: number | null | undefined) => num(v ?? null);

  return (
    <div className="table-wrap overflow-x-auto" tabIndex={0} role="region" aria-label={label}>
      <table className="heatmap text-xs">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th scope="col" className="px-s2 py-s1 text-left font-medium text-ink-3">
              {data.y_param} \ {data.x_param}
            </th>
            {data.x.map((x) => (
              <th key={x} scope="col" className="px-s2 py-s1 text-right font-mono font-medium text-ink-3">{num(x, 0)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.y.map((y, yi) => (
            <tr key={y}>
              <th scope="row" className="px-s2 py-s1 text-left font-mono font-medium text-ink-3">{num(y, 0)}</th>
              {data.x.map((x, xi) => {
                const c = data.cells[yi]?.[xi] ?? null;
                const v = c?.[metric];
                const isChosen = chosen?.x === x && chosen?.y === y;
                const cls = typeof v === "number" ? bucket(v, positives) : "bg-surface-2 text-ink-4";
                return (
                  <td key={x} className={`heat-cell px-s2 py-s1 text-right font-mono tabular-nums ${cls} ${isChosen ? "heat-chosen" : ""}`} title={c ? `CAGR ${pct(c.cagr)} | Calmar ${num(c.calmar)} | MDD ${pct(c.mdd)}` : undefined}>
                    {fmt(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HeatLegend() {
  return (
    <div className="flex flex-wrap items-center gap-s3 text-xs text-ink-3">
      <span className="flex items-center gap-s1"><span className="legend-swatch bg-negative" aria-hidden="true" />negatif</span>
      {STEPS.map((s, i) => (
        <span key={s} className="flex items-center gap-s1"><span className={`legend-swatch ${s}`} aria-hidden="true" />kuartil {i + 1}</span>
      ))}
      <span className="flex items-center gap-s1"><span className="legend-swatch legend-chosen" aria-hidden="true" />parameter terpilih</span>
    </div>
  );
}
