"use client";

import { ChartExplorationContext, type ChartExploration } from "@/components/chart-exploration-context";
import { InlineChartDetail } from "@/components/chart-modal-slots";
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
    const axes = plot ? `x-axis: ${plot.xLabel} · y-axis: ${plot.yLabel}` : "x-axis: Publication date · y-axis: Reported event stage";
    return <DraftPanelDetail methodology={<>
      <p className="draft-chart-summary">{evidence.summary}</p>
      <DraftChartMethodology chart={chart} context={evidence.gapReason} axes={axes} />
    </>}>
      {plot ? <DraftChartPlot plot={plot.title === title ? plot : { ...plot, title }} shareAnchor={target} />
        : timeline && <DraftEventTimeline timeline={timeline} shareAnchor={target} />}
    </DraftPanelDetail>;
  }
  throw new Error(`Missing plotted evidence for ${entry.slug}`);
}

function SelectedDetail({ entry }: { entry: FieldVelocityGraph }) {
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

export function FieldVelocityGraphDetail({ entry, instance }: { entry: FieldVelocityGraph; instance?: ChartExploration }) {
  return <ChartExplorationContext.Provider value={instance ?? null}>
    <InlineChartDetail.Provider value><div className="pc-detail graph-detail"><SelectedDetail entry={entry} /></div></InlineChartDetail.Provider>
  </ChartExplorationContext.Provider>;
}
