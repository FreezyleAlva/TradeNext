# backtest/data.py
import hashlib
import json
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .config import BENCHMARKS, MANIFEST, MARKET, RAW


def read_csv(path):
    df = pd.read_csv(path)
    df["Date"] = df["Date"].astype(str).str.slice(0, 10)
    df = df.sort_values("Date", kind="mergesort").reset_index(drop=True)
    for col in ("Dividends", "Stock Splits"):
        if col not in df:
            df[col] = 0.0
        df[col] = df[col].fillna(0.0)
    return df


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha256_crlf(path):
    body = path.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
    return hashlib.sha256(body).hexdigest()


def hash_matches(path, expected):
    return sha256(path) == expected or sha256_crlf(path) == expected


@dataclass
class Market:
    dates: list
    tickers: list
    open: np.ndarray
    high: np.ndarray
    low: np.ndarray
    close: np.ndarray
    volume: np.ndarray
    split: np.ndarray
    div_raw: np.ndarray
    factor: np.ndarray
    bench: dict
    first: dict
    _hh: dict = field(default_factory=dict)
    _ma: dict = field(default_factory=dict)

    def __post_init__(self):
        self.n = len(self.dates)
        self.date_index = pd.Index(self.dates)
        self._derive()

    def _derive(self):
        c = self.close
        ff = pd.DataFrame(c.T).ffill().to_numpy().T
        prev_ff = np.full_like(c, np.nan)
        prev_ff[:, 1:] = ff[:, :-1]
        with np.errstate(invalid="ignore", divide="ignore"):
            move = c / prev_ff - 1
        flat = np.abs(self.high - self.low) < 1e-9
        self.lock_up = flat & (move >= MARKET["lock_move"])
        self.lock_down = flat & (move <= -MARKET["lock_move"])
        self.tradable = ~np.isnan(c) & (self.volume > 0) & (self.open > 0)
        value = np.where(self.tradable, c * self.volume, np.nan)
        self.raw_open = self.open * self.factor
        self.raw_close = c * self.factor
        self.mark_close = ff * self.factor
        pc = np.full_like(c, np.nan)
        pc[:, 1:] = c[:, :-1]
        h, l = self.high, self.low
        tr = np.fmax(h - l, np.fmax(np.abs(h - pc), np.abs(l - pc)))
        rw = MARKET["rank_window"]
        roc = np.full_like(c, np.nan)
        with np.errstate(invalid="ignore", divide="ignore"):
            roc[:, rw:] = c[:, rw:] / c[:, :-rw] - 1
        self.roc = roc
        self.adv = rolling_mean(value, MARKET["liquidity_window"])
        self.atr = rolling_mean(tr, MARKET["atr_window"])
        adv0 = np.nan_to_num(self.adv, nan=0.0)
        rc0 = np.nan_to_num(self.raw_close, nan=0.0)
        self.base_eligible = (
            self.tradable
            & (adv0 >= MARKET["min_adv"])
            & (rc0 >= MARKET["min_price"])
            & np.isfinite(self.atr)
            & np.isfinite(self.roc)
        )
        ihsg = np.array([np.nan if v is None else v for v in self.bench["IHSG"]], dtype=float)
        ma = pd.Series(ihsg).rolling(MARKET["regime_ma"]).mean().to_numpy()
        with np.errstate(invalid="ignore"):
            self.regime = ihsg > ma

    def hh(self, w):
        if w not in self._hh:
            self._hh[w] = pd.DataFrame(self.high.T).rolling(w).max().shift(1).to_numpy().T
        return self._hh[w]

    def ma(self, w):
        if w not in self._ma:
            self._ma[w] = rolling_mean(self.close, w)
        return self._ma[w]

    def slice_index(self, start, end):
        i0 = int(self.date_index.searchsorted(start, side="left"))
        i1 = int(self.date_index.searchsorted(end, side="right")) - 1
        return i0, i1

    def subset(self, tickers):
        keep = [self.tickers.index(t) for t in tickers]
        return Market(
            dates=self.dates,
            tickers=[self.tickers[k] for k in keep],
            open=self.open[keep],
            high=self.high[keep],
            low=self.low[keep],
            close=self.close[keep],
            volume=self.volume[keep],
            split=self.split[keep],
            div_raw=self.div_raw[keep],
            factor=self.factor[keep],
            bench=self.bench,
            first={t: self.first[t] for t in tickers},
        )


def rolling_mean(arr, w):
    return pd.DataFrame(arr.T).rolling(w).mean().to_numpy().T


def universe():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    return [t for t in manifest["files"] if t not in BENCHMARKS and t != "IHSG"], manifest


def load_market(raw_dir=RAW, tickers=None, frames=None):
    if tickers is None:
        tickers, _ = universe()
    frames = frames or {}
    ihsg = frames.get("IHSG")
    if ihsg is None:
        ihsg = read_csv(raw_dir / "IHSG.csv")
    dates = ihsg["Date"].tolist()
    pos = {d: i for i, d in enumerate(dates)}
    n = len(dates)

    bench = {}
    for name in BENCHMARKS:
        rows = frames.get(name)
        if rows is None:
            rows = read_csv(raw_dir / f"{name}.csv")
        arr = [None] * n
        for d, c in zip(rows["Date"], rows["Close"]):
            i = pos.get(d)
            if i is not None:
                arr[i] = float(c)
        for i in range(1, n):
            if arr[i] is None:
                arr[i] = arr[i - 1]
        bench[name] = arr

    T = len(tickers)
    shape = (T, n)
    o, h, l, c, v = (np.full(shape, np.nan) for _ in range(5))
    split = np.ones(shape)
    div = np.zeros(shape)
    factor = np.full(shape, np.nan)
    first = {}
    for j, t in enumerate(tickers):
        df = frames.get(t)
        if df is None:
            df = read_csv(raw_dir / f"{t}.csv")
        sp = df["Stock Splits"].to_numpy(dtype=float)
        sp = np.where(sp == 0, 1.0, sp)
        m = len(df)
        future = np.ones(m)
        prod = 1.0
        for k in range(m - 1, -1, -1):
            future[k] = 1.0 if k == m - 1 else prod
            prod = prod * sp[k]
        idx = np.array([pos.get(d, -1) for d in df["Date"]])
        ok = idx >= 0
        ii = idx[ok]
        o[j, ii] = df["Open"].to_numpy(dtype=float)[ok]
        h[j, ii] = df["High"].to_numpy(dtype=float)[ok]
        l[j, ii] = df["Low"].to_numpy(dtype=float)[ok]
        c[j, ii] = df["Close"].to_numpy(dtype=float)[ok]
        v[j, ii] = df["Volume"].to_numpy(dtype=float)[ok]
        split[j, ii] = sp[ok]
        div[j, ii] = df["Dividends"].to_numpy(dtype=float)[ok] * future[ok]
        factor[j, ii] = future[ok]
        first[t] = df["Date"][ok].iloc[0] if ok.any() else None
        row = pd.Series(factor[j]).bfill().ffill().fillna(1.0)
        factor[j] = row.to_numpy()

    return Market(dates, list(tickers), o, h, l, c, v, split, div, factor, bench, first)
