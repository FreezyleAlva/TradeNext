// src/components/terminal/types.ts
export interface OfficialTrade {
  id: number;
  ticker: string;
  entry_date: string;
  exit_date: string | null;
  entry_price: number;
  exit_price: number | null;
  net_pnl: number | null;
  ret_pct: number | null;
}

export interface TerminalProps {
  tickers: string[];
  params: { breakout: number; trend_ma: number; trail_atr: number };
  trades: OfficialTrade[];
  equity: { d: string[]; v: number[]; dd: number[]; open: number[] };
  meta: {
    backtest_start: string;
    backtest_end: string;
    research_end: string;
    forward_start: string;
    data_last_date: string;
    initial_capital: number;
    max_positions: number;
    position_fraction: number;
    strategy_name: string;
  };
  official: { final: number | null; n_trades: number | null; cagr: number | null; mdd: number | null; profit_factor: number | null };
  grid: Record<string, number[]>;
}
