// src/components/terminal/useLab.ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RunConfig } from "@/lib/engine/engine";
import type { FromWorker, LabRun, OptCell, ParamKey, ToWorker } from "@/lib/engine/protocol";

export interface LabState {
  ready: { ms: number; tickers: number; days: number; first: string; last: string } | null;
  error: string | null;
  busy: "run" | "optimize" | null;
  progress: { done: number; total: number } | null;
}

export function useLab() {
  const worker = useRef<Worker | null>(null);
  const seq = useRef(0);
  const optId = useRef(0);
  const waiters = useRef(new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>());
  const [state, setState] = useState<LabState>({ ready: null, error: null, busy: null, progress: null });

  useEffect(() => {
    const w = new Worker(new URL("../../workers/lab.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    const pending = waiters.current;
    w.onmessage = (e: MessageEvent<FromWorker>) => {
      const m = e.data;
      if (m.kind === "ready") setState((s) => ({ ...s, ready: { ms: m.ms, tickers: m.tickers, days: m.days, first: m.first, last: m.last }, error: null }));
      else if (m.kind === "progress") setState((s) => ({ ...s, progress: { done: m.done, total: m.total } }));
      else if (m.kind === "error") {
        setState((s) => ({ ...s, error: m.message, busy: null, progress: null }));
        if (m.id !== undefined) { pending.get(m.id)?.reject(new Error(m.message)); pending.delete(m.id); }
      } else if (m.kind === "result") { pending.get(m.id)?.resolve(m.run); pending.delete(m.id); }
      else if (m.kind === "optimized") { pending.get(m.id)?.resolve(m.cells); pending.delete(m.id); }
    };
    w.onerror = (e) => setState((s) => ({ ...s, error: e.message || "Worker gagal dimuat", busy: null }));
    w.postMessage({ kind: "init" } satisfies ToWorker);
    return () => {
      w.terminate();
      worker.current = null;
      pending.clear();
    };
  }, []);

  const send = useCallback(<T,>(msg: ToWorker & { id: number }): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      waiters.current.set(msg.id, { resolve: resolve as (v: unknown) => void, reject });
      worker.current?.postMessage(msg);
    });
  }, []);

  const run = useCallback(async (cfg: RunConfig): Promise<LabRun> => {
    const id = ++seq.current;
    setState((s) => ({ ...s, busy: "run", error: null }));
    try {
      return await send<LabRun>({ kind: "run", id, cfg });
    } finally {
      setState((s) => ({ ...s, busy: null }));
    }
  }, [send]);

  const optimize = useCallback(async (cfg: RunConfig, xKey: ParamKey, xs: number[], yKey: ParamKey, ys: number[]): Promise<OptCell[] | null> => {
    const id = ++seq.current;
    optId.current = id;
    setState((s) => ({ ...s, busy: "optimize", error: null, progress: { done: 0, total: xs.length * ys.length } }));
    try {
      return await send<OptCell[]>({ kind: "optimize", id, cfg, xKey, xs, yKey, ys });
    } catch {
      return null;
    } finally {
      setState((s) => ({ ...s, busy: null }));
    }
  }, [send]);

  const cancel = useCallback(() => {
    const id = optId.current;
    worker.current?.postMessage({ kind: "cancel", id } satisfies ToWorker);
    waiters.current.get(id)?.reject(new Error("dibatalkan"));
    waiters.current.delete(id);
    setState((s) => ({ ...s, busy: null, progress: null }));
  }, []);

  return { state, run, optimize, cancel };
}
