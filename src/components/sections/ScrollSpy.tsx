// src/components/sections/ScrollSpy.tsx
"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { NAV, NAV_GROUPS } from "./nav";

const groupOf = new Map(NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.id, g.group] as const)));

export function ScrollSpy() {
  const [cur, setCur] = useState(NAV[0]!.id);
  useEffect(() => {
    const mark = () => {
      let hit = NAV[0]!.id;
      for (const n of NAV) {
        const el = document.getElementById(n.id);
        if (el && el.getBoundingClientRect().top <= 140) hit = n.id;
      }
      setCur(hit);
    };
    mark();
    window.addEventListener("scroll", mark, { passive: true });
    return () => window.removeEventListener("scroll", mark);
  }, []);
  useEffect(() => {
    document.querySelectorAll<HTMLAnchorElement>("[data-spy]").forEach((a) => a.setAttribute("aria-current", String(a.dataset.spy === cur)));
  }, [cur]);
  const item = NAV.find((n) => n.id === cur);
  return (
    <div className="crumb-path">
      <Icon name="overview" className="crumb-icon size-s5" />
      <span>{groupOf.get(cur)}</span>
      <span className="text-ink-4" aria-hidden="true">/</span>
      <b>{item?.label}</b>
    </div>
  );
}

export function JumpTo() {
  return (
    <label className="jump">
      <Icon name="search" className="size-s4 text-ink-3" />
      <span className="sr-only">Lompat ke bagian</span>
      <select
        defaultValue=""
        onChange={(e) => {
          const el = document.getElementById(e.target.value);
          if (el) el.scrollIntoView();
          e.target.value = "";
        }}
      >
        <option value="" disabled>
          Lompat ke bagian...
        </option>
        {NAV_GROUPS.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export function MenuButton() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const side = document.getElementById("sidebar");
    side?.classList.toggle("open", open);
    const close = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("#sidebar a")) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);
  return (
    <button type="button" className="menu-btn" aria-expanded={open} aria-controls="sidebar" aria-label={open ? "Tutup navigasi" : "Buka navigasi"} onClick={() => setOpen(!open)}>
      <Icon name="menu" className="size-s4" />
    </button>
  );
}
