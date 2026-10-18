// src/lib/chart.ts
export function linear(d0: number, d1: number, r0: number, r1: number) {
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

export function niceStep(span: number, target: number): number {
  const raw = span / Math.max(1, target);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * mag;
}

export function linearTicks(min: number, max: number, target = 5): number[] {
  const step = niceStep(max - min, target);
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

export function logTicks(min: number, max: number): number[] {
  const mults = [1, 1.5, 2, 3, 5, 7];
  const out: number[] = [];
  for (let k = Math.floor(Math.log10(min)); k <= Math.ceil(Math.log10(max)); k++) {
    for (const m of mults) {
      const v = m * 10 ** k;
      if (v >= min && v <= max) out.push(v);
    }
  }
  if (out.length <= 8) return out;
  const step = Math.ceil(out.length / 7);
  return out.filter((_, i) => i % step === 0);
}

export function pathOf(xs: number[], ys: number[]): string {
  let p = "";
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];
    if (x === undefined || y === undefined || !Number.isFinite(y)) continue;
    p += `${p ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return p;
}
