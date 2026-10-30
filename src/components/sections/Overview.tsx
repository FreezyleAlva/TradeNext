// src/components/sections/Overview.tsx
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { date, int, isNum, num, pct, rp, rpShort, tone } from "@/lib/format";
import type { Results } from "@/types/results";
import type { Revision } from "@/types/revision";

const W = 600;
const H = 120;

function sparkPath(values: number[], log: boolean) {
  const v = values.filter((x) => Number.isFinite(x) && (!log || x > 0));
  const f = (x: number) => (log ? Math.log(x) : x);
  const lo = Math.min(...v.map(f));
  const hi = Math.max(...v.map(f));
  const n = values.length;
  const step = Math.max(1, Math.floor(n / W));
  let d = "";
  for (let i = 0; i < n; i += step) {
    const x = values[i]!;
    if (!Number.isFinite(x)) continue;
    const px = (i / Math.max(1, n - 1)) * W;
    const py = H - 10 - ((f(x) - lo) / (hi - lo || 1)) * (H - 20);
    d += `${d ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`;
  }
  return d;
}

function Spark({ values, log = false, cls, label }: { values: number[]; log?: boolean; cls: string; label: string }) {
  const d = sparkPath(values, log);
  return (
    <svg className={`spark ${cls}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <path d={`${d}L${W} ${H}L0 ${H}Z`} className="spark-fill" />
      <path d={d} className="spark-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Pill({ t, children }: { t?: "pos" | "neg" | "warn" | "acc"; children: ReactNode }) {
  return <span className={`pill ${t ?? ""}`}>{children}</span>;
}

const pt = (v: number | null | undefined) => {
  const t = tone(v ?? null);
  return t === "positive" ? "pos" : t === "negative" ? "neg" : undefined;
};

function Tile({ icon, strat, kicker, name, label, value, pills, children }: { icon: IconName; strat?: boolean; kicker: string; name: string; label: ReactNode; value: ReactNode; pills: ReactNode; children: ReactNode }) {
  return (
    <div className="tile">
      <div className="tile-head">
        <span className={`tile-mark ${strat ? "is-strat" : ""}`}>
          <Icon name={icon} className="size-s5" />
        </span>
        <div className="tile-name">
          <small>{kicker}</small>
          <b>{name}</b>
        </div>
      </div>
      <div className="tile-body">
        <span className={`tile-rule ${strat ? "is-strat" : ""}`} />
        <div className="min-w-0 flex-1">
          <div className="tile-label">{label}</div>
          <div className="tile-value">{value}</div>
          <div className="pills">{pills}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function Strip({ r, rev }: { r: Results; rev: Revision }) {
  const s = r.main.summary;
  const B = r.main.benchmarks;
  const oos = r.validation.is_oos.oos.cagr;
  const items: [string, string, string?][] = [
    ["CAGR", pct(s.cagr), pt(s.cagr)],
    ["Max DD", pct(s.mdd), "neg"],
    ["Sharpe", num(s.sharpe)],
    ["Profit factor", num(s.profit_factor)],
    ["Win ratio", pct(s.win_ratio)],
    ["CAGR OOS", pct(oos), pt(oos)],
    ["IHSG", pct(B.IHSG?.cagr), pt(B.IHSG?.cagr)],
    ["LQ45", pct(B.LQ45?.cagr), pt(B.LQ45?.cagr)],
    ["Trade", int(s.n_trades)],
    ["Reproduksi", rev.reproduction.all_match ? `${rev.reproduction.trades_identical}/${rev.reproduction.trades_claimed} identik` : "tidak cocok", rev.reproduction.all_match ? "pos" : "neg"],
  ];
  return (
    <div className="strip" aria-label="Ringkasan angka">
      {items.map(([k, v, c]) => (
        <div key={k}>
          <span className="k">{k}</span>
          <span className={`v ${c ?? ""}`}>{v}</span>
        </div>
      ))}
    </div>
  );
}

export function Overview({ r, rev }: { r: Results; rev: Revision }) {
  const s = r.main.summary;
  const eq = r.main.equity;
  const ihsg = r.main.benchmarks.IHSG;
  const oos = r.validation.is_oos.oos.cagr;
  const cons = rev.scenarios.find((x) => x.key === "conservative") ?? rev.scenarios[0]!;
  return (
    <section id="ikhtisar" aria-labelledby="ikhtisar-h" className="section">
      <div className="hero">
        <span className="eyebrow">
          <span className="dot" aria-hidden="true" />
          Data terakhir: <b>{date(r.meta.data_last_date)}</b> &middot; revisi {date(rev.generated_at)}
        </span>
        <h1 id="ikhtisar-h">
          {r.meta.strategy_name} <span>pada saham KOMPAS100</span>
        </h1>
        <p>{r.rules.summary}</p>
      </div>
      <div className="tiles">
        <Tile
          icon="equity"
          strat
          kicker="STRATEGI / IDR"
          name="Ekuitas akhir"
          label={`${rpShort(s.initial)} pada ${date(s.start)} menjadi`}
          value={rp(s.final)}
          pills={
            <>
              <Pill t={pt(s.cagr)}>CAGR {pct(s.cagr, 2, true)}</Pill>
              <Pill t="neg">MDD {pct(s.mdd)}</Pill>
              <Pill t="acc">OOS {pct(oos, 1, true)}</Pill>
            </>
          }
        >
          <Spark values={eq.map((p) => p.equity)} log cls="is-strat" label="Ekuitas strategi" />
        </Tile>
        <Tile
          icon="benchmark"
          kicker="^JKSE / INDEKS"
          name="IHSG buy and hold"
          label="Nilai indeks akhir"
          value={num(ihsg?.end_value, 0)}
          pills={
            <>
              <Pill t={pt(ihsg?.cagr)}>CAGR {pct(ihsg?.cagr, 2, true)}</Pill>
              <Pill t="neg">MDD {pct(ihsg?.mdd)}</Pill>
            </>
          }
        >
          <Spark values={eq.map((p) => p.ihsg)} cls="is-bench" label="IHSG" />
        </Tile>
        <Tile
          icon="validation"
          kicker="REVISI / UJI DATA"
          name={`Rentang CAGR ${rev.scenarios.length} skenario`}
          label="Terendah sampai tertinggi"
          value={`${pct(rev.range.cagr_min)} - ${pct(rev.range.cagr_max)}`}
          pills={
            <>
              <Pill t={rev.reproduction.all_match ? "pos" : "neg"}>
                <Icon name={rev.reproduction.all_match ? "check" : "cross"} className="size-s3" />
                Reproduksi {rev.reproduction.trades_identical}/{rev.reproduction.trades_claimed}
              </Pill>
              <Pill>{rev.quality.glitches.length} glitch data</Pill>
            </>
          }
        >
          <Spark values={cons.equity.map((p) => p[1]).filter(isNum)} log cls="is-rev" label="Ekuitas skenario konservatif" />
        </Tile>
      </div>
    </section>
  );
}
