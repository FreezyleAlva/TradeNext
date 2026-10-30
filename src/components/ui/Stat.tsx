// src/components/ui/Stat.tsx
import type { ReactNode } from "react";
import type { Tone } from "@/lib/format";

const toneCls: Record<Tone, string> = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-ink-1",
};

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
  size = "md",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  size?: "lg" | "md";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-s1 rounded-md bg-surface-2 p-s3">
      <div className="text-xs text-ink-3">{label}</div>
      <div className={`font-medium tabular-nums ${size === "lg" ? "text-xl" : "text-base"} ${toneCls[tone]}`}>{value}</div>
      {sub ? <div className="text-xs text-ink-3">{sub}</div> : null}
    </div>
  );
}

export function StatGrid({ children, cols = "md" }: { children: ReactNode; cols?: "md" | "lg" }) {
  return <div className={cols === "lg" ? "stat-grid-lg grid gap-s3" : "stat-grid grid gap-s3"}>{children}</div>;
}
