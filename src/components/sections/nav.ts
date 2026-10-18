// src/components/sections/nav.ts
import type { IconName } from "@/components/ui/Icon";

export const NAV: { id: string; icon: IconName; label: string }[] = [
  { id: "identitas", icon: "user", label: "Identitas" },
  { id: "aturan", icon: "rules", label: "Aturan strategi" },
  { id: "metrik", icon: "metrics", label: "Metrik" },
  { id: "ekuitas", icon: "equity", label: "Kurva ekuitas" },
  { id: "bulanan", icon: "calendar", label: "Return bulanan" },
  { id: "distribusi", icon: "histogram", label: "Distribusi trade" },
  { id: "validitas-a", icon: "validation", label: "A. Overfitting" },
  { id: "validitas-b", icon: "forward", label: "B. Forward test" },
  { id: "validitas-c", icon: "lookahead", label: "C. Look-ahead" },
  { id: "validitas-d", icon: "execution", label: "D. Eksekusi" },
  { id: "bahaya", icon: "risk", label: "Tanda bahaya" },
  { id: "log", icon: "tradelog", label: "Log trade" },
  { id: "keterbatasan", icon: "layers", label: "Keterbatasan" },
  { id: "pernyataan", icon: "statement", label: "Pernyataan" },
];
