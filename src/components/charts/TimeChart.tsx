// src/components/charts/TimeChart.tsx
"use client";
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { linear, linearTicks, logTicks, pathOf } from "@/lib/chart";
import { date, pct, rp, rpShort } from "@/lib/format";
import { useWidth } from "./useWidth";

export type SeriesColor = "strategy" | "benchmark-1" | "benchmark-2" | "warning";

export interface Series {
  name: string;
  values: number[];
  color: SeriesColor;
  dashed?: boolean;
}

const strokeCls: Record<SeriesColor, string> = {
  strategy: "stroke-chart-strategy",
  "benchmark-1": "stroke-chart-benchmark-1",
  "benchmark-2": "stroke-chart-benchmark-2",
  warning: "stroke-warning",
};

const swatchCls: Record<SeriesColor, string> = {
  strategy: "bg-chart-strategy",
  "benchmark-1": "bg-chart-benchmark-1",
  "benchmark-2": "bg-chart-benchmark-2",
  warning: "bg-warning",
};

const PAD_L = 78;
const PAD_R = 12;

export function TimeChart({
  label,
  dates,
  series,
  log = false,
  drawdown,
  height = 300,
  valueKind = "rp",
}: {
  label: string;
  dates: string[];
  series: Series[];
  log?: boolean;
  drawdown?: Series[];
  height?: number;
  valueKind?: "rp" | "pct";
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [idx, setIdx] = useState<number | null>(null);
  const n = dates.length;
  const ddH = drawdown ? Math.round(height * 0.38) : 0;
  const gap = drawdown ? 28 : 0;
  const top = 10;
  const mainBottom = top + height;
  const ddTop = mainBottom + gap;
  const totalH = ddTop + ddH + 26;
  const plotW = Math.max(40, width - PAD_L - PAD_R);

  const geo = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const s of series) for (const v of s.values) {
      if (!Number.isFinite(v) || (log && v <= 0)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!Number.isFinite(min)) { min = 0; max = 1; }
    const x = linear(0, Math.max(1, n - 1), PAD_L, PAD_L + plotW);
    const xs = dates.map((_, i) => x(i));
    let y: (v: number) => number;
    let ticks: number[];
    if (log) {
      const lmin = Math.log10(min * 0.95);
      const lmax = Math.log10(max * 1.05);
      const ly = linear(lmin, lmax, mainBottom, top);
      y = (v) => ly(Math.log10(v));
      ticks = logTicks(min * 0.95, max * 1.05);
    } else {
      const pad = (max - min) * 0.05 || 1;
      y = linear(min - pad, max + pad, mainBottom, top);
      ticks = linearTicks(min - pad, max + pad, 5);
    }
    const paths = series.map((s) => pathOf(xs, s.values.map((v) => (log && v <= 0 ? NaN : y(v)))));
    let ddMin = 0;
    for (const s of drawdown ?? []) for (const v of s.values) if (v < ddMin) ddMin = v;
    const yd = linear(Math.min(-0.05, ddMin * 1.05), 0, ddTop + ddH, ddTop);
    const ddTicks = linearTicks(Math.min(-0.05, ddMin * 1.05), 0, 3);
    const ddPaths = (drawdown ?? []).map((s) => pathOf(xs, s.values.map(yd)));
    const ddArea = drawdown?.[0]
      ? `${pathOf(xs, drawdown[0].values.map(yd))}L${(xs[n - 1] ?? 0).toFixed(1)},${ddTop}L${PAD_L},${ddTop}Z`
      : "";
    const years: { i: number; label: string }[] = [];
    let last = "";
    dates.forEach((d, i) => {
      const yr = d.slice(0, 4);
      if (yr !== last) { years.push({ i, label: yr }); last = yr; }
    });
    const minGap = 44;
    const yearTicks: { i: number; label: string }[] = [];
    for (const yr of years) {
      const prev = yearTicks[yearTicks.length - 1];
      if (prev && (xs[yr.i] ?? 0) - (xs[prev.i] ?? 0) < minGap) {
        if (yearTicks.length === 1 && prev.i === 0) yearTicks[0] = yr;
        continue;
      }
      yearTicks.push(yr);
    }
    return { xs, y, ticks, paths, yd, ddTicks, ddPaths, ddArea, years: yearTicks };
  }, [series, drawdown, dates, n, log, plotW, mainBottom, ddTop, ddH]);

  const fmt = (v: number) => (valueKind === "pct" ? pct(v) : rpShort(v));

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round(((px - PAD_L) / plotW) * (n - 1));
    setIdx(Math.min(n - 1, Math.max(0, i)));
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 20 : 1;
    const cur = idx ?? n - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = Math.min(n - 1, cur + step);
    else if (e.key === "ArrowLeft") next = Math.max(0, cur - step);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === "Escape") { setIdx(null); return; }
    if (next !== null) { e.preventDefault(); setIdx(next); }
  }

  const hx = idx !== null ? geo.xs[idx] ?? 0 : 0;
  const tipLeft = idx !== null && hx > width / 2;

  return (
    <div className="flex flex-col gap-s2">
      <ul className="flex flex-wrap gap-x-s4 gap-y-s1 text-xs text-ink-2">
        {series.map((s) => (
          <li key={s.name} className="flex items-center gap-s2">
            <span className={`legend-swatch ${swatchCls[s.color]}`} aria-hidden="true" />
            {s.name}
          </li>
        ))}
        {drawdown?.map((s) => (
          <li key={`dd-${s.name}`} className="flex items-center gap-s2">
            <span className={`legend-swatch ${s.color === "strategy" ? "bg-chart-drawdown-fill" : swatchCls[s.color]}`} aria-hidden="true" />
            {s.name}
          </li>
        ))}
      </ul>
      <div
        ref={ref}
        className="chart-box relative w-full rounded-md bg-surface-2"
        tabIndex={0}
        role="img"
        aria-label={`${label}. Gunakan panah kiri dan kanan untuk membaca nilai per tanggal.`}
        onKeyDown={onKey}
        onBlur={() => setIdx(null)}
      >
        <svg width={width} height={totalH} className="block" onPointerMove={onMove} onPointerLeave={() => setIdx(null)}>
          {geo.ticks.map((t) => (
            <g key={`t${t}`}>
              <line x1={PAD_L} x2={PAD_L + plotW} y1={geo.y(t)} y2={geo.y(t)} className="stroke-chart-grid" />
              <text x={PAD_L - 8} y={geo.y(t) + 4} textAnchor="end" className="fill-ink-3 text-xs tabular-nums">{fmt(t)}</text>
            </g>
          ))}
          {geo.years.map((yr) => (
            <text key={yr.label} x={geo.xs[yr.i]} y={totalH - 8} textAnchor="middle" className="fill-ink-3 text-xs tabular-nums">{yr.label}</text>
          ))}
          {series.map((s, k) => (
            <path key={s.name} d={geo.paths[k]} fill="none" strokeWidth={s.color === "strategy" ? 1.75 : 1.25} strokeDasharray={s.dashed ? "4 3" : undefined} className={strokeCls[s.color]} />
          ))}
          {drawdown ? (
            <g>
              {geo.ddTicks.map((t) => (
                <g key={`d${t}`}>
                  <line x1={PAD_L} x2={PAD_L + plotW} y1={geo.yd(t)} y2={geo.yd(t)} className="stroke-chart-grid" />
                  <text x={PAD_L - 8} y={geo.yd(t) + 4} textAnchor="end" className="fill-ink-3 text-xs tabular-nums">{pct(t, 0)}</text>
                </g>
              ))}
              <path d={geo.ddArea} className="fill-chart-drawdown-fill" fillOpacity={0.35} />
              {drawdown.map((s, k) => (
                <path key={s.name} d={geo.ddPaths[k]} fill="none" strokeWidth={1.25} className={s.color === "strategy" ? "stroke-chart-drawdown-fill" : strokeCls[s.color]} />
              ))}
              <text x={PAD_L} y={ddTop - 8} className="fill-ink-3 text-xs">Drawdown</text>
            </g>
          ) : null}
          {idx !== null ? (
            <g>
              <line x1={hx} x2={hx} y1={top} y2={drawdown ? ddTop + ddH : mainBottom} className="stroke-ink-3" />
              {series.map((s) => {
                const v = s.values[idx];
                if (v === undefined || !Number.isFinite(v) || (log && v <= 0)) return null;
                return <circle key={s.name} cx={hx} cy={geo.y(v)} r={3} className={`fill-surface-0 ${strokeCls[s.color]}`} strokeWidth={1.5} />;
              })}
            </g>
          ) : null}
        </svg>
        {idx !== null ? (
          <div className={`tooltip pointer-events-none absolute top-s2 flex flex-col gap-s1 rounded-md bg-surface-4 p-s2 text-xs ${tipLeft ? "tooltip-left" : "tooltip-right"}`} style={{ ["--tx" as string]: `${hx}px` }}>
            <div className="text-ink-2">{date(dates[idx])}</div>
            {series.map((s) => (
              <div key={s.name} className="flex justify-between gap-s3">
                <span className="text-ink-3">{s.name}</span>
                <span className="font-mono tabular-nums text-ink-1">{valueKind === "pct" ? pct(s.values[idx]) : rp(s.values[idx])}</span>
              </div>
            ))}
            {drawdown?.map((s) => (
              <div key={`dd${s.name}`} className="flex justify-between gap-s3">
                <span className="text-ink-3">{s.name}</span>
                <span className="font-mono tabular-nums text-negative">{pct(s.values[idx])}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
