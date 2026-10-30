// src/components/sections/nav.ts
import type { IconName } from "@/components/ui/Icon";

export interface NavItem {
  id: string;
  icon: IconName;
  label: string;
  tag?: string;
}

export const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Ringkasan",
    items: [
      { id: "ikhtisar", icon: "overview", label: "Ikhtisar" },
      { id: "revisi", icon: "check", label: "Revisi UTS", tag: "Baru" },
      { id: "identitas", icon: "user", label: "Identitas" },
      { id: "aturan", icon: "rules", label: "Aturan strategi" },
    ],
  },
  {
    group: "Kinerja",
    items: [
      { id: "metrik", icon: "metrics", label: "Metrik" },
      { id: "ekuitas", icon: "equity", label: "Kurva ekuitas" },
      { id: "bulanan", icon: "calendar", label: "Return bulanan" },
      { id: "distribusi", icon: "histogram", label: "Distribusi trade" },
    ],
  },
  {
    group: "Uji validitas",
    items: [
      { id: "validitas-a", icon: "validation", label: "A. Overfitting" },
      { id: "validitas-b", icon: "forward", label: "B. Forward test" },
      { id: "validitas-c", icon: "lookahead", label: "C. Look-ahead" },
      { id: "validitas-d", icon: "execution", label: "D. Eksekusi" },
      { id: "bahaya", icon: "risk", label: "Tanda bahaya" },
    ],
  },
  {
    group: "Catatan",
    items: [
      { id: "log", icon: "tradelog", label: "Log trade" },
      { id: "keterbatasan", icon: "layers", label: "Keterbatasan" },
      { id: "pernyataan", icon: "statement", label: "Pernyataan" },
    ],
  },
];

export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
