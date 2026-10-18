// src/components/ui/Icon.tsx
import type { CSSProperties } from "react";

export type IconName =
  | "overview" | "rules" | "metrics" | "equity" | "drawdown" | "calendar" | "histogram"
  | "validation" | "walkforward" | "sensitivity" | "forward" | "lookahead" | "execution"
  | "tradelog" | "risk" | "statement" | "search" | "download" | "info" | "check" | "cross"
  | "arrow_up" | "arrow_down" | "clock" | "layers" | "dice" | "cost" | "delay" | "database"
  | "user" | "menu" | "chevron_right" | "chevron_down" | "filter" | "sort" | "external"
  | "benchmark" | "monte_carlo";

export function Icon({ name, className = "size-s4" }: { name: IconName; className?: string }) {
  const url = `url(/icons/${name}.png)`;
  const style: CSSProperties = { maskImage: url, WebkitMaskImage: url };
  return <span aria-hidden="true" className={`icon ${className}`} style={style} />;
}
