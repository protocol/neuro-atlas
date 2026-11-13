"use client";

import { useSyncExternalStore } from "react";
import { canonicalPerformanceAnchor } from "@/data/field-velocity-links";
import { whenChartRegistered } from "@/lib/chart-export-api";
import type { ChartExport } from "@/lib/chart-export";

/**
 * Card-level PNG export. A card asks for its full chart to mount off-screen
 * (the same component tree its pop-out renders, never a second renderer),
 * waits for that chart's share control to register, builds the image, then
 * unmounts it again. Nothing is shown and the URL hash is not touched.
 */
const exporting = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function useCardExporting(anchor: string) {
  const slug = canonicalPerformanceAnchor(anchor);
  return useSyncExternalStore(subscribe, () => exporting.has(slug), () => false);
}

export async function withCardExport<T>(anchor: string, run: (getChart: () => ChartExport) => T | Promise<T>): Promise<T> {
  const slug = canonicalPerformanceAnchor(anchor);
  exporting.add(slug);
  emit();
  try {
    const registration = await whenChartRegistered(slug);
    if (!registration) throw new Error(`Chart "${slug}" did not mount for export`);
    return await run(registration.getChart);
  } finally {
    exporting.delete(slug);
    emit();
  }
}
