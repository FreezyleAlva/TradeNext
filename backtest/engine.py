# backtest/engine.py
from dataclasses import dataclass, field
from datetime import date

import numpy as np

from .config import RUN


def tick_size(p):
    if p < 200:
        return 1
    if p < 500:
        return 2
    if p < 2000:
        return 5
    if p < 5000:
        return 10
    return 25


def round_to_tick(price):
    t = tick_size(price)
    r = round(price / t) * t
    t2 = tick_size(r)
    return round(r / t2) * t2


def offer_price(raw_open, ticks):
    out = round_to_tick(raw_open)
    for _ in range(ticks):
        out = out + tick_size(out)
    return float(out)


def bid_price(raw_open, ticks):
    out = round_to_tick(raw_open)
    for _ in range(ticks):
        out = out - tick_size(max(out - 1e-9, 1))
    return float(max(out, 1))


def days_between(a, b):
    return (date.fromisoformat(b) - date.fromisoformat(a)).days


@dataclass
class Position:
    j: int
    signal_date: str
    entry_idx: int
    entry_price: float
    entry_mid: float
    entry_shares: int
    shares: int
    fee_buy: float
    spread_buy: float
    entry_equity: float
    highest_close: float
    dividends: float = 0.0
    exit_pending: bool = False
    exit_reason: str = ""
    exit_signal_date: str = ""
    exit_exec_idx: int = 0


@dataclass
class Result:
    dates: list
    equity: np.ndarray
    cash: np.ndarray
    invested: np.ndarray
    n_open: np.ndarray
    trades: list
    open: list
    blocked: dict = field(default_factory=dict)


def run_backtest(m, start, end, params, entry_mask=None, **overrides):
    cfg = {**RUN, **overrides}
    i0, i1 = m.slice_index(start, end)
    n = max(0, i1 - i0 + 1)
    trail = float(params["trail_atr"])
    hh = m.hh(int(round(params["breakout"])))
    ma = m.ma(int(round(params["trend_ma"])))
    with np.errstate(invalid="ignore"):
        signal = m.base_eligible & (m.close > hh) & (m.close > ma)
    if entry_mask is not None:
        signal = m.base_eligible & entry_mask
    dates = m.dates
    close, open_ = m.close, m.open
    tradable, lock_up, lock_down = m.tradable, m.lock_up, m.lock_down
    raw_open, mark_close, atr, adv, roc = m.raw_open, m.mark_close, m.atr, m.adv, m.roc
    split, div_raw = m.split, m.div_raw
    lot = cfg["lot_size"]
    ticks = cfg["spread_ticks"]

    cash = float(cfg["initial"])
    positions = {}
    pending = {}
    trades = []
    blocked = dict.fromkeys(
        ["buy_lock_up", "buy_untradable", "buy_liquidity_capped", "buy_too_small", "sell_lock_down", "sell_untradable", "buy_no_slot"], 0
    )
    eq = np.zeros(n)
    cash_arr = np.zeros(n)
    inv_arr = np.zeros(n)
    n_open = np.zeros(n, dtype=int)
    last_equity = cash
    trail_label = f"Trailing stop: close < highest close - {trail:g} x ATR20"

    def close_position(p, d, price, mid, reason):
        nonlocal cash
        proceeds = price * p.shares
        fee = proceeds * cfg["fee_sell"]
        cash += proceeds - fee
        cost = p.entry_price * p.entry_shares + p.fee_buy
        net = proceeds - fee - cost + p.dividends
        gross = mid * p.shares - p.entry_mid * p.entry_shares + p.dividends
        trades.append(
            {
                "ticker": m.tickers[p.j],
                "signal_date": p.signal_date,
                "entry_date": dates[p.entry_idx],
                "entry_price": p.entry_price,
                "entry_shares": p.entry_shares,
                "entry_lots": p.entry_shares // lot,
                "exit_signal_date": p.exit_signal_date,
                "exit_date": dates[d],
                "exit_price": price,
                "exit_shares": p.shares,
                "fee_buy": p.fee_buy,
                "fee_sell": fee,
                "spread_cost": p.spread_buy + (mid - price) * p.shares,
                "dividends": p.dividends,
                "cost_basis": cost,
                "gross_pnl": gross,
                "net_pnl": net,
                "ret_pct": net / cost,
                "hold_days": days_between(dates[p.entry_idx], dates[d]),
                "hold_bars": d - p.entry_idx,
                "entry_equity": p.entry_equity,
                "exit_reason": reason,
            }
        )

    for k in range(n):
        d = i0 + k
        for p in positions.values():
            s = split[p.j, d]
            if s != 1 and np.isfinite(s) and s > 0:
                p.shares = int(np.floor(p.shares * s + 1e-9))
            dv = div_raw[p.j, d]
            if dv > 0:
                net = dv * p.shares * (1 - cfg["dividend_tax"])
                p.dividends += net
                cash += net

        for j in list(positions):
            p = positions[j]
            if not p.exit_pending or p.exit_exec_idx > d:
                continue
            if not tradable[j, d]:
                blocked["sell_untradable"] += 1
                continue
            if lock_down[j, d]:
                blocked["sell_lock_down"] += 1
                continue
            ro = raw_open[j, d]
            close_position(p, d, bid_price(ro, ticks), float(round_to_tick(ro)), p.exit_reason)
            del positions[j]

        orders = pending.pop(d, None)
        if orders:
            orders.sort(key=lambda o: -o[1])
            sizing = last_equity if cfg["compounding"] else cfg["initial"]
            for j, _score, sig in orders:
                if j in positions:
                    continue
                if len(positions) >= cfg["max_positions"]:
                    blocked["buy_no_slot"] += 1
                    continue
                if not tradable[j, d]:
                    blocked["buy_untradable"] += 1
                    continue
                if lock_up[j, d]:
                    blocked["buy_lock_up"] += 1
                    continue
                ro = raw_open[j, d]
                mid = float(round_to_tick(ro))
                price = offer_price(ro, ticks)
                target = sizing * cfg["position_fraction"]
                liq = cfg["liquidity_cap"] * adv[j, sig]
                if liq < target:
                    blocked["buy_liquidity_capped"] += 1
                    target = liq
                budget = min(target, cash)
                lots = budget // (price * lot * (1 + cfg["fee_buy"]))
                if not lots >= 1:
                    blocked["buy_too_small"] += 1
                    continue
                shares = int(lots) * lot
                fee = price * shares * cfg["fee_buy"]
                cash -= price * shares + fee
                c = close[j, d]
                positions[j] = Position(
                    j=j,
                    signal_date=dates[sig],
                    entry_idx=d,
                    entry_price=price,
                    entry_mid=mid,
                    entry_shares=shares,
                    shares=shares,
                    fee_buy=fee,
                    spread_buy=(price - mid) * shares,
                    entry_equity=sizing,
                    highest_close=c if np.isfinite(c) else open_[j, d],
                )

        invested = 0.0
        for j, p in positions.items():
            invested += p.shares * mark_close[j, d]
        equity = cash + invested
        eq[k] = equity
        cash_arr[k] = cash
        inv_arr[k] = invested
        n_open[k] = len(positions)
        last_equity = equity

        ex = d + 1 + cfg["delay"]
        if ex > i1:
            continue
        for j, p in positions.items():
            c = close[j, d]
            if not np.isfinite(c) or p.exit_pending:
                continue
            p.highest_close = max(p.highest_close, c)
            a = atr[j, d]
            if np.isfinite(a) and c < p.highest_close - trail * a:
                p.exit_pending = True
                p.exit_reason = trail_label
                p.exit_signal_date = dates[d]
                p.exit_exec_idx = ex
        if m.regime[d] or entry_mask is not None:
            col = np.flatnonzero(signal[:, d])
            for j in col:
                j = int(j)
                if j in positions:
                    continue
                pending.setdefault(ex, []).append((j, roc[j, d], d))

    open_list = []
    if n > 0:
        for j, p in positions.items():
            mark = mark_close[j, i1]
            cost = p.entry_price * p.entry_shares + p.fee_buy
            value = mark * p.shares
            open_list.append(
                {
                    "ticker": m.tickers[j],
                    "entry_date": dates[p.entry_idx],
                    "entry_price": p.entry_price,
                    "shares": p.shares,
                    "cost_basis": cost,
                    "mark_price": mark,
                    "unrealized_pnl": value - cost + p.dividends,
                    "unrealized_pct": (value - cost + p.dividends) / cost,
                    "exit_pending": p.exit_pending,
                }
            )

    return Result(dates[i0 : i1 + 1], eq, cash_arr, inv_arr, n_open, trades, open_list, blocked)
