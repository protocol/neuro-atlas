"use client";
import type { ReactNode } from "react";
import { ChartControls, useChartPlate } from "@/components/chart-plate";

export function SeriesButton({ id, visible, toggle, children }: { id: string; visible: boolean; toggle: () => void; children: ReactNode }) {
  const plate = useChartPlate();
  return <button className={plate ? "chart-plate-series" : "exploration-pill exploration-series"} type="button" data-exploration-series={id} aria-pressed={visible} onClick={toggle}>
    {children}{!visible && <small aria-hidden="true">Hidden</small>}
  </button>;
}
export function EmptySeries({ reset }: { reset: () => void }) {
  return <div className="exploration-empty" data-exploration-empty><p role="status">All series are hidden.</p>
    <ChartControls><button className="exploration-pill" type="button" data-exploration-reset onClick={reset}>Show all series</button></ChartControls>
  </div>;
}
export function toggleSeries(hidden: readonly string[], id: string) {
  return hidden.includes(id) ? hidden.filter(key => key !== id) : [...hidden, id];
}
