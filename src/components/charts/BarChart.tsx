// src/components/charts/BarChart.tsx
"use client";
import { linear, linearTicks } from "@/lib/chart";
import { pct } from "@/lib/format";
import { useWidth } from "./useWidth";

const PAD_L = 48;
const PAD_R = 12;

export function BarChart({
  label,
  labels,
  values,
  height = 200,
}: {
  label: string;
  labels: string[];
  values: (number | null)[];
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const top = 16;
  const bottom = top + height;
  const plotW = Math.max(40, width - PAD_L - PAD_R);
  const nums = values.filter((v): v is number => typeof v === "number");
  const lo = Math.min(0, ...nums);
  const hi = Math.max(0, ...nums);
  const ticks = linearTicks(lo, hi, 4);
  const y = linear(Math.min(lo, ticks[0] ?? lo), Math.max(hi, ticks[ticks.length - 1] ?? hi), bottom, top);
  const band = plotW / Math.max(1, values.length);
  const bw = Math.max(4, Math.min(56, band * 0.6));

  return (
    <div ref={ref} className="chart-box w-full rounded-md bg-surface-2" role="img" aria-label={label}>
      <svg width={width} height={bottom + 30} className="block">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={PAD_L + plotW} y1={y(t)} y2={y(t)} className={t === 0 ? "stroke-ink-4" : "stroke-chart-grid"} />
            <text x={PAD_L - 6} y={y(t) + 4} textAnchor="end" className="fill-ink-3 text-xs tabular-nums">{pct(t, 0)}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const cx = PAD_L + band * i + band / 2;
          if (typeof v !== "number") return null;
          const y0 = y(0);
          const y1 = y(v);
          return (
            <g key={i}>
              <rect x={cx - bw / 2} y={Math.min(y0, y1)} width={bw} height={Math.max(1, Math.abs(y1 - y0))} className={v >= 0 ? "fill-positive" : "fill-negative"} />
              <text x={cx} y={v >= 0 ? y1 - 4 : y1 + 12} textAnchor="middle" className="fill-ink-2 text-xs tabular-nums">{pct(v, 1)}</text>
              <text x={cx} y={bottom + 20} textAnchor="middle" className="fill-ink-3 text-xs">{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
