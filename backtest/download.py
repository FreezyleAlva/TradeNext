# backtest/download.py
import argparse
import json
import sys
import time
from datetime import date
from pathlib import Path

from .config import ROOT
from .data import sha256

SYMBOLS = {"IHSG": "^JKSE", "LQ45": "^JKLQ45"}


def fetch(symbol, start, end):
    import yfinance as yf

    for attempt in range(4):
        try:
            df = yf.Ticker(symbol).history(start=start, end=end, auto_adjust=False, actions=True)
            if len(df):
                return df
        except Exception as exc:
            print(f"  {symbol} gagal ({exc}), ulang", file=sys.stderr)
        time.sleep(2 * (attempt + 1))
    return None


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Unduh ulang harga harian Yahoo Finance ke folder snapshot baru.")
    ap.add_argument("--out", default=None)
    ap.add_argument("--start", default="2015-01-01")
    ap.add_argument("--end", default=None)
    args = ap.parse_args()
    frozen = json.loads((ROOT / "data" / "manifest.json").read_text(encoding="utf-8"))
    today = date.today().isoformat()
    out = Path(args.out) if args.out else ROOT / "data" / "snapshots" / today
    out.mkdir(parents=True, exist_ok=True)
    files = {}
    for t, info in frozen["files"].items():
        symbol = info.get("symbol") or SYMBOLS.get(t, f"{t}.JK")
        df = fetch(symbol, args.start, args.end)
        if df is None:
            print(f"{t:6s} kosong")
            continue
        df.index = df.index.tz_localize(None) if df.index.tz is not None else df.index
        df.index.name = "Date"
        cols = ["Open", "High", "Low", "Close", "Adj Close", "Volume", "Dividends", "Stock Splits"]
        df = df[[c for c in cols if c in df.columns]]
        path = out / f"{t}.csv"
        df.to_csv(path, date_format="%Y-%m-%d")
        files[t] = {
            "symbol": symbol,
            "rows": len(df),
            "first": df.index[0].strftime("%Y-%m-%d"),
            "last": df.index[-1].strftime("%Y-%m-%d"),
            "sha256": sha256(path),
        }
        print(f"{t:6s} {len(df):5d} baris")
    manifest = {
        "source": "Yahoo Finance via yfinance (auto_adjust=False, actions=True)",
        "downloaded_on": today,
        "start": args.start,
        "files": files,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(f"{len(files)} file -> {out}")


if __name__ == "__main__":
    main()
