// src/components/ui/Section.tsx
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function Section({
  id,
  icon,
  code,
  title,
  lead,
  children,
}: {
  id: string;
  icon: IconName;
  code?: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="section flex flex-col gap-s4">
      <header className="flex flex-col gap-s1">
        <h2 id={`${id}-h`} className="flex items-center gap-s2 text-lg font-semibold text-ink-1">
          <Icon name={icon} className="size-s5 text-cyan-2" />
          {code ? <span className="font-mono text-sm text-ink-3">{code}</span> : null}
          <span>{title}</span>
        </h2>
        {lead ? <p className="max-w-prose text-sm text-ink-2">{lead}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function Panel({
  title,
  icon,
  aside,
  children,
  className = "",
}: {
  title?: ReactNode;
  icon?: IconName;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-s3 rounded-lg bg-surface-1 p-s4 ${className}`}>
      {title || aside ? (
        <div className="flex flex-wrap items-baseline justify-between gap-s2">
          {title ? (
            <h3 className="flex items-center gap-s2 text-sm font-semibold text-ink-1">
              {icon ? <Icon name={icon} className="size-s4 text-ink-3" /> : null}
              {title}
            </h3>
          ) : null}
          {aside ? <div className="text-xs text-ink-3">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function Note({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warning" }) {
  const cls = tone === "warning" ? "bg-surface-2 text-warning" : "bg-surface-2 text-ink-2";
  return (
    <div className={`flex gap-s2 rounded-md p-s3 text-sm ${cls}`}>
      <Icon name="info" className="mt-s1 size-s4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Prose({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-s2 text-sm text-ink-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-s2">
          <span className="font-mono text-xs text-ink-4 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
          <span className="min-w-0">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function KeyValue({ rows }: { rows: { k: ReactNode; v: ReactNode }[] }) {
  return (
    <dl className="kv grid gap-x-s4 gap-y-s2 text-sm">
      {rows.map((r, i) => (
        <div key={i} className="contents">
          <dt className="text-ink-3">{r.k}</dt>
          <dd className="min-w-0 break-words text-ink-1">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export type BadgeTone = "positive" | "negative" | "warning" | "neutral";

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  const cls = {
    positive: "text-positive",
    negative: "text-negative",
    warning: "text-warning",
    neutral: "text-ink-2",
  }[tone];
  const icon: IconName = tone === "positive" ? "check" : tone === "neutral" ? "info" : "cross";
  return (
    <span className={`inline-flex items-center gap-s1 rounded-sm bg-surface-3 px-s2 py-s1 text-xs font-medium ${cls}`}>
      <Icon name={icon} className="size-s3" />
      {children}
    </span>
  );
}
