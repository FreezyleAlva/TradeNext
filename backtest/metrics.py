# backtest/metrics.py
import math

import numpy as np

from .config import RF_ANNUAL
from .engine import days_between


def _mean(a):
    return sum(a) / len(a) if a else math.nan


def _fin(v):
    return v if v is not None and math.isfinite(v) else None


def cagr(start_v, end_v, start_d, end_d):
    years = days_between(start_d, end_d) / 365.25
    if years <= 0 or start_v <= 0 or end_v <= 0:
        return math.nan
    return (end_v / start_v) ** (1 / years) - 1


def last_per_period(dates, eq, length):
    out = []
    for i, d in enumerate(dates):
        key = d[:length]
        if out and out[-1][0] == key:
            out[-1] = (key, float(eq[i]), i)
        else:
            out.append((key, float(eq[i]), i))
    return out


def trade_stats(trades, years):
    n = len(trades)
    if not n:
        return {}
    wins = [t for t in trades if t["net_pnl"] > 0]
    losses = [t for t in trades if t["net_pnl"] <= 0]
    win_ratio = len(wins) / n
    avg_win = _mean([t["ret_pct"] for t in wins]) if wins else 0.0
    avg_loss = _mean([t["ret_pct"] for t in losses]) if losses else 0.0
    gross_win = sum(t["net_pnl"] for t in wins)
    gross_loss = abs(sum(t["net_pnl"] for t in losses))
    fee = sum(t["fee_buy"] + t["fee_sell"] for t in trades)
    spread = sum(t["spread_cost"] for t in trades)
    gross = sum(t["gross_pnl"] for t in trades)
    net = sum(t["net_pnl"] for t in trades)
    return {
        "win_ratio": win_ratio,
        "avg_win_pct": avg_win,
        "avg_loss_pct": avg_loss,
        "avg_win_rp": _mean([t["net_pnl"] for t in wins]) if wins else 0.0,
        "avg_loss_rp": _mean([t["net_pnl"] for t in losses]) if losses else 0.0,
        "profit_factor": gross_win / gross_loss if gross_loss > 0 else None,
        "expectancy_pct": win_ratio * avg_win + (1 - win_ratio) * avg_loss,
        "payoff_ratio": avg_win / abs(avg_loss) if avg_loss != 0 else None,
        "trades_per_year": n / years if years > 0 else None,
        "avg_hold_days": _mean([t["hold_days"] for t in trades]),
        "total_cost": fee + spread,
        "gross_pnl": gross,
        "net_pnl": net,
        "cost_share_of_gross": (fee + spread) / gross if gross > 0 else None,
    }


def summarize(r, initial, rf_annual=RF_ANNUAL):
    n = len(r.dates)
    start = r.dates[0] if n else ""
    end = r.dates[-1] if n else ""
    years = days_between(start, end) / 365.25 if n else 0.0
    final = float(r.equity[-1]) if n else initial
    peak = np.maximum.accumulate(np.concatenate([[initial], r.equity]))[1:] if n else np.array([])
    dd = r.equity / peak - 1 if n else np.array([])
    mdd = float(min(0.0, dd.min())) if n else 0.0
    c = cagr(initial, final, start, end) if n else math.nan
    months = last_per_period(r.dates, r.equity, 7)
    rets = [m[1] / (months[i - 1][1] if i else initial) - 1 for i, m in enumerate(months)]
    mm = _mean(rets)
    sd = math.sqrt(sum((x - mm) ** 2 for x in rets) / (len(rets) - 1)) if len(rets) > 1 else math.nan
    rf_m = (1 + rf_annual) ** (1 / 12) - 1
    dsd = math.sqrt(_mean([min(x, 0) ** 2 for x in rets])) if rets else math.nan
    prior = initial
    daily_peak = -math.inf
    cursor = 0
    longest = run = recs = 0
    for _key, v, idx in months:
        flag = v >= prior - 1e-6
        recs += flag
        run = 0 if flag else run + 1
        longest = max(longest, run)
        while cursor <= idx:
            daily_peak = max(daily_peak, float(r.equity[cursor]))
            cursor += 1
        prior = max(prior, daily_peak)
    yrs = last_per_period(r.dates, r.equity, 4)
    yret = [(int(y[0]), y[1] / (yrs[i - 1][1] if i else initial) - 1) for i, y in enumerate(yrs)]
    exposure = float((r.n_open > 0).mean()) if n else None
    pos = r.equity > 0
    used = float((r.invested[pos] / r.equity[pos]).mean()) if pos.any() else None
    s = {
        "start": start,
        "end": end,
        "years": years,
        "initial": initial,
        "final": final,
        "cagr": _fin(c),
        "mdd": mdd,
        "calmar": c / abs(mdd) if mdd < 0 and math.isfinite(c) else None,
        "sharpe": mm / sd * math.sqrt(12) if sd and sd > 0 else None,
        "sharpe_excess": (mm - rf_m) / sd * math.sqrt(12) if sd and sd > 0 else None,
        "sortino": mm / dsd * math.sqrt(12) if dsd and dsd > 0 else None,
        "record_month_share": recs / len(months) if months else None,
        "longest_months_no_record": longest,
        "n_trades": len(r.trades),
        "exposure_days": exposure,
        "avg_capital_used": used,
        "losing_years": sum(1 for _, x in yret if x < 0),
        "n_open_at_end": len(r.open),
        "open_unrealized": sum(o["unrealized_pnl"] for o in r.open),
    }
    s.update(trade_stats(r.trades, years))
    series = {
        "dd": dd,
        "monthly": [{"ym": m[0], "ret": rets[i]} for i, m in enumerate(months)],
        "yearly": [{"year": y, "ret": x} for y, x in yret],
    }
    return s, series
