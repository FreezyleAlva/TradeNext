// src/components/ui/Table.tsx
import type { ReactNode } from "react";
import type { Tone } from "@/lib/format";

export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="table-wrap overflow-x-auto rounded-md bg-surface-2" tabIndex={0} role="region" aria-label={caption ?? "Tabel"}>
      <table className="data-table w-full text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function Th({ children, num = false }: { children?: ReactNode; num?: boolean }) {
  return (
    <th scope="col" className={`px-s3 py-s2 text-xs font-medium text-ink-3 ${num ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

const toneCls: Record<Tone, string> = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-ink-1",
};

export function Td({
  children,
  num = false,
  tone = "neutral",
  muted = false,
}: {
  children?: ReactNode;
  num?: boolean;
  tone?: Tone;
  muted?: boolean;
}) {
  const color = muted ? "text-ink-3" : toneCls[tone];
  return (
    <td className={`px-s3 py-s2 ${num ? "text-right font-mono tabular-nums whitespace-nowrap" : "text-left"} ${color}`}>
      {children}
    </td>
  );
}

export function Tr({ children, highlight = false }: { children: ReactNode; highlight?: boolean }) {
  return <tr className={highlight ? "bg-surface-3" : undefined}>{children}</tr>;
}
