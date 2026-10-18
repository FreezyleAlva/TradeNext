// src/lib/engine/num.ts
export function roundHalfEven(x: number): number {
  if (!Number.isFinite(x)) return x;
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

export function pyFloorDiv(a: number, b: number): number {
  let mod = a % b;
  let div = (a - mod) / b;
  if (mod) {
    if (b < 0 !== mod < 0) {
      mod += b;
      div -= 1;
    }
  }
  if (div) {
    let fd = Math.floor(div);
    if (div - fd > 0.5) fd += 1;
    return fd;
  }
  return 0;
}

export function rollingMean(values: ArrayLike<number>, w: number): Float64Array {
  const n = values.length;
  const out = new Float64Array(n).fill(NaN);
  let sum = 0;
  let nobs = 0;
  let neg = 0;
  let compAdd = 0;
  let compRem = 0;
  let same = 0;
  let prev = NaN;
  const add = (v: number) => {
    if (Number.isNaN(v)) return;
    nobs++;
    const y = v - compAdd;
    const t = sum + y;
    compAdd = t - sum - y;
    sum = t;
    if (v < 0 || Object.is(v, -0)) neg++;
    if (v === prev) same++;
    else same = 1;
    prev = v;
  };
  const rem = (v: number) => {
    if (Number.isNaN(v)) return;
    nobs--;
    const y = -v - compRem;
    const t = sum + y;
    compRem = t - sum - y;
    sum = t;
    if (v < 0 || Object.is(v, -0)) neg--;
  };
  for (let i = 0; i < n; i++) {
    const s = Math.max(0, i - w + 1);
    const e = i + 1;
    if (i === 0) {
      compRem = 0;
      sum = 0;
      nobs = 0;
      neg = 0;
      same = 0;
      prev = values[s] ?? NaN;
      for (let j = s; j < e; j++) add(values[j] ?? NaN);
    } else {
      const ps = Math.max(0, i - 1 - w + 1);
      for (let j = ps; j < s; j++) rem(values[j] ?? NaN);
      add(values[i] ?? NaN);
    }
    if (nobs >= w && nobs > 0) {
      let r = sum / nobs;
      if (same >= nobs) r = prev;
      else if (neg === 0 && r < 0) r = 0;
      else if (neg === nobs && r > 0) r = 0;
      out[i] = r;
    }
  }
  return out;
}

export function rollingMaxShift1(values: ArrayLike<number>, w: number): Float64Array {
  const n = values.length;
  const out = new Float64Array(n).fill(NaN);
  for (let i = w; i < n; i++) {
    let m = -Infinity;
    let ok = true;
    for (let j = i - w; j < i; j++) {
      const v = values[j] ?? NaN;
      if (Number.isNaN(v)) { ok = false; break; }
      if (v > m) m = v;
    }
    if (ok) out[i] = m;
  }
  return out;
}

export function fmax(a: number, b: number): number {
  if (Number.isNaN(a)) return b;
  if (Number.isNaN(b)) return a;
  return a > b ? a : b;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}
