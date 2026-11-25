"use client";

import { useContext, type ReactNode } from "react";
import { GraphExportContext } from "@/components/graph-export-context";
import { supportsAcquisitionMetrics } from "@/lib/acquisition-metric";
import { chartAxesDescription } from "@/lib/chart-axis-help";
import { ChartExplorationContext } from "@/components/chart-exploration-context";
import { useStandaloneChartSettings } from "@/components/use-standalone-chart-settings";
import { standaloneChartParams } from "@/lib/standalone-chart-state";
import { InlineChartDetail, StandaloneChartSupport } from "@/components/chart-modal-slots";
import { DraftChartMethodology, DraftPanelDetail } from "@/components/draft-chart-panel";
import { DraftChartPlot, DraftEventTimeline } from "@/components/draft-chart-plot";
import { PaceReadings } from "@/components/pace-readings";
import { LatencyEvidenceCard } from "@/components/latency-evidence-card";
import { ParticipantCommitments } from "@/components/participant-commitments";
import { PerformanceCurves } from "@/components/performance-curves";
import { PublicationCharts } from "@/components/publication-charts";
import { GoogleTrends } from "@/components/google-trends";
import { METRIC_CHARTS, METRIC_CHART_EVIDENCE, isVisibleMetric } from "@/data/metric-chart-visibility";
import { type FieldVelocityGraph } from "@/data/field-velocity-links";
import SNAPSHOT from "@/data/field-velocity/neurotech.snapshot.json";
import PROVENANCE from "@/data/field-velocity/neurotech.snapshot.json.provenance.json";
import PUBLICATIONS from "@/data/publications/publication-charts.snapshot.json";
import { parseFeed } from "@/lib/field-velocity/schema";
import { selectPace, selectPerformance } from "@/lib/field-velocity/performance";

const feed = parseFeed(SNAPSHOT);
const pace = selectPace(feed);
const performance = selectPerformance(feed);

function DraftDetail({ entry }: { entry: FieldVelocityGraph }) {
  const { graph, target, title } = entry;
  const plotId = graph.renderer === "draft" ? graph.plot : null;
  for (const chart of METRIC_CHARTS.filter(isVisibleMetric)) {
    const evidence = METRIC_CHART_EVIDENCE[chart.title];
    const plot = plotId ? evidence.plots.find(plot => plot.id === plotId) : undefined;
    const timeline = graph.renderer === "timeline" ? evidence.timeline : undefined;
    if (!plot && !timeline) continue;
    const axes = plot ? chartAxesDescription(plot) : "x-axis: Publication date · y-axis: Reported event stage";
    return <DraftPanelDetail methodology={<DraftChartMethodology alwaysVisible chart={chart}
      summary={plot?.id === "bci-bitrate" ? undefined : evidence.summary} context={evidence.gapReason} axes={axes} />}>
      {plot ? <DraftChartPlot plot={supportsAcquisitionMetrics(plot) || plot.title === title ? plot : { ...plot, title }} shareAnchor={target} />
        : timeline && <DraftEventTimeline timeline={timeline} shareAnchor={target} />}
    </DraftPanelDetail>;
  }
  throw new Error(`Missing plotted evidence for ${entry.slug}`);
}

function SelectedDetail({ entry }: { entry: FieldVelocityGraph }) {
  const exploration = useContext(ChartExplorationContext);
  // #138's hours scenario was already a legacy/component-only view. Keep old
  // enabled links usable, but never replace #140's current default or invent a
  // new scientific fit over its consolidated coverage records.
  if (entry.target === "neural-recording-hours" && exploration?.settings.extrapolate) return <div data-legacy-hours-view>
    <p>Legacy TUSZ corpus-only scenario. Turn Extrapolation off to return to the current recording-hours coverage chart.</p>
    <PerformanceCurves data={performance} provenance={PROVENANCE} selection={[entry.target]} detail flat />
  </div>;
  switch (entry.graph.renderer) {
    case "draft": case "timeline": return <DraftDetail entry={entry} />;
    case "citation": return <PaceReadings data={pace} detail flat />;
    case "latency": return <LatencyEvidenceCard detail />;
    case "participants": return <ParticipantCommitments detail />;
    case "recording": return <PerformanceCurves data={performance} provenance={PROVENANCE} selection={[entry.target]} detail flat />;
    case "publication": return <PublicationCharts snapshot={PUBLICATIONS} detail={entry.target} />;
    case "trends": return <GoogleTrends selection={["neurotech"]} detail />;
  }
}

export function FieldVelocityGraphDetail({ entry, pageHeading }: { entry: FieldVelocityGraph; pageHeading?: ReactNode }) {
  const request = useContext(GraphExportContext);
  const { settings, update } = useStandaloneChartSettings(entry);
  const { graph } = entry;
  // These two established overlays support settled image exports; tissue modes do not.
  const supportsBenchmarkExport = graph.renderer === "draft" && (graph.plot === "public-data-size" || graph.plot === "acquisition-economics");
  return <ChartExplorationContext.Provider value={request ? null : {
    settings, supportsBenchmarkExport, supportsSensoryExport: graph.renderer === "draft" && graph.plot === "bci-bitrate", update,
  }}>
    {pageHeading && <header>{pageHeading}</header>}
    <InlineChartDetail.Provider value><StandaloneChartSupport state={request ? "" : standaloneChartParams(entry, settings).toString()}><SelectedDetail entry={entry} /></StandaloneChartSupport></InlineChartDetail.Provider>
  </ChartExplorationContext.Provider>;
}
