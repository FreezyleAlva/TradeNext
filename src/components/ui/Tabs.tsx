// src/components/ui/Tabs.tsx
"use client";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  const [active, setActive] = useState(0);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    let next = active;
    if (e.key === "ArrowRight") next = (active + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (active - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-s3">
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-s1 self-start rounded-md bg-surface-2 p-s1" onKeyDown={onKey}>
        {items.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => { refs.current[i] = el; }}
            id={`${base}-t${i}`}
            role="tab"
            type="button"
            aria-selected={i === active}
            aria-controls={`${base}-p${i}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={`tap rounded-sm px-s3 py-s1 text-sm ${i === active ? "bg-surface-4 text-ink-1" : "text-ink-3 hover:text-ink-1"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {items.map((t, i) => (
        <div key={t.key} id={`${base}-p${i}`} role="tabpanel" aria-labelledby={`${base}-t${i}`} hidden={i !== active}>
          {i === active ? t.content : null}
        </div>
      ))}
    </div>
  );
}
