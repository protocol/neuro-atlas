"use client";

import { createContext } from "react";

export type ChartExplorationSettings = {
  hidden?: string[];
  extrapolate?: boolean;
  sensory?: boolean;
  benchmark?: boolean;
  voxels?: boolean;
  growthBaseline?: "science" | "matched";
};

export type ChartExploration = {
  settings: ChartExplorationSettings;
  update: (settings: Partial<ChartExplorationSettings>) => void;
  supportsBenchmarkExport?: boolean;
};
export const ChartExplorationContext = createContext<ChartExploration | null>(null);

export function explorationExportReason(exploration: ChartExploration | null): string | undefined {
  const settings = exploration?.settings;
  if (settings?.hidden?.length || settings?.extrapolate || settings?.sensory || settings?.voxels
    || (settings?.benchmark && !exploration?.supportsBenchmarkExport)) return "Chart images are unavailable for this exploration. Use Copy link to share this view, or reset the view to export an image.";
  return undefined;
}
