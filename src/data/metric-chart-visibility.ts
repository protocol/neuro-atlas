import { DRAFT_CHARTS, type DraftChart } from "./draft-charts";
import { DRAFT_CHART_EVIDENCE } from "./draft-chart-observations";
import type { DraftChartEvidence, DraftPlot } from "@/lib/draft-chart-types";

// Shared axes change presentation, not source records, dates or measured values.
const recordingHours = DRAFT_CHART_EVIDENCE["Neural recording hours collected over time"];
const recordingColors = ["#9275ca", "#238e91", "#cd732f", "#647d3d", "#cb6285"];
const recordingHoursPlot: DraftPlot = {
  id: "recording-hours", // Internal presentation identity; all dataset links remain aliases.
  title: "Neural recording hours — selected datasets",
  xLabel: "Release / publication / disclosure year",
  xKind: "year",
  yLabel: "Recording hours",
  scale: "log",
  scope: "Reported recording hours, not a unique global total or independently recomputed QC-valid subject-hours. Release, publication and disclosure dates are distinct from acquisition dates. No sums across overlapping releases, datasets, modalities or model reuse; no pooled fit or connecting lines.",
  seriesNote: recordingHours.plots.map(plot => `${plot.title}: ${plot.scope}`).join("\n\n"),
  points: recordingHours.plots.flatMap((plot, index) => plot.points.map(point => ({
    ...point, group: point.group ?? plot.title, color: recordingColors[index],
  }))),
  legend: recordingHours.plots.map((plot, index) => ({ label: plot.title, color: recordingColors[index] })),
};

// A separate acquisition-cost reading, not the unsupported end-to-end mapping-cost proposal.
const acquisitionEconomics = DRAFT_CHART_EVIDENCE["Connectomics imaging throughput over time"].plots.find(plot => plot.id === "acquisition-economics")!;
const costEfficiency: DraftChart = {
  category: "Cost and automation",
  title: "Connectomics imaging cost efficiency",
  axes: `${acquisitionEconomics.xLabel} · ${acquisitionEconomics.yLabel}`,
  definition: "Compare source-estimated acquisition costs per voxel at each stated resolution and protocol.",
  constraint: acquisitionEconomics.scope,
};
export const METRIC_CHARTS: readonly DraftChart[] = [...DRAFT_CHARTS, costEfficiency];

/** Presentation retirement only. Original evidence and stable URL identities remain intact. */
export const RETIRED_METRIC_PLOT_IDS: ReadonlySet<string> = new Set([
  "gauss-section-rejection",
  "microns-section-loss",
  "precision-temporary-recording",
  "paired-auto",
  "comparative-specimens",
]);

export const METRIC_CHART_EVIDENCE: Record<string, DraftChartEvidence> = Object.fromEntries(
  Object.entries(DRAFT_CHART_EVIDENCE).map(([title, evidence]) => [title, {
    ...evidence,
    plots: evidence === recordingHours ? [recordingHoursPlot] : evidence.plots.filter(plot => !RETIRED_METRIC_PLOT_IDS.has(plot.id) && plot.id !== "acquisition-economics"),
    ...(title === "Connectomics imaging throughput over time" ? {
      summary: "Selected source-reported EM acquisition rates. Protocols and resolutions differ; these are not a like-for-like throughput frontier.",
    } : {}),
    ...(title === "Humans with implanted high-bandwidth BCIs over time" ? {
      summary: "Selected chronic intracortical research cohorts. Named program checkpoints are not additive or a current global installed base.",
    } : {}),
  }]).concat([[costEfficiency.title, {
    status: "plotted",
    summary: "Source-estimated acquisition costs, not all-in mapping costs. Preserve each protocol's resolution and scope; no fitted frontier.",
    plots: [acquisitionEconomics],
  }]]),
);

export function isVisibleMetric(chart: DraftChart) {
  const evidence = METRIC_CHART_EVIDENCE[chart.title];
  return evidence.status === "plotted" && (evidence.plots.length > 0 || !!evidence.timeline);
}
// Retain the existing category DOM IDs while changing reader-facing order and grouping.
export const METRIC_GROUPS: readonly { id: number; name: string; categories: readonly string[]; preview: string | null; summary: string }[] = [
  { id: 6, name: "Neurotech Engagement", categories: [], preview: null, summary: "Pace, public attention and revealed commitments." },
  { id: 3, name: "Human interfaces and recordings", categories: ["Human interfaces and recordings"], preview: "Neural recording hours collected over time", summary: "Implanted interfaces, recording capability and neural data supply." },
  { id: 0, name: "Mapping Scale", categories: ["Mapping scale", "Data access and scientific use", "Tissue quality and annotation"], preview: "Open-access connectomics data over time", summary: "Mapped tissue, connectome size, acquisition throughput, paired datasets and open data." },
  { id: 1, name: "Cost and automation", categories: ["Cost and automation"], preview: "Connectomics imaging cost efficiency", summary: "Acquisition cost estimates, reconstruction quality and proofreading effort." },
  { id: 5, name: "Simulation and NeuroAI", categories: ["Simulation, NeuroAI, and impact"], preview: "NeuroAI performance–cost frontier over time", summary: "Model fidelity, NeuroAI and demonstrated applications." },
];
export const METRIC_CHART_CATEGORIES = METRIC_GROUPS.filter(group => group.preview).map(group => group.name);

/** Includes retired definitions, whose links still reveal a meaningful group. */
export function metricCategoryFor(chart: DraftChart) {
  return METRIC_GROUPS.find(group => group.categories.includes(chart.category))?.name ?? "Mapping Scale";
}
