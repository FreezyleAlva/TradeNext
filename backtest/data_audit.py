# backtest/data_audit.py
import numpy as np

from .config import BACKTEST_END, BACKTEST_START


def ara_limit(prev_close):
    return 0.35 if prev_close <= 200 else 0.25 if prev_close <= 5000 else 0.20


def audit(m, start=BACKTEST_START, end=BACKTEST_END):
    i0, i1 = m.slice_index(start, end)
    rows = []
    per_ticker = {}
    for j, t in enumerate(m.tickers):
        o, h, l, c, v = m.open[j], m.high[j], m.low[j], m.close[j], m.volume[j]
        rc = m.raw_close[j]
        sp = m.split[j]
        counts = dict.fromkeys(["ohlc_inconsistent", "beyond_ara", "zero_volume_move", "missing_bar", "stale_run"], 0)
        last_valid = None
        stale = 0
        for d in range(i0, i1 + 1):
            date = m.dates[d]
            if np.isnan(c[d]):
                if last_valid is not None:
                    counts["missing_bar"] += 1
                continue
            if last_valid is not None:
                prev = last_valid
                move = c[d] / c[prev] - 1
                limit = ara_limit(rc[prev])
                gap = d - prev
                if sp[d] == 1 and gap <= 5 and abs(move) > limit + 0.02:
                    counts["beyond_ara"] += 1
                    rows.append({"ticker": t, "date": date, "kind": "beyond_ara", "value": move, "limit": limit})
                if v[d] == 0 and abs(move) > 0.0:
                    counts["zero_volume_move"] += 1
                stale = stale + 1 if c[d] == c[prev] and v[d] == 0 else 0
                if stale == 5:
                    counts["stale_run"] += 1
            if not (l[d] - 1e-9 <= min(o[d], c[d]) and max(o[d], c[d]) <= h[d] + 1e-9):
                counts["ohlc_inconsistent"] += 1
                rows.append({"ticker": t, "date": date, "kind": "ohlc_inconsistent", "value": None, "limit": None})
            last_valid = d
        per_ticker[t] = counts
    totals = {k: sum(c[k] for c in per_ticker.values()) for k in next(iter(per_ticker.values()))}
    bars = int(np.isfinite(m.close[:, i0 : i1 + 1]).sum())
    flagged = sorted({(r["ticker"], r["date"]) for r in rows})
    return {
        "bars": bars,
        "totals": totals,
        "flagged_bars": len(flagged),
        "flagged_share": len(flagged) / bars if bars else 0.0,
        "per_ticker": per_ticker,
        "events": sorted(rows, key=lambda r: (r["date"], r["ticker"])),
    }


def glitch_bars(m, start=BACKTEST_START, end=BACKTEST_END):
    i0, i1 = m.slice_index(start, end)
    out = []
    for j in range(len(m.tickers)):
        c = m.close[j]
        valid = [d for d in range(max(i0 - 1, 0), i1 + 2) if d < m.n and np.isfinite(c[d])]
        if len(valid) < 3:
            continue
        ref = valid[0]
        for b, nxt in zip(valid[1:], valid[2:]):
            limit = ara_limit(m.raw_close[j, ref]) + 0.02
            jump = c[b] / c[ref] - 1
            back = c[nxt] / c[ref] - 1
            if m.split[j, b] == 1 and abs(jump) > limit and abs(back) <= limit:
                out.append((j, b))
                continue
            ref = b
    return out


def clean_market(m, bars):
    from .data import Market

    arrays = {k: getattr(m, k).copy() for k in ("open", "high", "low", "close", "volume")}
    for j, d in bars:
        for k in arrays:
            arrays[k][j, d] = np.nan
    return Market(
        dates=m.dates,
        tickers=m.tickers,
        split=m.split,
        div_raw=m.div_raw,
        factor=m.factor,
        bench=m.bench,
        first=m.first,
        **arrays,
    )


def trades_touching(trades, events):
    by_ticker = {}
    for e in events:
        by_ticker.setdefault(e["ticker"], []).append(e["date"])
    hit = []
    for t in trades:
        days = by_ticker.get(t["ticker"], [])
        if any(t["entry_date"] <= d <= t["exit_date"] or d == t["signal_date"] for d in days):
            hit.append(t)
    return hit
