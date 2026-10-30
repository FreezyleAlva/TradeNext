// src/app/page.tsx
import { LimitationsSection, StatementSection, TradeLogSection } from "@/components/sections/DocsSections";
import { IdentitySection } from "@/components/sections/IdentitySection";
import { MetricsSection } from "@/components/sections/MetricsSection";
import { EquitySection, HistogramSection, MonthlySection } from "@/components/sections/PerformanceSections";
import { Overview, Strip } from "@/components/sections/Overview";
import { RevisionSection } from "@/components/sections/RevisionSection";
import { RulesSection } from "@/components/sections/RulesSection";
import { JumpTo, ScrollSpy } from "@/components/sections/ScrollSpy";
import { SideNav } from "@/components/sections/SideNav";
import { ValidationA } from "@/components/sections/ValidationA";
import { RedFlagsSection, ValidationB, ValidationC, ValidationD } from "@/components/sections/ValidationBCD";
import { loadIdentity, loadResults, loadRevision } from "@/lib/data";

export default function Page() {
  const r = loadResults();
  const id = loadIdentity(r.meta.identity);
  const rev = loadRevision();
  const rf = r.costs.find((c) => c.item.toLowerCase().includes("bebas risiko"));
  return (
    <div className="shell">
      <SideNav meta={r.meta} id={id} revisedAt={rev.generated_at} />
      <div className="content">
        <div className="crumbs">
          <ScrollSpy />
          <JumpTo />
        </div>
        <Strip r={r} rev={rev} />
        <main className="main-col">
          <Overview r={r} rev={rev} />
          <RevisionSection rev={rev} meta={r.meta} main={r.main} />
          <IdentitySection id={id} meta={r.meta} rules={r.rules} />
          <RulesSection rules={r.rules} meta={r.meta} costs={r.costs} />
          <MetricsSection s={r.main.summary_full} benchmarks={r.main.benchmarks} rfNote={rf ? `Suku bunga bebas risiko: ${rf.value}. ${rf.detail}` : undefined} />
          <EquitySection main={r.main} />
          <MonthlySection main={r.main} />
          <HistogramSection main={r.main} />
          <ValidationA v={r.validation} main={r.main} />
          <ValidationB f={r.forward} meta={r.meta} />
          <ValidationC v={r.validation} main={r.main} />
          <ValidationD v={r.validation} main={r.main} />
          <RedFlagsSection v={r.validation} />
          <TradeLogSection main={r.main} forwardTrades={r.forward.trades} forwardOpen={r.forward.open_positions} />
          <LimitationsSection docs={r.docs} />
          <StatementSection docs={r.docs} id={id} meta={r.meta} />
          <footer className="px-s2 text-xs text-ink-4">Semua angka dibaca dari data/results.json ({r.meta.generated_at}) dan data/revision.json ({rev.generated_at}) saat build. Ikon PNG buatan sendiri.</footer>
        </main>
      </div>
    </div>
  );
}
