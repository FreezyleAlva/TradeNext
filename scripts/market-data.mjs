// scripts/market-data.mjs
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const FIELDS = ["open", "high", "low", "close", "volume", "split", "div_raw", "factor"];

function readCsv(path) {
  const lines = readFileSync(path, "utf8").trim().split(/\r?\n/);
  const head = lines[0].split(",");
  const col = (name) => head.indexOf(name);
  const ci = {
    d: col("Date"), o: col("Open"), h: col("High"), l: col("Low"), c: col("Close"),
    v: col("Volume"), div: col("Dividends"), sp: col("Stock Splits"),
  };
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(",");
    rows.push({
      d: p[ci.d].slice(0, 10),
      o: Number(p[ci.o]), h: Number(p[ci.h]), l: Number(p[ci.l]), c: Number(p[ci.c]),
      v: Number(p[ci.v]), div: Number(p[ci.div] || 0), sp: Number(p[ci.sp] || 0),
    });
  }
  rows.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  return rows;
}

export function buildMarketData(root, outDir, tickers, benchmarks) {
  const raw = join(root, "data", "raw");
  const manifest = JSON.parse(readFileSync(join(root, "data", "manifest.json"), "utf8"));
  const ihsg = readCsv(join(raw, "IHSG.csv"));
  const dates = ihsg.map((r) => r.d);
  const pos = new Map(dates.map((d, i) => [d, i]));
  const n = dates.length;

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, "t"), { recursive: true });

  const bench = {};
  for (const name of Object.keys(benchmarks)) {
    const rows = readCsv(join(raw, `${name}.csv`));
    const arr = new Array(n).fill(null);
    for (const r of rows) {
      const i = pos.get(r.d);
      if (i !== undefined) arr[i] = r.c;
    }
    for (let i = 1; i < n; i++) if (arr[i] === null) arr[i] = arr[i - 1];
    bench[name] = arr;
  }

  const index = [];
  for (const t of tickers) {
    const rows = readCsv(join(raw, `${t}.csv`));
    const m = rows.length;
    const splits = rows.map((r) => (r.sp === 0 ? 1 : r.sp));
    const future = new Array(m).fill(1);
    let prod = 1;
    for (let k = m - 1; k >= 0; k--) {
      future[k] = k === m - 1 ? 1 : prod;
      prod = prod * splits[k];
    }
    const buf = new Float64Array(FIELDS.length * n).fill(NaN);
    const set = (f, i, v) => { buf[f * n + i] = v; };
    for (let f = 0; f < FIELDS.length; f++) if (FIELDS[f] === "split") for (let i = 0; i < n; i++) set(f, i, 1);
    for (let f = 0; f < FIELDS.length; f++) if (FIELDS[f] === "div_raw") for (let i = 0; i < n; i++) set(f, i, 0);
    let first = null;
    let last = null;
    for (let k = 0; k < m; k++) {
      const r = rows[k];
      const i = pos.get(r.d);
      if (i === undefined) continue;
      first ??= r.d;
      last = r.d;
      set(0, i, r.o); set(1, i, r.h); set(2, i, r.l); set(3, i, r.c); set(4, i, r.v);
      set(5, i, splits[k]); set(6, i, r.div * future[k]); set(7, i, future[k]);
    }
    const fac = 7 * n;
    let next = NaN;
    for (let i = n - 1; i >= 0; i--) { if (Number.isNaN(buf[fac + i])) buf[fac + i] = next; else next = buf[fac + i]; }
    let prev = NaN;
    for (let i = 0; i < n; i++) { if (Number.isNaN(buf[fac + i])) buf[fac + i] = prev; else prev = buf[fac + i]; }
    for (let i = 0; i < n; i++) if (Number.isNaN(buf[fac + i])) buf[fac + i] = 1;
    writeFileSync(join(outDir, "t", `${t}.bin`), Buffer.from(buf.buffer));
    index.push({ ticker: t, symbol: manifest.files[t]?.symbol ?? `${t}.JK`, first, last, rows: m, sha256: manifest.files[t]?.sha256 ?? null });
  }

  writeFileSync(
    join(outDir, "market.json"),
    JSON.stringify({ source: manifest.source, downloaded_on: manifest.downloaded_on, fields: FIELDS, n, dates, bench, tickers: index }),
  );
  return { n, tickers: index.length };
}
