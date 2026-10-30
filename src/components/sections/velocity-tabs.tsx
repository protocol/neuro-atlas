"use client";

import { SubTabs } from "@/components/sub-tabs";
import { ExpectationsSection } from "@/components/sections/expectations-section";
import { MetricsSection, type MetricReferences } from "@/components/sections/metrics-section";
import { usePerformanceHash, navigatePerformance } from "@/lib/field-velocity/navigation";

export function VelocityTabs({ performance, references, engagementPreview }: { performance: React.ReactNode; references?: MetricReferences; engagementPreview?: React.ReactNode }) {
  const hash = usePerformanceHash();
  return <SubTabs selectedKey={hash === "#expectations" ? "expectations" : "instruments"}
    onSelect={key => navigatePerformance(key === "expectations" ? "expectations" : "performance_curves")}
    tabs={[
      { key: "instruments", label: "Metrics", node: <MetricsSection performance={performance} references={references} engagementPreview={engagementPreview} /> },
      { key: "expectations", label: "Expectations", node: <ExpectationsSection /> },
    ]} />;
}
