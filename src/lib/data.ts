// src/lib/data.ts
import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Identity, Results } from "@/types/results";

const ROOT = process.cwd();

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(join(ROOT, ...parts), "utf8")) as T;
}

export function loadResults(): Results {
  const r = readJson<Results>("data", "results.json");
  if (r.schema !== "freezyle-traiding/1") {
    throw new Error(`Skema results.json tidak dikenal: ${String(r.schema)}`);
  }
  return r;
}

export function loadIdentity(fallback: Identity): Identity {
  try {
    return { ...fallback, ...readJson<Partial<Identity>>("data", "identity.json") };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw e;
  }
}

export function loadSurface0(): string {
  return readJson<{ surface: Record<string, string> }>("design", "tokens.json").surface["0"] ?? "black";
}
