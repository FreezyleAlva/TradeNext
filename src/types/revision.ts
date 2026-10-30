// src/types/revision.ts
import type { Num, Params } from "./results";

export interface RevSummary {
  final: number;
  cagr: Num;
  mdd: number;
  calmar: Num;
  sharpe: Num;
  sortino: Num;
  win_ratio: Num;
  profit_factor: Num;
  n_trades: number;
  total_cost: Num;
  exposure_days: Num;
}

export interface RevCheck {
  metric: string;
  claimed: number;
  reproduced: number;
  match: boolean;
}

export interface RevScenario {
  key: string;
  label: string;
  detail: string;
  summary: RevSummary;
  oos_cagr: Num;
  equity: [string, number][];
}

export interface Revision {
  schema: "freezyle-traiding-revision/1";
  generated_at: string;
  revision_of: string;
  params: Params;
  params_changed: boolean;
  reproduction: {
    engine: string;
    command: string;
    trades_claimed: number;
    trades_reproduced: number;
    trades_identical: number;
    final_equity_diff: number;
    blocked_identical: boolean;
    checks: RevCheck[];
    all_match: boolean;
  };
  integrity: {
    source: string;
    downloaded_on: string;
    files: number;
    sha256_match: number;
    hash_note: string;
    snapshot: {
      downloaded_on: string;
      bars_compared: number;
      bars_different: Record<string, number>;
      result: RevSummary;
    } | null;
  };
  quality: {
    bars: number;
    totals: Record<"ohlc_inconsistent" | "beyond_ara" | "zero_volume_move" | "missing_bar" | "stale_run", number>;
    flagged_bars: number;
    flagged_share: number;
    events: { ticker: string; date: string; kind: string; value: number; limit: number }[];
    glitches: { ticker: string; date: string; close: number }[];
    trades_touched: { ticker: string; entry_date: string; exit_date: string; net_pnl: number; ret_pct: number }[];
    rules: string[];
  };
  scenarios: RevScenario[];
  range: { cagr_min: number; cagr_max: number };
  seconds: number;
}
