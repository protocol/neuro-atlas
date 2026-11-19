"use client";

import { createContext } from "react";
import type { CardSettings } from "@/lib/dashboard-state";

export type ChartExploration = {
  dashboard: boolean;
  settings: CardSettings;
  update: (settings: Partial<CardSettings>) => void;
  supportsBenchmarkExport?: boolean;
};
export const ChartExplorationContext = createContext<ChartExploration | null>(null);

export function explorationExportReason(exploration: ChartExploration | null): string | undefined {
  if (exploration?.dashboard) return "Chart images are unavailable in comparisons. Copy the dashboard link to share these views.";
  const settings = exploration?.settings;
  if (settings?.hidden?.length || settings?.extrapolate || settings?.sensory || settings?.voxels
    || (settings?.benchmark && !exploration?.supportsBenchmarkExport)) return "Chart images and graph links are unavailable for this exploration. Reset the view or use the dashboard to share it.";
  return undefined;
}
