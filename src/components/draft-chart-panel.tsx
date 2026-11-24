"use client";

import { ChartPreviewBrand } from "@/components/chart-plate";
import { useGraphHref } from "@/components/field-velocity-route-context";
import type { DraftChart } from "@/data/draft-charts";
import { canonicalPerformanceAnchor } from "@/data/field-velocity-links";

import { useRef, type ReactNode } from "react";
import { ChartModal } from "@/components/chart-modal";
import { DraftChartPlot, DraftEventTimeline } from "@/components/draft-chart-plot";
import type { DraftChartEvidence, DraftPlot } from "@/lib/draft-chart-types";
import { ACQUISITION_CHART_TITLE, supportsAcquisitionMetrics } from "@/lib/acquisition-metric";
import { navigatePerformance, usePerformanceHash } from "@/lib/field-velocity/navigation";
import { useCardExporting } from "@/lib/field-velocity/card-export";
import { ModalReading } from "@/components/chart-modal-slots";

type PanelLocation = { anchor: string; aliases?: readonly string[]; methodology?: ReactNode; previewContext?: ReactNode };

/** The parent owns stable fragment IDs; each alias belongs to exactly one panel. */
function DraftPanel({ anchor, aliases = [], title, preview, previewContext, methodology, children }: PanelLocation & {
  title: string; preview: ReactNode; children: ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const hash = usePerformanceHash().slice(1);
  const href = useGraphHref(anchor);
  const open = !href && [anchor, ...aliases].some(id => hash === canonicalPerformanceAnchor(id));
  const exporting = useCardExporting(anchor);
  return <div className="draft-popout" data-draft-popout={anchor} data-draft-popout-aliases={aliases.join(" ")}>
    <div className="draft-popout-card" data-metric-card-body>
      <ChartPreviewBrand />
      <div className="draft-popout-preview" aria-hidden="true">{preview}</div>
      {previewContext}
      {href ? <a href={href} data-graph-link={anchor} className="draft-popout-trigger" data-draft-popout-trigger={anchor} aria-label={`Enlarge ${title}`} />
        : <button ref={trigger} type="button" className="draft-popout-trigger" data-draft-popout-trigger={anchor}
        aria-label={`Enlarge ${title}`} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => navigatePerformance(anchor)} />}
    </div>
    {(open || (!href && exporting)) && <ChartModal id={`${anchor}-popout`} title={title} returnFocus={trigger} offscreen={!open}>
      <DraftPanelDetail methodology={methodology}>{children}</DraftPanelDetail>
    </ChartModal>}
  </div>;
}

export function DraftChartPanel({ plot, ...location }: PanelLocation & { plot: DraftPlot }) {
  return <DraftPanel {...location} title={supportsAcquisitionMetrics(plot) ? ACQUISITION_CHART_TITLE : plot.title} preview={<DraftChartPlot plot={plot} preview />}>
    <DraftChartPlot plot={plot} shareAnchor={location.anchor} />
  </DraftPanel>;
}

export function DraftTimelinePanel({ timeline, ...location }: PanelLocation & { timeline: NonNullable<DraftChartEvidence["timeline"]> }) {
  return <DraftPanel {...location} title="Selected application events" preview={<DraftEventTimeline timeline={timeline} preview />}>
    <DraftEventTimeline timeline={timeline} shareAnchor={location.anchor} />
  </DraftPanel>;
}

export function DraftPanelDetail({ children, methodology }: { children: ReactNode; methodology?: ReactNode }) {
  return <div className="draft-popout-detail">{children}{methodology && <ModalReading>{methodology}</ModalReading>}</div>;
}

export function DraftChartMethodology({ chart, context, axes, alwaysVisible = false, summary }: { chart: DraftChart; context?: string; axes?: string; alwaysVisible?: boolean; summary?: string }) {
  const content = <>
    {summary && <p className="draft-chart-summary">{summary}</p>}
    <dl>
      <div><dt>Axes</dt><dd>{axes ?? chart.axes}</dd></div>
      <div><dt>Definition</dt><dd>{chart.definition}</dd></div>
      <div><dt>Comparability condition</dt><dd>{chart.constraint}</dd></div>
      {context && <div data-draft-context><dt>Context</dt><dd>{context}</dd></div>}
    </dl>
  </>;
  if (alwaysVisible) return <section className="draft-chart-methodology" data-draft-methodology aria-label="Definition and comparability">
    <h3 className="mx-k">Definition and comparability</h3>
    {content}
  </section>;
  return <details className="draft-chart-methodology" data-draft-methodology>
    <summary>Definition and comparability</summary>
    {content}
  </details>;
}
