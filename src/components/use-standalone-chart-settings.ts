"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { ChartExplorationSettings } from "@/components/chart-exploration-context";
import type { FieldVelocityGraph } from "@/data/field-velocity-links";
import { readStandaloneChartSettings, updateStandaloneChartUrl } from "@/lib/standalone-chart-state";

const events = ["popstate", "hashchange", "atlas-performance-location"];
function subscribe(callback: () => void) {
  events.forEach(event => window.addEventListener(event, callback));
  return () => events.forEach(event => window.removeEventListener(event, callback));
}
const snapshot = () => window.location.href;
const serverSnapshot = () => "";

export function useStandaloneChartSettings(entry: FieldVelocityGraph) {
  const href = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const settings = useMemo(() => href ? readStandaloneChartSettings(new URL(href), entry) : {}, [href, entry]);
  function update(change: Partial<ChartExplorationSettings>) {
    const current = new URL(window.location.href);
    const next = updateStandaloneChartUrl(current, entry, change);
    if (next.href === current.href) return;
    // Native history integrates with Next without navigation, scroll, or focus changes.
    // Keep router metadata and the overview-return ticket owned by the current entry.
    window.history.pushState(window.history.state, "", next);
    window.dispatchEvent(new Event("atlas-performance-location"));
  }
  return { settings, update };
}
