// src/lib/format.ts
import type { Num } from "@/types/results";

const DASH = "-";

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: min, maximumFractionDigits: max });

const nf0 = nf(0, 0);
const nf1 = nf(1, 1);
const nf2 = nf(2, 2);

export const isNum = (v: Num | undefined): v is number => typeof v === "number" && Number.isFinite(v);

export function pct(v: Num | undefined, digits = 1, signed = false): string {
  if (!isNum(v)) return DASH;
  const scaled = v * 100;
  const z = Math.abs(scaled) < 0.5 * 10 ** -digits ? 0 : scaled;
  const s = (digits === 2 ? nf2 : digits === 0 ? nf0 : nf1).format(z);
  return `${signed && z > 0 ? "+" : ""}${s}%`;
}

export function num(v: Num | undefined, digits = 2): string {
  if (!isNum(v)) return DASH;
  return (digits === 0 ? nf0 : digits === 1 ? nf1 : digits === 2 ? nf2 : nf(digits, digits)).format(v);
}

export function int(v: Num | undefined): string {
  if (!isNum(v)) return DASH;
  return nf0.format(v);
}

export function rp(v: Num | undefined, signed = false): string {
  if (!isNum(v)) return DASH;
  const s = nf0.format(Math.abs(v));
  const sign = v < 0 ? "-" : signed && v > 0 ? "+" : "";
  return `${sign}Rp${s}`;
}

export function rpShort(v: Num | undefined): string {
  if (!isNum(v)) return DASH;
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e12) return `${sign}Rp${nf2.format(a / 1e12)} T`;
  if (a >= 1e9) return `${sign}Rp${nf2.format(a / 1e9)} M`;
  if (a >= 1e6) return `${sign}Rp${nf1.format(a / 1e6)} jt`;
  return `${sign}Rp${nf0.format(a)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function date(v: string | null | undefined): string {
  if (!v) return DASH;
  const [y, m, d] = v.slice(0, 10).split("-");
  const mi = Number(m) - 1;
  if (!y || !d || !(mi >= 0 && mi < 12)) return v;
  return `${Number(d)} ${MONTHS[mi]} ${y}`;
}

export type Tone = "positive" | "negative" | "neutral";

export function tone(v: Num | undefined): Tone {
  if (!isNum(v) || Math.abs(v) < 5e-4) return "neutral";
  return v > 0 ? "positive" : "negative";
}
