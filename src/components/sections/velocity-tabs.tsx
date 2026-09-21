"use client";

import { SubTabs } from "@/components/sub-tabs";
import { VelocityInstrumentsSection } from "@/components/sections/velocity-instruments-section";
import { ExpectationsSection } from "@/components/sections/expectations-section";
import { DraftChartsSection } from "@/components/sections/draft-charts-section";
import { usePerformanceHash, navigatePerformance } from "@/lib/field-velocity/navigation";

export function VelocityTabs({ performance }: { performance: React.ReactNode }) {
  const hash = usePerformanceHash();
  return (
    <SubTabs
      selectedKey={hash === "#draft-charts" ? "draft-charts" : hash === "#expectations" ? "expectations" : "instruments"}
      onSelect={key => navigatePerformance(key === "expectations" ? "expectations" : key === "draft-charts" ? "draft-charts" : "performance_curves")}
      tabs={[
        { key: "instruments", label: "Metrics", node: <VelocityInstrumentsSection performance={performance} /> },
        { key: "expectations", label: "Expectations", node: <ExpectationsSection /> },
        { key: "draft-charts", label: "Draft charts", node: <DraftChartsSection /> },
      ]}
    />
  );
}
