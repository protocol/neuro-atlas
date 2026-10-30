"use client";

import { useRef, type ReactNode } from "react";
import { ChartModal } from "@/components/chart-modal";
import { DraftChartPlot, DraftEventTimeline } from "@/components/draft-chart-plot";
import { DraftChartShare } from "@/components/draft-chart-share";
import type { DraftChartEvidence, DraftPlot } from "@/lib/draft-chart-types";
import { navigatePerformance, usePerformanceHash } from "@/lib/field-velocity/navigation";

type PanelLocation = { anchor: string; aliases?: readonly string[]; methodology?: ReactNode; previewContext?: ReactNode };

/** The parent owns stable fragment IDs; each alias belongs to exactly one panel. */
function DraftPanel({ anchor, aliases = [], title, preview, previewContext, methodology, children }: PanelLocation & {
  title: string; preview: ReactNode; children: ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const hash = usePerformanceHash().slice(1);
  const open = hash === anchor || aliases.includes(hash);
  return <div className="draft-popout" data-draft-popout={anchor} data-draft-popout-aliases={aliases.join(" ")}>
    <div className="draft-popout-card">
      <div className="draft-popout-preview" aria-hidden="true">{preview}</div>
      {previewContext}
      <button ref={trigger} type="button" className="draft-popout-trigger" data-draft-popout-trigger={anchor}
        aria-label={`Enlarge ${title}`} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => navigatePerformance(anchor)} />
    </div>
    {open && <ChartModal id={`${anchor}-popout`} title={title} returnFocus={trigger}>
      <div className="draft-popout-detail">{children}{methodology}<DraftChartShare anchor={anchor} label={title} /></div>
    </ChartModal>}
  </div>;
}

export function DraftChartPanel({ plot, ...location }: PanelLocation & { plot: DraftPlot }) {
  return <DraftPanel {...location} title={plot.title} preview={<DraftChartPlot plot={plot} preview />}>
    <DraftChartPlot plot={plot} shareAnchor={location.anchor} />
  </DraftPanel>;
}

export function DraftTimelinePanel({ timeline, ...location }: PanelLocation & { timeline: NonNullable<DraftChartEvidence["timeline"]> }) {
  return <DraftPanel {...location} title="Selected application events" preview={<DraftEventTimeline timeline={timeline} preview />}>
    <DraftEventTimeline timeline={timeline} shareAnchor={location.anchor} />
  </DraftPanel>;
}
