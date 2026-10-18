export type Num = number | null;

export interface Identity {
  nama: string;
  nim: string;
  prodi?: string;
  kelas?: string;
  mata_kuliah: string;
  tugas: string;
}

export interface Params {
  breakout: number;
  trend_ma: number;
  trail_atr: number;
}

export interface Meta {
  dashboard: string;
  strategy_name: string;
  strategy_version: string;
  generated_at: string;
  freeze_date: string;
  research_end: string;
  forward_start: string;
  data_last_date: string;
  backtest_start: string;
  backtest_end: string;
  initial_capital: number;
  max_positions: number;
  position_fraction: number;
  compounding: boolean;
  params: Params;
  data_source: string;
  data_downloaded_on: string;
  data_files: number;
  universe_source: string;
  universe_source_url: string;
  universe: string[];
  benchmarks: Record<string, string>;
  identity: Identity;
}

export interface Rules {
  summary: string;
  entry: string[];
  exit: string[];
  sizing: string[];
  universe: string;
  timeframe: string;
  parameters: {
    optimized: string[];
    fixed: Record<string, number>;
  };
}

export interface CostItem {
  item: string;
  value: string;
  detail: string;
}

export interface Summary {
  start: string;
  end: string;
  years: Num;
  initial: Num;
  final: Num;
  cagr: Num;
  mdd: Num;
  calmar: Num;
  sharpe: Num;
  sharpe_excess: Num;
  sortino: Num;
  win_ratio: Num;
  avg_win_pct: Num;
  avg_loss_pct: Num;
  avg_win_rp: Num;
  avg_loss_rp: Num;
  profit_factor: Num;
  expectancy_pct: Num;
  payoff_ratio: Num;
  record_month_share: Num;
  longest_months_no_record: Num;
  n_trades: Num;
  trades_per_year: Num;
  avg_hold_days: Num;
  exposure_days: Num;
  avg_capital_used: Num;
  losing_years: Num;
  total_cost: Num;
  gross_pnl: Num;
  net_pnl: Num;
  cost_share_of_gross: Num;
  n_open_at_end: Num;
  open_unrealized: Num;
  small_sample: boolean | null;
}

export interface SummaryFull extends Summary {
  monthly_mean: Num;
  monthly_std: Num;
  n_months: Num;
  n_years_measured: Num;
  n_wins: Num;
  n_losses: Num;
  gross_win_rp: Num;
  gross_loss_rp: Num;
  avg_hold_bars: Num;
  total_fee: Num;
  total_spread: Num;
  longest_losing_streak: Num;
  top10_pnl: Num;
  top10_share_of_net: Num;
}

export interface Benchmark {
  cagr: Num;
  mdd: Num;
  start_value: Num;
  end_value: Num;
}

export interface EquityPoint {
  d: string;
  equity: number;
  cash: number;
  invested: number;
  n_open: number;
  dd: number;
  ihsg: number;
  lq45: number;
  ihsg_dd?: number;
}

export interface SimplePoint {
  d: string;
  equity: number;
  dd?: number;
}

export interface MonthlyRow {
  year: number;
  months: Num[];
  total: Num;
}

export interface YearlyRow {
  year: number;
  ret: Num;
  ihsg?: Num;
}

export interface Histogram {
  edges: number[];
  counts: number[];
  note?: string;
}

export interface Trade {
  id: number;
  ticker: string;
  signal_date: string;
  entry_date: string;
  entry_time: string;
  entry_price: number;
  entry_lots: number;
  entry_shares: number;
  exit_signal_date: string | null;
  exit_date: string | null;
  exit_time: string | null;
  exit_price: Num;
  exit_lots: Num;
  exit_shares: Num;
  fee_buy: Num;
  fee_sell: Num;
  spread_cost: Num;
  total_cost: Num;
  dividends: Num;
  cost_basis: Num;
  gross_pnl: Num;
  net_pnl: Num;
  ret_pct: Num;
  hold_days: Num;
  hold_bars: Num;
  entry_equity: Num;
  exit_reason: string | null;
}

export type OpenPosition = Record<string, string | number | null>;

export interface Main {
  summary: Summary;
  summary_full: SummaryFull;
  benchmarks: Record<string, Benchmark>;
  equity: EquityPoint[];
  monthly: { month_labels: string[]; rows: MonthlyRow[] };
  yearly: YearlyRow[];
  histogram: Histogram;
  trades: Trade[];
  open_positions: OpenPosition[];
  blocked_orders: Record<string, number>;
}

export interface GridRow extends Params {
  cagr: Num;
  mdd: Num;
  calmar: Num;
  sharpe: Num;
  profit_factor: Num;
  n_trades: Num;
  net_pnl: Num;
  plateau_score: Num;
  interior: boolean;
}

export interface WfWindow {
  train_start: string;
  train_end: string;
  test_start: string;
  test_end: string;
  params: Params;
  train_calmar: Num;
  train_cagr: Num;
  train_plateau_score: Num;
  test_return: Num;
  test_cagr: Num;
  test_mdd: Num;
  test_trades: Num;
  test_win_ratio: Num;
  test_profit_factor: Num;
  start_capital: Num;
  end_capital: Num;
}

export interface SensRow {
  param: string;
  mult: number;
  value: number;
  cagr: Num;
  mdd: Num;
  calmar: Num;
  sharpe: Num;
  profit_factor: Num;
  n_trades: Num;
}

export interface HeatCell {
  cagr: Num;
  calmar: Num;
  mdd: Num;
}

export interface Heatmap {
  x_param: string;
  y_param: string;
  fixed: Record<string, number>;
  x: number[];
  y: number[];
  cells: (HeatCell | null)[][];
}

export interface ResearchStep {
  step: number;
  date: string;
  what: string;
  combos: number;
  finding: string;
}

export interface RemovedTrade {
  ticker: string;
  entry_date: string;
  exit_date: string;
  net_pnl: Num;
  ret_pct: Num;
}

export interface Validation {
  is_oos: {
    is_start: string;
    is_end: string;
    oos_start: string;
    oos_end: string;
    fraction: number;
    is: Summary;
    oos: Summary;
    bench_is: Record<string, Benchmark>;
    bench_oos: Record<string, Benchmark>;
    is_equity: SimplePoint[];
    oos_equity: SimplePoint[];
  };
  selection: {
    method: string;
    grid: Record<string, number[]>;
    chosen: Params;
    top: GridRow[];
  };
  walk_forward: {
    scheme: string;
    windows: WfWindow[];
    combined: {
      start: string;
      end: string;
      cagr: Num;
      mdd: Num;
      final: Num;
      positive_windows: number;
      n_windows: number;
    };
    equity: SimplePoint[];
  };
  sensitivity: {
    method: string;
    full: SensRow[];
    in_sample: SensRow[];
    heatmap_is: Heatmap;
    heatmap_oos: Heatmap;
    heatmap_note: string;
  };
  research: {
    log: ResearchStep[];
    n_optimized_params: number;
    distinct_combos_final_grid: number;
    distinct_combos_all_iterations: number;
    walk_forward_runs: number;
    sensitivity_runs: number;
    oos_grid_runs_display_only: number;
  };
  robustness: {
    without_top5: {
      k: number;
      removed: RemovedTrade[];
      removed_pnl: Num;
      final_without: Num;
      cagr_without: Num;
      profit_factor_without: Num;
      net_pnl_without: Num;
      method: string;
    };
    losing_years: number;
    yearly: YearlyRow[];
    top10_share_of_net: Num;
    longest_losing_streak: Num;
  };
  monte_carlo: {
    n_sims: number;
    n_trades: number;
    method: string;
    cagr_p5: Num;
    cagr_p50: Num;
    cagr_p95: Num;
    mdd_p5: Num;
    mdd_p50: Num;
    mdd_p95: Num;
    prob_loss: Num;
    original_sequence_cagr: Num;
    original_sequence_mdd: Num;
    hist_cagr: Histogram;
  };
  random_entry: {
    n_runs: number;
    entry_prob: number;
    calibration: { prob: number; trades: number }[];
    method: string;
    cagr_p5: Num;
    cagr_p50: Num;
    cagr_p95: Num;
    mean_trades: Num;
    hist_cagr: Histogram;
    strategy_cagr: Num;
    strategy_percentile: Num;
  };
  other_asset: {
    asset: string;
    method: string;
    cagr: Num;
    mdd: Num;
    n_trades: Num;
    win_ratio: Num;
    buy_hold_cagr: Num;
    buy_hold_mdd: Num;
  };
  delay: {
    base: Summary;
    delayed: Summary;
    equity_delayed: SimplePoint[];
  };
  costs: {
    zero: Summary;
    base: Summary;
    double: Summary;
    double_definition: string;
  };
  lookahead: {
    checks: { rule: string; how: string; status: string }[];
    contamination: {
      cutoff: string;
      method: string;
      max_equity_diff_before: Num;
      max_equity_diff_after: Num;
      trades_before_original: Num;
      trades_before_contaminated: Num;
      trades_identical: boolean;
      passed: boolean;
    };
  };
  survivorship: { text: string[] };
  red_flags: { flag: string; value: number | number[] | null; triggered: boolean }[];
}

export interface Forward {
  freeze_date: string;
  start: string;
  end: string;
  weeks: Num;
  nature: string;
  summary: Summary;
  benchmarks: Record<string, Benchmark>;
  equity: EquityPoint[];
  trades: Trade[];
  open_positions: OpenPosition[];
}

export interface Docs {
  limitations: string[];
  ai_statement: {
    tools: { tool: string; platform?: string; used_for: string }[];
    human_role: string;
    integrity: string;
  };
  lessons: string[];
}

export interface Results {
  schema: "freezyle-traiding/1";
  meta: Meta;
  rules: Rules;
  costs: CostItem[];
  main: Main;
  validation: Validation;
  forward: Forward;
  docs: Docs;
}
