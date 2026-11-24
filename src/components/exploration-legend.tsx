"use client";
import type { ReactNode } from "react";
import { ChartControls, useChartPlate } from "@/components/chart-plate";

export function SeriesButton({ id, visible, toggle, children }: { id: string; visible: boolean; toggle: () => void; children: ReactNode }) {
  const plate = useChartPlate();
  const control = <button className="exploration-pill exploration-series" type="button" data-exploration-series={id} aria-pressed={visible} onClick={toggle}>
    {children}{!visible && <small aria-hidden="true">Hidden</small>}
  </button>;
  return plate ? <><span className="chart-plate-series" data-visible={visible}>{children}{!visible && <small>Hidden</small>}</span><ChartControls>{control}</ChartControls></> : control;
}
export function EmptySeries({ reset }: { reset: () => void }) {
  return <div className="exploration-empty" data-exploration-empty><p role="status">All series are hidden.</p>
    <ChartControls><button className="exploration-pill" type="button" data-exploration-reset onClick={reset}>Show all series</button></ChartControls>
  </div>;
}
export function toggleSeries(hidden: readonly string[], id: string) {
  return hidden.includes(id) ? hidden.filter(key => key !== id) : [...hidden, id];
}
