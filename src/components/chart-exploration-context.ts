"use client";

import { createContext } from "react";
import type { CardSettings } from "@/lib/dashboard-state";

export type ChartExploration = {
  dashboard: boolean;
  settings: CardSettings;
  update: (settings: Partial<CardSettings>) => void;
};
export const ChartExplorationContext = createContext<ChartExploration | null>(null);

export function explorationExportReason(exploration: ChartExploration | null): string | undefined {
  if (exploration?.dashboard) return "Chart images are unavailable in comparisons. Copy the dashboard link to share these views.";
  if (exploration?.settings.hidden?.length || exploration?.settings.extrapolate) return "Chart images and graph links are unavailable for this exploration. Reset the view or use the dashboard to share it.";
  return undefined;
}
