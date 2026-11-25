/** Explicit public URL contract. Slugs follow current rendered titles, never runtime copy.
 * Internal record, DOM and evidence IDs remain unchanged. Add aliases when renaming a URL.
 * Retired proposals land on their current category, without restoring archived charts.
 */
type GraphRenderer = { renderer: "draft"; plot: string } | { renderer: "timeline" | "citation" | "latency" | "participants" | "publication" | "trends" | "recording" };
export type GraphDefinition = GraphRenderer & { group: 0 | 1 | 3 | 5 | 6; description: string };

type FieldVelocityLink = {
  slug: string;
  title: string;
  target: string;
  kind: "tab" | "chart" | "category";
  aliases: readonly string[];
  fallback?: string;
  graph?: GraphDefinition;
};
// Both historically published prefixes are compatibility identities, not slug generation.
const metricAliases = (...ids: string[]) => ids.flatMap(id => [id, id.replace(/^draft-/, "metric-")]);
export const FIELD_VELOCITY_LINKS: readonly FieldVelocityLink[] = [
  { slug: "metrics", title: "Metrics", target: "performance_curves", kind: "tab", aliases: ["performance_curves", "draft-charts"] },
  { slug: "inflection-points", title: "Inflection points", target: "expectations", kind: "tab", aliases: ["expectations"] },
  { slug: "citation-latency", title: "Citation latency", target: "idea_vintage", kind: "chart", graph: { group: 6, renderer: "citation", description: "Median age of references cited by neurotechnology papers." }, aliases: ["idea_vintage"] },
  { slug: "latency-compression", title: "Latency compression", target: "latency_compression", kind: "chart", graph: { group: 6, renderer: "latency", description: "Intervals from selected public preclinical reports to documented human milestones." }, aliases: ["latency_compression"] },
  { slug: "implanted-bci-participants-over-time", title: "Implanted BCI participants over time", target: "revealed_commitments", kind: "chart", graph: { group: 6, renderer: "participants", description: "Reported assistive implanted-BCI recipients, grouped by review, company or program." }, aliases: ["revealed_commitments"] },
  { slug: "neurotech-papers-per-year", title: "Neurotech papers per year", target: "publication-output", kind: "chart", graph: { group: 6, renderer: "publication", description: "Annual neurotechnology paper counts alongside an all-science comparison index." }, aliases: ["publication-output"] },
  { slug: "publication-growth-by-group", title: "Publication growth by group", target: "publication-growth", kind: "chart", graph: { group: 6, renderer: "publication", description: "Publication growth across groups, with reference comparisons." }, aliases: ["publication-growth"] },
  { slug: "researchers-by-publication-sector", title: "Researchers by publication sector", target: "researcher-sectors", kind: "chart", graph: { group: 6, renderer: "publication", description: "Researcher affiliation sectors in selected OpenAlex publications." }, aliases: ["researcher-sectors"] },
  { slug: "researchers-first-and-latest-affiliations", title: "Researchers’ first and latest affiliations", target: "researcher-sector-changes", kind: "chart", graph: { group: 6, renderer: "publication", description: "First and latest affiliation sectors for the selected researcher cohort." }, aliases: ["researcher-sector-changes"] },
  { slug: "neurotech-search-terms", title: "Neurotech search terms", target: "google-trends-neurotech", kind: "chart", graph: { group: 6, renderer: "trends", description: "Worldwide Google Trends search interest in neurotechnology and brain-computer interface." }, aliases: ["google-trends-neurotech"] },
  // Brand context is no longer mounted in Field velocity; keep a category fallback there.
  { slug: "neuralink-brand-context", title: "Neuralink · brand context", target: "google-trends-neuralink", kind: "chart", aliases: ["google-trends-neuralink"], fallback: "metric-category-6-toggle" },
  { slug: "simultaneous-neural-recordings", title: "Simultaneous neural recordings", target: "simultaneously-recorded-neurons", kind: "chart", graph: { group: 3, renderer: "recording", description: "Historical electrical recordings and selected modern electrical, implant-channel and optical observations." }, aliases: ["simultaneously-recorded-neurons"] },
  { slug: "neural-recording-hours-selected-datasets", title: "Neural recording hours — selected datasets", target: "neural-recording-hours", kind: "chart", graph: { group: 3, renderer: "draft", description: "Selected reported recording durations by release, publication or disclosure year.", plot: "recording-hours" }, aliases: ["neural-recording-hours", ...metricAliases("draft-recording-hours", "draft-panel-neuralink-private-intracortical-hours", "draft-panel-tusz-scalp-eeg", "draft-panel-ajile12-intracranial", "draft-panel-poyo-primate-training", "draft-panel-japaneeg-scalp-eeg")] },
  { slug: "selected-chronic-intracortical-recipients", title: "Selected chronic intracortical recipients", target: "metric-panel-neuralink-cumulative", kind: "chart", graph: { group: 3, renderer: "draft", description: "Selected chronic intracortical research cohorts, shown as separate program checkpoints.", plot: "neuralink-cumulative" }, aliases: metricAliases("draft-implanted-bci-humans", "draft-panel-neuralink-cumulative", "draft-panel-paradromics-connect-one") },
  { slug: "bci-information-transfer-over-time", title: "BCI communication rates over time", target: "metric-panel-bci-bitrate", kind: "chart", graph: { group: 3, renderer: "draft", description: "Selected communication-rate results for brain-computer interfaces.", plot: "bci-bitrate" }, aliases: metricAliases("draft-bci-bitrate", "draft-panel-bci-bitrate") },
  { slug: "selected-public-image-resource-footprints", title: "Selected public image/resource footprints", target: "metric-panel-public-data-size", kind: "chart", graph: { group: 0, renderer: "draft", description: "Reported public image and resource footprints.", plot: "public-data-size" }, aliases: metricAliases("draft-open-access-data", "draft-panel-public-data-size") },
  { slug: "selected-tissue-volume-checkpoints", title: "Selected tissue-volume checkpoints", target: "tissue-mapped", kind: "chart", graph: { group: 0, renderer: "draft", description: "Selected published tissue-volume measurements.", plot: "tissue-cm3" }, aliases: ["tissue-mapped", ...metricAliases("draft-brain-tissue-mapped", "draft-panel-tissue-cm3")] },
  { slug: "selected-published-connectomes-neuron-counts", title: "Selected published connectomes — neuron counts", target: "metric-panel-largest-connectome-neurons", kind: "chart", graph: { group: 0, renderer: "draft", description: "Reported neuron counts in selected published connectomes.", plot: "largest-connectome-neurons" }, aliases: metricAliases("draft-largest-connectome", "draft-panel-largest-connectome-neurons") },
  { slug: "selected-published-maps-synapse-counts", title: "Selected published maps — synapse counts", target: "metric-panel-largest-connectome-synapses", kind: "chart", graph: { group: 0, renderer: "draft", description: "Reported synapse counts in selected published maps.", plot: "largest-connectome-synapses" }, aliases: metricAliases("draft-panel-largest-connectome-synapses") },
  { slug: "selected-em-acquisition-rates", title: "Selected EM acquisition rates", target: "metric-panel-acquisition-rates", kind: "chart", graph: { group: 0, renderer: "draft", description: "Selected source-reported electron microscopy acquisition rates.", plot: "acquisition-rates" }, aliases: metricAliases("draft-imaging-throughput", "draft-panel-acquisition-rates") },
  { slug: "selected-structure-function-matches", title: "Selected structure–function matches", target: "metric-panel-paired-manual", kind: "chart", graph: { group: 0, renderer: "draft", description: "Selected datasets matching neural structure and function.", plot: "paired-manual" }, aliases: metricAliases("draft-paired-structure-function", "draft-panel-paired-manual") },
  { slug: "estimated-acquisition-efficiency-voxels-per-dollar", title: "Estimated acquisition efficiency", target: "metric-panel-acquisition-economics", kind: "chart", graph: { group: 1, renderer: "draft", description: "Source-estimated acquisition efficiency with separate descriptive method-family fits.", plot: "acquisition-economics" }, aliases: ["estimated-acquisition-cost-per-10m-voxels-optical-and-em", ...metricAliases("draft-imaging-cost-efficiency", "draft-panel-acquisition-economics")] },
  { slug: "human-and-mouse-cortex-split-merge-error-trade-offs", title: "Human and mouse cortex: split–merge error trade-offs", target: "metric-panel-connectomics-roboem-human-split-merge", kind: "chart", graph: { group: 1, renderer: "draft", description: "Reported split–merge error trade-offs for human and mouse cortex.", plot: "connectomics-roboem-human-split-merge" }, aliases: metricAliases("draft-panel-connectomics-roboem-human-split-merge", "draft-panel-connectomics-roboem-mouse-split-merge") },
  { slug: "reported-project-proofreading-effort", title: "Reported project proofreading effort", target: "metric-panel-proofreading-effort", kind: "chart", graph: { group: 1, renderer: "draft", description: "Reported proofreading effort for selected projects.", plot: "proofreading-effort" }, aliases: metricAliases("draft-proofreading-burden", "draft-panel-proofreading-effort") },
  { slug: "pathfinder-v1-axon-tracing-benchmark", title: "PATHFINDER v1: axon tracing benchmark", target: "metric-panel-pathfinder-nerl", kind: "chart", graph: { group: 1, renderer: "draft", description: "Reported PATHFINDER v1 axon tracing benchmark results.", plot: "pathfinder-nerl" }, aliases: metricAliases("draft-reconstruction-accuracy", "draft-panel-pathfinder-nerl") },
  { slug: "neuroai-performance-cost-frontier", title: "NeuroAI performance–cost frontier", target: "metric-panel-neuroai-imagenet", kind: "chart", graph: { group: 5, renderer: "draft", description: "Selected NeuroAI performance and cost observations.", plot: "neuroai-imagenet" }, aliases: metricAliases("draft-neuroai-frontier", "draft-panel-neuroai-imagenet") },
  { slug: "flyvis-correct-contrast-preference", title: "FlyVis: correct contrast preference", target: "metric-panel-flyvis-contrast", kind: "chart", graph: { group: 5, renderer: "draft", description: "Reported correct contrast preference in FlyVis.", plot: "flyvis-contrast" }, aliases: metricAliases("draft-simulation-fidelity", "draft-panel-flyvis-contrast") },
  { slug: "selected-application-events", title: "Selected application events", target: "metric-panel-application-events", kind: "chart", graph: { group: 5, renderer: "timeline", description: "Dates and stages for selected reported application events." }, aliases: metricAliases("draft-connectomics-applications", "draft-panel-application-events") },
  { slug: "mapping-scale", title: "Mapping Scale", target: "metric-category-0-toggle", kind: "category", aliases: metricAliases("draft-tissue-preservation", "draft-sectioning-loss", "draft-panel-gauss-section-rejection", "draft-panel-microns-section-loss", "draft-molecular-annotation", "draft-panel-paired-auto", "draft-comparative-cohorts", "draft-panel-comparative-specimens", "draft-connectome-reuse") },
  { slug: "cost-and-automation", title: "Cost and automation", target: "metric-category-1-toggle", kind: "category", aliases: metricAliases("draft-mapping-cost") },
  { slug: "simulation-and-neuroai", title: "Simulation and NeuroAI", target: "metric-category-5-toggle", kind: "category", aliases: metricAliases("draft-simulation-count") },
  { slug: "human-interfaces-and-recordings", title: "Human interfaces and recordings", target: "metric-category-3-toggle", kind: "category", aliases: metricAliases("draft-panel-precision-temporary-recording") },
  { slug: "neurotech-field-engagement", title: "Neurotech field engagement", target: "metric-category-6-toggle", kind: "category", aliases: [] },
];

export function fieldVelocityLink(anchor: string) {
  return FIELD_VELOCITY_LINKS.find(link => link.slug === anchor || link.target === anchor || link.aliases.includes(anchor));
}
export function canonicalPerformanceAnchor(anchor: string) {
  return fieldVelocityLink(anchor)?.slug ?? anchor;
}
export function performanceTarget(anchor: string) {
  return fieldVelocityLink(anchor)?.target ?? anchor;
}

export type FieldVelocityGraph = FieldVelocityLink & { graph: GraphDefinition };
export const FIELD_VELOCITY_GRAPHS = FIELD_VELOCITY_LINKS.filter((link): link is FieldVelocityGraph => !!link.graph);
export function fieldVelocityGraph(anchor: string): FieldVelocityGraph | undefined {
  const link = fieldVelocityLink(anchor);
  return link?.graph ? link as FieldVelocityGraph : undefined;
}
export function graphPath(graph: FieldVelocityGraph) {
  return `/field-velocity/${graph.slug}`;
}
export const GRAPH_GROUP_ANCHORS = {
  0: "mapping-scale", 1: "cost-and-automation", 3: "human-interfaces-and-recordings",
  5: "simulation-and-neuroai", 6: "neurotech-field-engagement",
} as const;
