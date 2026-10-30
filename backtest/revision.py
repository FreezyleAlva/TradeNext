# backtest/revision.py
import json
import math
import sys
import time
from datetime import datetime
from pathlib import Path

import numpy as np

from . import config as C
from .data import hash_matches, load_market
from .data_audit import audit, clean_market, glitch_bars, trades_touching
from .engine import run_backtest
from .metrics import summarize

KEYS = ["final", "cagr", "mdd", "calmar", "sharpe", "sortino", "win_ratio", "profit_factor", "n_trades", "total_cost", "exposure_days"]


def pick(s):
    return {k: s.get(k) for k in KEYS}


def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, np.generic):
        o = o.item()
    if isinstance(o, float) and not math.isfinite(o):
        return None
    return o


def run(m, start, end, **kw):
    r = run_backtest(m, start, end, C.PARAMS, **kw)
    s, series = summarize(r, kw.get("initial", C.RUN["initial"]))
    return r, s, series


def reproduction(m, frozen):
    r, s, _ = run(m, C.BACKTEST_START, C.BACKTEST_END)
    ref = frozen["main"]
    pairs = list(zip(r.trades, ref["trades"]))
    same = sum(
        1
        for a, b in pairs
        if a["ticker"] == b["ticker"]
        and a["entry_date"] == b["entry_date"]
        and a["exit_date"] == b["exit_date"]
        and a["entry_shares"] == b["entry_shares"]
        and abs(a["net_pnl"] - b["net_pnl"]) < 0.005
    )
    checks = []
    for k in ["final", "cagr", "mdd", "sharpe", "win_ratio", "profit_factor", "n_trades", "total_cost"]:
        got, want = s.get(k), ref["summary"].get(k)
        ok = got == want or (got is not None and want is not None and abs(got - want) <= 1e-9 * max(1.0, abs(want)))
        checks.append({"metric": k, "claimed": want, "reproduced": got, "match": bool(ok)})
    _, s_is, _ = run(m, C.BACKTEST_START, C.IS_END)
    _, s_oos, _ = run(m, C.OOS_START, C.BACKTEST_END)
    for label, got, want in (
        ("cagr_in_sample", s_is["cagr"], frozen["validation"]["is_oos"]["is"]["cagr"]),
        ("cagr_out_of_sample", s_oos["cagr"], frozen["validation"]["is_oos"]["oos"]["cagr"]),
    ):
        checks.append({"metric": label, "claimed": want, "reproduced": got, "match": bool(abs(got - want) <= 1e-12)})
    return {
        "engine": "backtest/engine.py (Python 3, numpy, pandas)",
        "command": "python -m backtest verify",
        "trades_claimed": len(ref["trades"]),
        "trades_reproduced": len(r.trades),
        "trades_identical": same,
        "final_equity_diff": float(s["final"] - ref["summary"]["final"]),
        "blocked_identical": r.blocked == ref["blocked_orders"],
        "checks": checks,
        "all_match": all(c["match"] for c in checks) and same == len(ref["trades"]) and len(r.trades) == len(ref["trades"]),
    }


def integrity(universe, snapshot):
    manifest = json.loads(C.MANIFEST.read_text(encoding="utf-8"))
    files = manifest["files"]
    ok = sum(1 for t, info in files.items() if (C.RAW / f"{t}.csv").exists() and hash_matches(C.RAW / f"{t}.csv", info["sha256"]))
    out = {
        "source": manifest["source"],
        "downloaded_on": manifest["downloaded_on"],
        "files": len(files),
        "sha256_match": ok,
        "hash_note": "Hash di manifest dihitung atas file asli unduhan (akhir baris CRLF Windows). Git menormalkan CSV ke LF, jadi verifikasi menyamakan akhir baris ke CRLF sebelum menghitung SHA256; isi data tidak berubah.",
        "snapshot": None,
    }
    if snapshot and snapshot.exists():
        frozen = load_market(tickers=universe)
        fresh = load_market(raw_dir=snapshot, tickers=universe)
        i0, i1 = frozen.slice_index(C.BACKTEST_START, C.BACKTEST_END)
        fields = {}
        total = 0
        for k in ("open", "high", "low", "close", "volume"):
            a = getattr(frozen, k)[:, i0 : i1 + 1]
            b = getattr(fresh, k)[:, i0 : i1 + 1]
            both = np.isfinite(a) & np.isfinite(b)
            diff = both & (np.abs(a - b) > 1e-6 * np.maximum(1.0, np.abs(a)))
            presence = np.isfinite(a) != np.isfinite(b)
            fields[k] = int(diff.sum() + presence.sum())
            total = int(both.sum())
        _, s_fresh, _ = run(fresh, C.BACKTEST_START, C.BACKTEST_END)
        snap_manifest = json.loads((snapshot / "manifest.json").read_text(encoding="utf-8"))
        out["snapshot"] = {
            "downloaded_on": snap_manifest["downloaded_on"],
            "bars_compared": total,
            "bars_different": fields,
            "result": pick(s_fresh),
        }
    return out


def quality(m):
    a = audit(m)
    glitches = glitch_bars(m)
    events = a["events"]
    r, _, _ = run(m, C.BACKTEST_START, C.BACKTEST_END)
    touched = trades_touching(r.trades, events)
    return a, glitches, {
        "bars": a["bars"],
        "totals": a["totals"],
        "flagged_bars": a["flagged_bars"],
        "flagged_share": a["flagged_share"],
        "events": [e for e in events if e["kind"] == "beyond_ara"],
        "glitches": [{"ticker": m.tickers[j], "date": m.dates[d], "close": float(m.close[j, d])} for j, d in glitches],
        "trades_touched": [
            {"ticker": t["ticker"], "entry_date": t["entry_date"], "exit_date": t["exit_date"], "net_pnl": t["net_pnl"], "ret_pct": t["ret_pct"]}
            for t in touched
        ],
        "rules": [
            "Bar dihitung lolos batas ARA/ARB bila perubahan penutupan dari penutupan valid sebelumnya tidak melebihi batas auto rejection BEI (35% harga <= Rp200, 25% Rp200-5.000, 20% > Rp5.000) + toleransi 2 poin.",
            "Glitch = bar yang melompat melewati batas lalu bar berikutnya kembali ke dalam batas dari harga sebelum lompatan. Bar seperti ini tidak mungkin terjadi di BEI dan diperlakukan sebagai data hilang (tanpa transaksi).",
            "Lompatan yang tidak kembali (misalnya penyesuaian right issue) tidak diubah, hanya dicatat.",
        ],
    }


def scenario(label, desc, m, **kw):
    r, s, series = run(m, C.BACKTEST_START, C.BACKTEST_END, **kw)
    _, s_oos, _ = run(m, C.OOS_START, C.BACKTEST_END, **kw)
    eq = []
    last = None
    for d, v in zip(r.dates, r.equity):
        ym = d[:7]
        if ym != last:
            eq.append([d, float(v)])
            last = ym
        else:
            eq[-1] = [d, float(v)]
    return {"key": label, "label": desc["label"], "detail": desc["detail"], "summary": pick(s), "oos_cagr": s_oos["cagr"], "equity": eq}


def main(snapshot=None):
    sys.stdout.reconfigure(encoding="utf-8")
    t0 = time.time()
    frozen = json.loads(C.RESULTS.read_text(encoding="utf-8"))
    universe = frozen["meta"]["universe"]
    m = load_market(tickers=universe)
    print("reproduksi ...")
    repro = reproduction(m, frozen)
    print(f"  {repro['trades_identical']}/{repro['trades_claimed']} trade identik, semua cocok = {repro['all_match']}")
    snap = Path(snapshot) if snapshot else latest_snapshot()
    print("integritas data ...")
    integ = integrity(universe, snap)
    print("kualitas data ...")
    _a, glitches, qual = quality(m)
    mc = clean_market(m, glitches)
    old = [t for t in universe if m.first.get(t) and m.first[t] <= C.BACKTEST_START]
    m_old = m.subset(old)
    mc_old = clean_market(m_old, glitch_bars(m_old))
    print("skenario ...")
    specs = [
        ("base", {"label": "Klaim UTS", "detail": "Data Yahoo beku 18 Okt, spread 1 fraksi, eksekusi pembukaan t+1."}, m, {}),
        ("clean", {"label": "Data dibersihkan", "detail": f"{len(glitches)} bar glitch Yahoo dibuang (MAPI, TOWR Mei 2018; MINA Mar 2019)."}, mc, {}),
        ("spread2", {"label": "Spread 2 fraksi", "detail": "Beli 2 fraksi di atas, jual 2 fraksi di bawah harga pembukaan."}, mc, {"spread_ticks": 2}),
        ("spread3", {"label": "Spread 3 fraksi", "detail": "Slippage pembukaan lebih berat, setara antrian pra-pembukaan tipis."}, mc, {"spread_ticks": 3}),
        ("delay1", {"label": "Tunda 1 bar", "detail": "Order dieksekusi di pembukaan t+2."}, mc, {"delay": 1}),
        ("since2016", {"label": "Tanpa IPO baru", "detail": f"Hanya {len(old)} saham yang sudah tercatat sejak awal periode; membuang pemenang IPO pasca-2016."}, mc_old, {}),
        ("capacity", {"label": "Modal Rp10 miliar", "detail": "Modal awal 100x, batas 5% ADV20 mulai menahan ukuran order di saham kecil."}, mc, {"initial": 10_000_000_000.0}),
        ("fee2x", {"label": "Biaya 2x", "detail": "Fee beli 0,30%, fee jual 0,50%, spread 2 fraksi."}, mc, {"fee_buy": 0.003, "fee_sell": 0.005, "spread_ticks": 2}),
        (
            "conservative",
            {"label": "Konservatif gabungan", "detail": "Data bersih + tanpa IPO baru + spread 3 fraksi + biaya 2x + tunda 1 bar. Beberapa asumsi buruk dipasang sekaligus."},
            mc_old,
            {"spread_ticks": 3, "fee_buy": 0.003, "fee_sell": 0.005, "delay": 1},
        ),
    ]
    scenarios = []
    for key, desc, mm, kw in specs:
        sc = scenario(key, desc, mm, **kw)
        scenarios.append(sc)
        print(f"  {key:13s} CAGR {sc['summary']['cagr']:.4f}  MDD {sc['summary']['mdd']:.4f}  OOS {sc['oos_cagr']:.4f}")
    cagrs = [s["summary"]["cagr"] for s in scenarios]
    out = {
        "schema": "freezyle-traiding-revision/1",
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "revision_of": frozen["meta"]["generated_at"],
        "params": C.PARAMS,
        "params_changed": False,
        "reproduction": repro,
        "integrity": integ,
        "quality": qual,
        "scenarios": scenarios,
        "range": {"cagr_min": min(cagrs), "cagr_max": max(cagrs)},
        "seconds": round(time.time() - t0, 1),
    }
    C.REVISION.write_text(json.dumps(clean(out), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"selesai {out['seconds']} dtk -> {C.REVISION}")


def latest_snapshot():
    root = C.ROOT / "data" / "snapshots"
    if not root.exists():
        return None
    dirs = sorted(p for p in root.iterdir() if (p / "manifest.json").exists())
    return dirs[-1] if dirs else None


if __name__ == "__main__":
    main()
