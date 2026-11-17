import { DRAFT_CHARTS, type DraftChart } from "./draft-charts";
import { DRAFT_CHART_EVIDENCE } from "./draft-chart-observations";
import { BCI_BITRATE_CHART, BCI_BITRATE_EVIDENCE } from "./bci-bitrate";
import { fitHistoricalLog, historicalFitNote } from "@/lib/historical-log-fit";
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
  scope: "Selected reported recording durations, dated by release, publication or disclosure; acquisition timing may differ. Releases overlap within datasets, while modalities and reused training corpora retain separate identities.",
  seriesNote: recordingHours.plots.map(plot => `${plot.title}: ${plot.scope}`).join("\n\n"),
  points: recordingHours.plots.flatMap((plot, index) => plot.points.map(point => ({
    ...point, group: point.group ?? plot.title, color: recordingColors[index],
  }))),
  // Successive releases of the same corpus; overlapping releases are not additive.
  connections: [{ id: "tusz-releases", label: "TUSZ releases (overlapping, not summed)", pointIds: recordingHours.plots.find(plot => plot.id === "tusz-scalp-eeg")!.points.map(point => point.id) }],
  legend: recordingHours.plots.map((plot, index) => ({ label: plot.title, color: recordingColors[index] })),
};

// Keep the source archive in $/voxel; this selected view restores Table A1 voxels/$.
const acquisitionSource = DRAFT_CHART_EVIDENCE["Connectomics imaging throughput over time"].plots.find(plot => plot.id === "acquisition-economics")!;
const expansionIds = ["exm2015", "exllsm2019", "exaspim2023", "exaspim2024"];
const emIds = ["sem2018", "multisem506", "multisem706", "bdtem2024"];
const acquisitionPoints = acquisitionSource.points.map(point => ({
  ...point, y: 1 / point.y,
  group: expansionIds.includes(point.id) ? "Expansion microscopy" : point.id === "mesospim2024" ? "mesoSPIM · optical" : point.group,
  marker: point.id === "peem2024" ? "triangle" as const : point.id === "mesospim2024" ? "diamond" as const : "circle" as const,
  color: point.id === "mesospim2024" ? "#238e91" : point.color,
  dateLabel: `${point.x} · year as printed in Table A1`,
  exportAnnotation: `${point.label} · ≈${(1 / point.y).toExponential(1).replace("e+", "e")} vox/$${point.id === "peem2024" ? " · prospective" : ""}`,
  note: point.note?.replace(/Display transformation:.*$/, "Display uses the published Table A1 Approx. Voxels/$ column; heterogeneous sampling and cost scopes.")
    .replace(/(Approx\. Voxels\/\$ = )(\d+)/, (_, label, value) => `${label}${Number(value).toLocaleString("en-US")}`)
    .replace("Verbatim numeric column transcription; not recomputed from cost/hour and throughput. Acquisition economics.", "Published Table A1 efficiency.")
    .replace("Not verified all-in tissue preparation, reconstruction, storage or proofreading cost.", "Coverage of tissue preparation, reconstruction, storage and proofreading costs is unverified.")
    .replace("Published technology; cost/throughput are crowdsourced estimates, not project accounting.", "Cost and throughput are crowdsourced estimates."),
}));
acquisitionPoints.push({
  ...acquisitionPoints.find(point => point.id === "exaspim2023")!,
  id: "exaspim2024", x: 2024, y: 1e11,
  label: "ExA-SPIM 2024 · author estimate", annotation: "ExA-SPIM 2024 · author estimate",
  exportAnnotation: "ExA-SPIM 2024 · ≈1e11 vox/$ · author estimate; citation mismatch",
  dateLabel: "2024 · year as printed in Table A1",
  note: "Table A1 row 2: ExA-SPIM; Approx. Voxels/$ = 100,000,000,000. Rough order-of-magnitude author estimate. Citation mismatch: reference 54 is Day et al. (2024), HiExM, rather than ExA-SPIM. Independent ExA-SPIM throughput and this cost configuration are unverified. Included as the authors’ estimate, with the mismatch disclosed.",
});
export const ACQUISITION_FITS = [expansionIds, emIds].map(ids => fitHistoricalLog(ids.map(id => acquisitionPoints.find(p => p.id === id)!))!);
const acquisitionEconomics: DraftPlot = {
  ...acquisitionSource,
  title: "Estimated acquisition efficiency — voxels per dollar",
  previewTitle: "Imaging efficiency",
  previewYLabel: "≈ voxels/$ · log",
  yLabel: "Approx. voxels/$ (log)", valueSignificantDigits: 3,
  scope: "Rough order-of-magnitude author estimates at heterogeneous resolutions, labeling and biological scopes. Acquisition-only cost coverage is unspecified; cross-method performance equivalence is unverified. PEEM is prospective. ExA-SPIM 2024 is an author estimate with a citation mismatch.",
  seriesNote: "Table A1 Approx. Voxels/$ values, rather than digitized Figure 2 marks or throughput/hour divided by cost/hour. Figure 2 has TEMCA-GridTape without an exact table row, omits mesoSPIM, and differs for MultiSEM 706. mesoSPIM stays separate from expansion microscopy. PEEM is excluded from the historical EM fit.",
  points: acquisitionPoints,
  exportPointKey: true, exportPointKeyNote: "All efficiencies ≈ author estimates; heterogeneous resolution and cost scope. PEEM prospective; ExA-SPIM 2024 citation mismatch.",
  legend: [
    {label: "Expansion microscopy · estimates", color: "#9275ca"},
    {label: "EM · reported-tech estimates", color: "#cd732f"},
    {label: "mesoSPIM · optical", color: "#238e91", marker: "diamond"},
    {label: "PEEM · prospective", color: "#cd732f", marker: "triangle"},
  ],
  referenceTrendlines: ACQUISITION_FITS.map((fit, i) => ({
    id: i ? "em" : "expansion", fit,
    label: `${i ? "EM" : "Expansion"} fit · doubling ≈${fit.doublingYears!.toFixed(1)} y`,
    directLabel: `${i ? "EM" : "ExM"} · 2×/${fit.doublingYears!.toFixed(1)}y`,
    color: i ? "#cd732f" : "#9275ca", points: fit.points,
    note: `${historicalFitNote(fit)} Source: arXiv:2603.25713v1 Table A1 (p. 18). ${i ? "PEEM excluded as prospective; heterogeneous reported-tech estimates." : "ExA-SPIM 2024 author estimate included; reference 54 cites HiExM (citation mismatch). mesoSPIM excluded from expansion family."}`,
    methodologyUrl: "https://arxiv.org/pdf/2603.25713v1", methodologyLabel: "Source table ↗",
  })),
};
const costEfficiency: DraftChart = {
  category: "Cost and automation",
  title: "Connectomics imaging cost efficiency",
  axes: `${acquisitionEconomics.xLabel} · ${acquisitionEconomics.yLabel}`,
  definition: "Source-estimated voxels acquired per dollar at each protocol's stated resolution and scope.",
  constraint: acquisitionEconomics.scope,
};
export const METRIC_CHARTS: readonly DraftChart[] = [...DRAFT_CHARTS, costEfficiency, BCI_BITRATE_CHART];

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
    plots: evidence === recordingHours ? [recordingHoursPlot] : evidence.plots.filter(plot => !RETIRED_METRIC_PLOT_IDS.has(plot.id) && plot.id !== "acquisition-economics").map(plot => plot.id === "neuralink-cumulative" ? {
      ...plot,
      // The source names these company checkpoints as cumulative recipients.
      // BrainGate and Paradromics are different cohorts and remain unconnected.
      connections: [{ id: "neuralink-recipients", label: "Neuralink cumulative recipients", pointIds: plot.points.filter(point => point.group === "Neuralink").map(point => point.id) }],
    } : plot),
    ...(title === "Connectomics imaging throughput over time" ? {
      summary: "Selected source-reported EM acquisition rates at each protocol's stated resolution.",
    } : {}),
    ...(title === "Humans with implanted high-bandwidth BCIs over time" ? {
      summary: "Selected chronic intracortical research cohorts, shown as separate program checkpoints.",
    } : {}),
  }]).concat([[costEfficiency.title, {
    status: "plotted",
    summary: "Source-estimated acquisition efficiency with separate descriptive method-family fits.",
    plots: [acquisitionEconomics],
  }], [BCI_BITRATE_CHART.title, BCI_BITRATE_EVIDENCE]]),
);

export function isVisibleMetric(chart: DraftChart) {
  const evidence = METRIC_CHART_EVIDENCE[chart.title];
  return evidence.status === "plotted" && (evidence.plots.length > 0 || !!evidence.timeline);
}
// Retain the existing category DOM IDs while changing reader-facing order and grouping.
export const METRIC_GROUPS: readonly { id: number; name: string; categories: readonly string[]; preview: string | null; summary: string }[] = [
  { id: 6, name: "Neurotech field engagement", categories: [], preview: null, summary: "Pace, public attention and revealed commitments." },
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
