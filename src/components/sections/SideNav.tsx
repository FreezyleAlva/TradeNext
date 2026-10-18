// src/components/sections/SideNav.tsx
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Identity, Meta } from "@/types/results";
import { date } from "@/lib/format";
import { NAV } from "./nav";

export function SideNav({ meta, id }: { meta: Meta; id: Identity }) {
  return (
    <>
      <nav aria-label="Bagian dashboard" className="side-nav hidden flex-col gap-s4 bg-surface-1 p-s4 lg:flex">
        <a href="#identitas" className="flex items-center gap-s2 text-ink-1 no-underline">
          <img src="/icons/logo.png" alt="" width={32} height={32} className="size-s6 rounded-sm" />
          <span className="flex flex-col">
            <span className="text-base font-semibold">{meta.dashboard}</span>
            <span className="text-xs text-ink-3">{id.mata_kuliah}</span>
          </span>
        </a>
        <Link href="/terminal" className="tap flex items-center justify-between gap-s2 rounded-md bg-cyan-1 px-s3 text-sm font-medium text-ink-1 no-underline">
          <span className="flex items-center gap-s2"><Icon name="equity" className="size-s4" />Terminal dan lab</span>
          <Icon name="chevron_right" className="size-s4" />
        </Link>
        <ul className="flex flex-col gap-s1">
          {NAV.map((n) => (
            <li key={n.id}>
              <a href={`#${n.id}`} className="tap flex items-center gap-s2 rounded-md px-s2 text-sm text-ink-2 no-underline hover:bg-surface-2 hover:text-ink-1">
                <Icon name={n.icon} className="size-s4 text-ink-3" />
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col gap-s1 rounded-md bg-surface-2 p-s3 text-xs text-ink-3">
          <span>Dibekukan {date(meta.freeze_date)}</span>
          <span>Data s.d. {date(meta.data_last_date)}</span>
          <span>Dibuat {meta.generated_at}</span>
        </div>
      </nav>
      <nav aria-label="Bagian dashboard" className="sticky top-0 z-10 bg-surface-1 lg:hidden">
        <div className="flex items-center gap-s2 px-s4 pt-s3 text-sm font-semibold text-ink-1">
          <img src="/icons/logo.png" alt="" width={24} height={24} className="size-s5 rounded-sm" />
          {meta.dashboard}
        </div>
        <ul className="mobile-nav flex gap-s1 overflow-x-auto px-s4 py-s2">
          <li className="shrink-0">
            <Link href="/terminal" className="tap flex items-center gap-s1 rounded-md bg-cyan-1 px-s3 text-xs text-ink-1 no-underline">Terminal</Link>
          </li>
          {NAV.map((n) => (
            <li key={n.id} className="shrink-0">
              <a href={`#${n.id}`} className="tap flex items-center gap-s1 rounded-md bg-surface-2 px-s3 text-xs text-ink-2 no-underline">
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
