"use client";

import { createContext, useContext, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { fieldVelocityGraph, graphPath } from "@/data/field-velocity-links";
import { atlasPath } from "@/lib/atlas-path";
import { chartShareUrl } from "@/lib/chart-export";
import { EXPORT_BLUE } from "@/lib/chart-export-brand";

const PlateContext = createContext<{ controls: HTMLDivElement | null; setTitle: (title: string) => void } | null>(null);
export const useChartPlate = () => useContext(PlateContext);
function subscribe(callback: () => void) {
  const events = ["popstate", "hashchange", "atlas-performance-location"];
  events.forEach(event => window.addEventListener(event, callback));
  return () => events.forEach(event => window.removeEventListener(event, callback));
}

/** Live DOM, never a screenshot/image surrogate. Shared by every detail renderer. */
export function ChartPlate({ anchor, title, children }: { anchor: string; title: string; children: ReactNode }) {
  const [controls, setControls] = useState<HTMLDivElement | null>(null);
  const [liveTitle, setTitle] = useState(title);
  const current = useSyncExternalStore(subscribe, () => window.location.href, () => "");
  const entry = fieldVelocityGraph(anchor);
  const href = current ? chartShareUrl(current, anchor) : entry ? atlasPath(graphPath(entry)) : atlasPath("/field-velocity");
  return <PlateContext.Provider value={{ controls, setTitle }}>
    <div className="chart-workspace">
      <div className="chart-plate-controls" ref={setControls} data-chart-plate-controls />
      <section className="chart-plate" data-chart-plate style={{ "--chart-signature": EXPORT_BLUE } as CSSProperties} aria-label={`${liveTitle} chart plate`}>
        <header className="chart-plate-header">
          <span className="chart-plate-brand" data-chart-plate-brand>Neuro Atlas</span>
          <h2 className="chart-plate-title" data-chart-plate-title>{liveTitle}</h2>
        </header>
        <div className="chart-plate-body">{children}</div>
        <footer className="chart-plate-footer"><a href={href} target="_blank" rel="noreferrer">Neuro Atlas · chart sources ↗</a><span>Source evidence and methods below</span></footer>
      </section>
    </div>
  </PlateContext.Provider>;
}

/** Editing stays adjacent to, but outside, the screenshot boundary. Inline in legacy embeds. */
export function ChartControls({ children }: { children: ReactNode }) {
  const plate = useChartPlate();
  return plate?.controls ? createPortal(children, plate.controls) : <>{children}</>;
}

/** The compact card keeps its plot space; it does not squeeze in an export footer. */
export function ChartPreviewBrand() {
  return <span className="chart-preview-brand" data-chart-preview-brand>Neuro Atlas</span>;
}
