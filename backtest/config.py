# backtest/config.py
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
MANIFEST = ROOT / "data" / "manifest.json"
RESULTS = ROOT / "data" / "results.json"
REVISION = ROOT / "data" / "revision.json"

FREEZE_DATE = "2026-10-18"
BACKTEST_START = "2016-09-01"
BACKTEST_END = "2026-08-31"
IS_END = "2023-08-31"
OOS_START = "2023-09-01"
FORWARD_START = "2026-09-01"

PARAMS = {"breakout": 150, "trend_ma": 100, "trail_atr": 5.0}

GRID = {
    "breakout": [20, 40, 60, 80, 100, 120, 150, 180],
    "trend_ma": [50, 100, 150, 200],
    "trail_atr": [2.0, 3.0, 4.0, 5.0, 6.0],
}

RUN = {
    "initial": 100_000_000.0,
    "max_positions": 10,
    "position_fraction": 0.1,
    "fee_buy": 0.0015,
    "fee_sell": 0.0025,
    "spread_ticks": 1,
    "delay": 0,
    "lot_size": 100,
    "liquidity_cap": 0.05,
    "dividend_tax": 0.1,
    "compounding": True,
}

MARKET = {
    "liquidity_window": 20,
    "lock_move": 0.065,
    "atr_window": 20,
    "rank_window": 120,
    "regime_ma": 200,
    "min_adv": 5_000_000_000.0,
    "min_price": 100.0,
}

BENCHMARKS = ("IHSG", "LQ45")
RF_ANNUAL = 0.05
SEED = 20261018
