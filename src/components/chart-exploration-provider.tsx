"use client";

import type { ReactNode } from "react";
import type { FieldVelocityGraph } from "@/data/field-velocity-links";
import { ChartExplorationContext } from "@/components/chart-exploration-context";
import { useStandaloneChartSettings } from "@/components/use-standalone-chart-settings";
import { standaloneChartParams } from "@/lib/standalone-chart-state";

/** The same bounded scientific view powers an overview dialog and its shared page. */
export function ChartExplorationProvider({ entry, children }: { entry: FieldVelocityGraph; children: ReactNode }) {
  const { settings, update } = useStandaloneChartSettings(entry);
  const { graph } = entry;
  return <ChartExplorationContext.Provider value={{ settings, update,
    supportsBenchmarkExport: graph.renderer === "draft" && (graph.plot === "public-data-size" || graph.plot === "acquisition-economics"),
    supportsSensoryExport: graph.renderer === "draft" && graph.plot === "bci-bitrate",
  }}><div data-chart-state={standaloneChartParams(entry, settings).toString()}>{children}</div></ChartExplorationContext.Provider>;
}
