// src/lib/engine/protocol.ts
import type { EngineOpen, EngineTrade, RunConfig, StrategyParams } from "./engine";
import type { LabSummary } from "./metrics";

export type ParamKey = keyof StrategyParams;

export interface LabRun {
  cfg: RunConfig;
  summary: LabSummary;
  dates: string[];
  equity: number[];
  dd: number[];
  nOpen: number[];
  bench: { ihsg: number[]; lq45: number[] };
  monthly: { ym: string; ret: number }[];
  yearly: { year: number; ret: number }[];
  trades: EngineTrade[];
  open: EngineOpen[];
  blocked: Record<string, number>;
  ms: number;
}

export interface OptCell {
  x: number;
  y: number;
  cagr: number | null;
  mdd: number;
  calmar: number | null;
  sharpe: number | null;
  profit_factor: number | null;
  n_trades: number;
  final: number;
}

export type ToWorker =
  | { kind: "init" }
  | { kind: "run"; id: number; cfg: RunConfig }
  | { kind: "optimize"; id: number; cfg: RunConfig; xKey: ParamKey; xs: number[]; yKey: ParamKey; ys: number[] }
  | { kind: "cancel"; id: number };

export type FromWorker =
  | { kind: "ready"; ms: number; tickers: number; days: number; first: string; last: string }
  | { kind: "error"; id?: number; message: string }
  | { kind: "result"; id: number; run: LabRun }
  | { kind: "progress"; id: number; done: number; total: number }
  | { kind: "optimized"; id: number; cells: OptCell[]; ms: number };
