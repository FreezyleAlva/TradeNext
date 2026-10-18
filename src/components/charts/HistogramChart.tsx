// src/components/charts/HistogramChart.tsx
"use client";
import { useState } from "react";
import { linear, linearTicks } from "@/lib/chart";
import { int, pct } from "@/lib/format";
import { useWidth } from "./useWidth";

export interface Marker {
  value: number;
  label: string;
}

const PAD_L = 40;
const PAD_R = 12;

export function HistogramChart({
  label,
  edges,
  counts,
  markers = [],
  colorBySign = true,
  height = 220,
  unit = "trade",
}: {
  label: string;
  edges: number[];
  counts: number[];
  markers?: Marker[];
  colorBySign?: boolean;
  height?: number;
  unit?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const top = 22;
  const bottom = top + height;
  const plotW = Math.max(40, width - PAD_L - PAD_R);
  const lo = edges[0] ?? 0;
  const hi = edges[edges.length - 1] ?? 1;
  const x = linear(lo, hi, PAD_L, PAD_L + plotW);
  const maxC = Math.max(1, ...counts);
  const yTicks = linearTicks(0, maxC, 4);
  const y = linear(0, yTicks[yTicks.length - 1] ?? maxC, bottom, top);
  const step = Math.ceil(edges.length / Math.max(2, Math.floor(plotW / 52)));
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div ref={ref} className="chart-box relative w-full rounded-md bg-surface-2" role="img" aria-label={label}>
      <svg width={width} height={bottom + 28} className="block">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={PAD_L + plotW} y1={y(t)} y2={y(t)} className="stroke-chart-grid" />
            <text x={PAD_L - 6} y={y(t) + 4} textAnchor="end" className="fill-ink-3 text-xs tabular-nums">{int(t)}</text>
          </g>
        ))}
        {counts.map((c, i) => {
          const a = edges[i] ?? 0;
          const b = edges[i + 1] ?? a;
          const mid = (a + b) / 2;
          const cls = !colorBySign ? "fill-blue-2" : mid < 0 ? "fill-negative" : "fill-positive";
          const x0 = x(a) + 1;
          const w = Math.max(1, x(b) - x(a) - 2);
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={x0} y={top} width={w} height={bottom - top} className="fill-surface-2" />
              <rect x={x0} y={y(c)} width={w} height={bottom - y(c)} className={hover === i ? "fill-ink-2" : cls} />
            </g>
          );
        })}
        {edges.map((e, i) =>
          i % step === 0 ? (
            <text key={i} x={x(e)} y={bottom + 18} textAnchor="middle" className="fill-ink-3 text-xs tabular-nums">{pct(e, 0)}</text>
          ) : null,
        )}
        {markers.map((m, k) => (
          <g key={m.label}>
            <line x1={x(m.value)} x2={x(m.value)} y1={top - 4} y2={bottom} className="stroke-ink-1" strokeDasharray="3 3" />
            <text x={x(m.value)} y={top - 8 - k * 0} textAnchor={x(m.value) > PAD_L + plotW * 0.8 ? "end" : "start"} dx={x(m.value) > PAD_L + plotW * 0.8 ? -4 : 4} className="fill-ink-1 text-xs">{m.label}</text>
          </g>
        ))}
      </svg>
      {hover !== null ? (
        <div className="pointer-events-none absolute right-s2 top-s2 rounded-md bg-surface-4 p-s2 text-xs text-ink-1">
          <span className="font-mono tabular-nums">{pct(edges[hover], 0)} s.d. {pct(edges[hover + 1], 0)}</span>
          <span className="text-ink-3"> : </span>
          <span className="font-mono tabular-nums">{int(counts[hover])} {unit}</span>
          <span className="text-ink-3"> ({pct(total ? (counts[hover] ?? 0) / total : null)})</span>
        </div>
      ) : null}
    </div>
  );
}
