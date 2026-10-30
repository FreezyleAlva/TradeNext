// src/components/sections/SideNav.tsx
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Identity, Meta } from "@/types/results";
import { date } from "@/lib/format";
import { NAV_GROUPS } from "./nav";
import { MenuButton } from "./ScrollSpy";

export function SideNav({ meta, id, revisedAt }: { meta: Meta; id: Identity; revisedAt: string }) {
  const first = id.nama.split(" ")[0] ?? id.nama;
  return (
    <>
      <header className="topbar">
        <img src="/icons/logo.png" alt="" width={28} height={28} className="size-s5 rounded-sm" />
        <span className="flex-1 font-semibold">{meta.dashboard}</span>
        <MenuButton />
      </header>
      <aside id="sidebar" className="sidebar" aria-label="Navigasi dashboard">
        <div className="flex items-center gap-s3">
          <img src="/icons/logo.png" alt="Logo AlvaStudio" width={40} height={40} className="brand-logo" />
          <div className="min-w-0 flex-1">
            <div className="text-lg leading-tight font-semibold">{meta.dashboard}</div>
            <div className="text-xs text-ink-3">Trend Breakout K100</div>
          </div>
        </div>
        <div className="welcome">
          <h2>
            Selamat datang,
            <br />
            {first}
          </h2>
          <p>
            Aturan dibekukan {date(meta.freeze_date)}. Revisi {date(revisedAt)}.
          </p>
        </div>
        <Link href="/terminal" className="tap terminal-link">
          <span className="flex items-center gap-s2">
            <Icon name="equity" className="size-s4" />
            Terminal dan lab
          </span>
          <Icon name="chevron_right" className="size-s4" />
        </Link>
        <nav aria-label="Bagian dashboard">
          <ol className="nav-list">
            {NAV_GROUPS.map((g) => (
              <li key={g.group}>
                <div className="nav-group">{g.group}</div>
                <ol className="nav-sub">
                  {g.items.map((n) => (
                    <li key={n.id}>
                      <a href={`#${n.id}`} data-spy={n.id} className="nav-link">
                        <Icon name={n.icon} className="size-s4" />
                        <span>{n.label}</span>
                        {n.tag ? <span className="nav-tag">{n.tag}</span> : null}
                      </a>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
    </>
  );
}
