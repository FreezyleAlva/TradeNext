// src/components/terminal/CandleChart.tsx
"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useWidth } from "@/components/charts/useWidth";
import { linearTicks, logTicks } from "@/lib/chart";
import { date, int, num, pct } from "@/lib/format";
import type { Bars } from "@/lib/terminal/indicators";

export type TokenColor = "chart-strategy" | "chart-benchmark-1" | "chart-benchmark-2" | "warning" | "cyan-3" | "blue-3" | "negative";

export interface OverlayLine {
  name: string;
  values: number[];
  color: TokenColor;
  dashed?: boolean;
}

export interface ChartMark {
  bar: number;
  kind: "buy" | "sell";
  price: number;
  tone: "positive" | "negative" | "neutral";
  text: string;
}

const AXIS_R = 72;
const AXIS_B = 24;
const PAD_T = 8;

const swatch: Record<TokenColor, string> = {
  "chart-strategy": "bg-chart-strategy",
  "chart-benchmark-1": "bg-chart-benchmark-1",
  "chart-benchmark-2": "bg-chart-benchmark-2",
  warning: "bg-warning",
  "cyan-3": "bg-cyan-3",
  "blue-3": "bg-blue-3",
  negative: "bg-negative",
};

type Palette = Record<string, string>;

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const names = ["surface-1", "surface-2", "surface-3", "surface-4", "ink-1", "ink-2", "ink-3", "ink-4", "positive", "negative", "warning", "chart-grid", "chart-strategy", "chart-benchmark-1", "chart-benchmark-2", "cyan-3", "blue-3", "blue-1", "cyan-1"];
  const p: Palette = {};
  for (const n of names) p[n] = cs.getPropertyValue(`--color-${n}`).trim();
  return p;
}

function priceFmt(v: number): string {
  if (Math.abs(v) >= 1000) return num(v, 0);
  if (Math.abs(v) >= 10) return num(v, 1);
  return num(v, 2);
}

export function CandleChart({
  title,
  bars,
  limit,
  overlays = [],
  marks = [],
  log = false,
  height = 460,
  showVolume = true,
  focus,
}: {
  title: string;
  bars: Bars;
  limit: number;
  overlays?: OverlayLine[];
  marks?: ChartMark[];
  log?: boolean;
  height?: number;
  showVolume?: boolean;
  focus?: { bar: number; nonce: number } | null;
}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef<Palette | null>(null);
  const total = bars.dates.length;
  const lastIdx = Math.min(limit, total - 1);
  const [view, setView] = useState({ end: lastIdx + 3, count: Math.min(260, Math.max(20, total)) });
  const [cross, setCross] = useState<{ bar: number; y: number } | null>(null);
  const drag = useRef<{ x: number; end: number } | null>(null);
  const follow = useRef(true);
  const prevLimit = useRef(lastIdx);
  const prevTotal = useRef(total);

  useEffect(() => {
    if (prevTotal.current !== total) {
      prevTotal.current = total;
      prevLimit.current = lastIdx;
      follow.current = true;
      setView({ end: lastIdx + 3, count: Math.min(260, Math.max(20, total)) });
      return;
    }
    if (prevLimit.current !== lastIdx) {
      const delta = lastIdx - prevLimit.current;
      prevLimit.current = lastIdx;
      if (follow.current) setView((v) => ({ ...v, end: v.end + delta }));
    }
  }, [lastIdx, total]);

  useEffect(() => {
    if (!focus) return;
    follow.current = false;
    setView((v) => ({ ...v, end: Math.min(lastIdx + 3, focus.bar + v.count * 0.6) }));
  }, [focus, lastIdx]);

  const plotW = Math.max(60, width - AXIS_R);
  const volH = showVolume ? Math.round(height * 0.18) : 0;
  const priceH = height - AXIS_B - volH - PAD_T - (showVolume ? 8 : 0);
  const barW = plotW / view.count;
  const startF = view.end - view.count;
  const xOf = (i: number) => (i - startF) * barW - barW / 2;

  const viewRef = useRef(view);
  viewRef.current = view;
  const metaRef = useRef({ barW, lastIdx, total });
  metaRef.current = { barW, lastIdx, total };

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const v = viewRef.current;
      const { barW: bw, total: tot } = metaRef.current;
      const anchor = v.end - v.count + (e.clientX - r.left) / bw;
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      const count = Math.min(Math.max(15, v.count * factor), Math.max(30, tot + 20));
      const ratio = (anchor - (v.end - v.count)) / v.count;
      const end = anchor + (1 - ratio) * count;
      setView({ end, count });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    paletteRef.current ??= readPalette();
    const P = paletteRef.current;
    const dpr = window.devicePixelRatio || 1;
    el.width = Math.round(width * dpr);
    el.height = Math.round(height * dpr);
    const g = el.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, height);
    g.fillStyle = P["surface-2"]!;
    g.fillRect(0, 0, width, height);

    const i0 = Math.max(0, Math.floor(startF));
    const i1 = Math.min(lastIdx, Math.ceil(view.end));
    if (i1 < i0) return;

    let lo = Infinity;
    let hi = -Infinity;
    let vmax = 0;
    for (let i = i0; i <= i1; i++) {
      lo = Math.min(lo, bars.l[i]!);
      hi = Math.max(hi, bars.h[i]!);
      vmax = Math.max(vmax, bars.v[i]!);
      for (const o of overlays) {
        const v = o.values[i]!;
        if (Number.isFinite(v) && v > 0) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      }
    }
    if (!Number.isFinite(lo)) return;
    const span = hi - lo || hi * 0.05 || 1;
    const top = log ? Math.log(hi * 1.03) : hi + span * 0.06;
    const bot = log ? Math.log(Math.max(lo * 0.97, 1e-9)) : lo - span * 0.06;
    const yOf = (v: number) => PAD_T + ((top - (log ? Math.log(v) : v)) / (top - bot)) * priceH;
    const volTop = PAD_T + priceH + 8;
    const vy = (v: number) => volTop + volH - (vmax ? (v / vmax) * volH : 0);

    g.font = "12px " + getComputedStyle(document.body).fontFamily;
    g.textBaseline = "middle";
    const ticks = log ? logTicks(Math.exp(bot), Math.exp(top)) : linearTicks(bot, top, Math.max(3, Math.floor(priceH / 60)));
    g.strokeStyle = P["chart-grid"]!;
    g.lineWidth = 1;
    g.fillStyle = P["ink-3"]!;
    g.textAlign = "left";
    for (const t of ticks) {
      const y = Math.round(yOf(t)) + 0.5;
      if (y < PAD_T || y > PAD_T + priceH) continue;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(plotW, y);
      g.stroke();
      g.fillText(priceFmt(t), plotW + 8, y);
    }

    let lastLabel = "";
    let lastX = -Infinity;
    g.textAlign = "center";
    const monthsVisible = (i1 - i0) / 21;
    for (let i = i0; i <= i1; i++) {
      const d = bars.dates[i]!;
      const key = monthsVisible > 30 ? d.slice(0, 4) : d.slice(0, 7);
      if (key === lastLabel) continue;
      lastLabel = key;
      const x = xOf(i);
      if (x - lastX < 64 || x < 0) continue;
      lastX = x;
      g.strokeStyle = P["chart-grid"]!;
      g.beginPath();
      g.moveTo(Math.round(x) + 0.5, PAD_T);
      g.lineTo(Math.round(x) + 0.5, height - AXIS_B);
      g.stroke();
      g.fillStyle = P["ink-3"]!;
      const label = monthsVisible > 30 ? key : `${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][Number(d.slice(5, 7)) - 1]} ${d.slice(2, 4)}`;
      g.fillText(label, x, height - AXIS_B / 2);
    }

    g.save();
    g.beginPath();
    g.rect(0, 0, plotW, height - AXIS_B);
    g.clip();

    const bodyW = Math.max(1, Math.min(14, barW * 0.7));
    for (let i = i0; i <= i1; i++) {
      const x = xOf(i);
      const up = bars.c[i]! >= bars.o[i]!;
      const col = up ? P.positive! : P.negative!;
      g.strokeStyle = col;
      g.fillStyle = col;
      const yh = yOf(bars.h[i]!);
      const yl = yOf(bars.l[i]!);
      g.beginPath();
      g.moveTo(Math.round(x) + 0.5, yh);
      g.lineTo(Math.round(x) + 0.5, yl);
      g.stroke();
      const yo = yOf(bars.o[i]!);
      const yc = yOf(bars.c[i]!);
      g.fillRect(x - bodyW / 2, Math.min(yo, yc), bodyW, Math.max(1, Math.abs(yc - yo)));
      if (showVolume) {
        g.fillStyle = up ? P["cyan-1"]! : P["surface-4"]!;
        const y = vy(bars.v[i]!);
        g.fillRect(x - bodyW / 2, y, bodyW, volTop + volH - y);
      }
    }

    for (const o of overlays) {
      g.strokeStyle = P[o.color]!;
      g.lineWidth = 1.5;
      g.setLineDash(o.dashed ? [5, 4] : []);
      g.beginPath();
      let pen = false;
      for (let i = i0; i <= i1; i++) {
        const v = o.values[i]!;
        if (!Number.isFinite(v) || v <= 0) { pen = false; continue; }
        const x = xOf(i);
        const y = yOf(v);
        if (pen) g.lineTo(x, y); else { g.moveTo(x, y); pen = true; }
      }
      g.stroke();
    }
    g.setLineDash([]);

    for (const mk of marks) {
      if (mk.bar < i0 || mk.bar > i1) continue;
      const x = xOf(mk.bar);
      const col = mk.kind === "buy" ? P["cyan-3"]! : mk.tone === "negative" ? P.negative! : mk.tone === "positive" ? P.positive! : P["ink-1"]!;
      g.fillStyle = col;
      const s = 6;
      if (mk.kind === "buy") {
        const y = yOf(bars.l[mk.bar]!) + 10;
        g.beginPath();
        g.moveTo(x, y - s);
        g.lineTo(x - s, y + s);
        g.lineTo(x + s, y + s);
        g.closePath();
        g.fill();
        g.fillText(mk.text, x, y + s + 9);
      } else {
        const y = yOf(bars.h[mk.bar]!) - 10;
        g.beginPath();
        g.moveTo(x, y + s);
        g.lineTo(x - s, y - s);
        g.lineTo(x + s, y - s);
        g.closePath();
        g.fill();
        g.fillText(mk.text, x, y - s - 9);
      }
      g.strokeStyle = P["ink-4"]!;
      g.setLineDash([2, 3]);
      g.beginPath();
      const yp = yOf(mk.price);
      g.moveTo(x - 8, yp);
      g.lineTo(x + 8, yp);
      g.stroke();
      g.setLineDash([]);
    }
    g.restore();

    const lc = bars.c[lastIdx]!;
    const lup = lc >= bars.o[lastIdx]!;
    const ly = yOf(lc);
    if (ly >= PAD_T && ly <= PAD_T + priceH) {
      g.fillStyle = lup ? P.positive! : P.negative!;
      g.fillRect(plotW + 2, ly - 9, AXIS_R - 4, 18);
      g.fillStyle = P["surface-1"]!;
      g.textAlign = "left";
      g.fillText(priceFmt(lc), plotW + 8, ly);
    }

    if (cross && cross.bar >= i0 && cross.bar <= i1) {
      const x = Math.round(xOf(cross.bar)) + 0.5;
      g.strokeStyle = P["ink-3"]!;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(x, PAD_T);
      g.lineTo(x, height - AXIS_B);
      if (cross.y >= PAD_T && cross.y <= PAD_T + priceH) {
        g.moveTo(0, cross.y + 0.5);
        g.lineTo(plotW, cross.y + 0.5);
      }
      g.stroke();
      g.setLineDash([]);
      if (cross.y >= PAD_T && cross.y <= PAD_T + priceH) {
        const pv = log ? Math.exp(top - ((cross.y - PAD_T) / priceH) * (top - bot)) : top - ((cross.y - PAD_T) / priceH) * (top - bot);
        g.fillStyle = P["surface-4"]!;
        g.fillRect(plotW + 2, cross.y - 9, AXIS_R - 4, 18);
        g.fillStyle = P["ink-1"]!;
        g.textAlign = "left";
        g.fillText(priceFmt(pv), plotW + 8, cross.y);
      }
      const dl = date(bars.dates[cross.bar]);
      const tw = g.measureText(dl).width + 16;
      g.fillStyle = P["surface-4"]!;
      g.fillRect(Math.min(Math.max(0, x - tw / 2), plotW - tw), height - AXIS_B + 2, tw, AXIS_B - 4);
      g.fillStyle = P["ink-1"]!;
      g.textAlign = "center";
      g.fillText(dl, Math.min(Math.max(tw / 2, x), plotW - tw / 2), height - AXIS_B / 2);
    }
  }, [bars, overlays, marks, log, width, height, view, cross, lastIdx, startF, barW, plotW, priceH, volH, showVolume, xOf]);

  function barAt(clientX: number, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    return Math.round(startF + (clientX - r.left + barW / 2) / barW);
  }

  function onDown(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, end: view.end };
  }

  function onMove(e: PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    if (drag.current) {
      const end = drag.current.end - (e.clientX - drag.current.x) / barW;
      follow.current = end >= lastIdx + 0.5;
      setView((v) => ({ ...v, end }));
    }
    const b = barAt(e.clientX, e.currentTarget);
    setCross({ bar: Math.min(lastIdx, Math.max(0, b)), y: e.clientY - r.top });
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 20 : 1;
    if (e.key === "ArrowLeft") { follow.current = false; setView((v) => ({ ...v, end: v.end - step })); }
    else if (e.key === "ArrowRight") setView((v) => { const end = v.end + step; follow.current = end >= lastIdx + 0.5; return { ...v, end }; });
    else if (e.key === "+" || e.key === "=") setView((v) => ({ ...v, count: Math.max(15, v.count / 1.25) }));
    else if (e.key === "-") setView((v) => ({ ...v, count: Math.min(total + 20, v.count * 1.25) }));
    else if (e.key === "End") { follow.current = true; setView((v) => ({ ...v, end: lastIdx + 3 })); }
    else if (e.key === "Home") { follow.current = false; setView((v) => ({ ...v, end: v.count })); }
    else return;
    e.preventDefault();
  }

  const hb = cross?.bar ?? lastIdx;
  const prevC = hb > 0 ? bars.c[hb - 1]! : NaN;
  const chg = bars.c[hb]! / prevC - 1;

  return (
    <div className="flex flex-col gap-s2">
      <div
        ref={wrapRef}
        className="chart-box relative w-full rounded-md"
        tabIndex={0}
        role="img"
        aria-label={`${title}. Seret untuk geser, roda mouse untuk zoom, panah kiri kanan untuk geser, plus minus untuk zoom, End untuk bar terakhir.`}
        onKeyDown={onKey}
      >
        <canvas
          ref={canvasRef}
          className="block touch-none"
          style={{ width: `${width}px`, height: `${height}px` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => { drag.current = null; }}
          onPointerLeave={() => { drag.current = null; setCross(null); }}
          onDoubleClick={() => { follow.current = true; setView({ end: lastIdx + 3, count: Math.min(260, Math.max(20, total)) }); }}
        />
        {total > 0 ? (
          <div className="pointer-events-none absolute left-s2 top-s2 flex flex-col gap-s1 rounded-sm bg-surface-2 px-s2 py-s1 text-xs">
            <div className="flex flex-wrap gap-x-s3 font-mono tabular-nums text-ink-2">
              <span className="text-ink-1">{title}</span>
              <span>{date(bars.dates[hb])}</span>
              <span>O <span className="text-ink-1">{priceFmt(bars.o[hb]!)}</span></span>
              <span>H <span className="text-ink-1">{priceFmt(bars.h[hb]!)}</span></span>
              <span>L <span className="text-ink-1">{priceFmt(bars.l[hb]!)}</span></span>
              <span>C <span className="text-ink-1">{priceFmt(bars.c[hb]!)}</span></span>
              <span className={chg > 0 ? "text-positive" : chg < 0 ? "text-negative" : "text-ink-2"}>{pct(Number.isFinite(chg) ? chg : null, 2, true)}</span>
              <span>Vol <span className="text-ink-1">{int(bars.v[hb])}</span></span>
            </div>
            {overlays.length ? (
              <div className="flex flex-wrap gap-x-s3 font-mono tabular-nums text-ink-2">
                {overlays.map((o) => (
                  <span key={o.name} className="flex items-center gap-s1">
                    <span className={`legend-swatch ${swatch[o.color]}`} aria-hidden="true" />
                    {o.name} <span className="text-ink-1">{Number.isFinite(o.values[hb]!) ? priceFmt(o.values[hb]!) : "-"}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
