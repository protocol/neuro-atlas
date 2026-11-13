"use client";

import { SubTabs } from "@/components/sub-tabs";
import { ExpectationsSection } from "@/components/sections/expectations-section";
import { MetricsSection, type MetricReferences } from "@/components/sections/metrics-section";
import { usePerformanceHash, navigatePerformance } from "@/lib/field-velocity/navigation";

export function VelocityTabs({ performance, references, engagementPreview }: { performance: React.ReactNode; references?: MetricReferences; engagementPreview?: React.ReactNode }) {
  const hash = usePerformanceHash();
  const selected = hash === "#inflection-points" ? "expectations" : "instruments";
  // The wrapper only lets Metrics lay its toolbar beside the tab rail (see draft-chart-plot.css).
  return <div className="velocity-tabs" data-velocity-tab={selected}><SubTabs selectedKey={selected}
    onSelect={key => navigatePerformance(key === "expectations" ? "expectations" : "performance_curves")}
    tabs={[
      { key: "instruments", label: "Metrics", node: <MetricsSection performance={performance} references={references} engagementPreview={engagementPreview} /> },
      { key: "expectations", label: "Inflection points", node: <ExpectationsSection /> },
    ]} /></div>;
}
