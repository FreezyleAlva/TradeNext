# backtest/__main__.py
import argparse
import json
import sys

from . import config as C


def verify():
    from .data import hash_matches, load_market
    from .revision import reproduction

    frozen = json.loads(C.RESULTS.read_text(encoding="utf-8"))
    m = load_market(tickers=frozen["meta"]["universe"])
    manifest = json.loads(C.MANIFEST.read_text(encoding="utf-8"))
    good = sum(1 for t, info in manifest["files"].items() if hash_matches(C.RAW / f"{t}.csv", info["sha256"]))
    print(f"data mentah: {good}/{len(manifest['files'])} file cocok dengan SHA256 manifest")
    rep = reproduction(m, frozen)
    for c in rep["checks"]:
        print(f"{c['metric']:20s} klaim {c['claimed']!s:24s} ulang {c['reproduced']!s:24s} {'COCOK' if c['match'] else 'BEDA'}")
    print(f"trade identik {rep['trades_identical']}/{rep['trades_claimed']}, selisih ekuitas akhir Rp{rep['final_equity_diff']:.2f}")
    print("HASIL: semua klaim tereproduksi" if rep["all_match"] else "HASIL: ada yang tidak cocok")
    return 0 if rep["all_match"] and good == len(manifest["files"]) else 1


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(prog="python -m backtest")
    ap.add_argument("command", choices=["verify", "revision", "download"])
    ap.add_argument("--snapshot", default=None)
    args, rest = ap.parse_known_args()
    if args.command == "verify":
        raise SystemExit(verify())
    if args.command == "revision":
        from .revision import main as rev

        rev(args.snapshot)
    if args.command == "download":
        from .download import main as dl

        sys.argv = [sys.argv[0], *rest]
        dl()


if __name__ == "__main__":
    main()
