/** Explicit public URL contract. Slugs follow current rendered titles, never runtime copy.
 * Internal record, DOM and evidence IDs remain unchanged. Add aliases when renaming a URL.
 * Retired proposals land on their current category, without restoring archived charts.
 */
type FieldVelocityLink = {
  slug: string;
  title: string;
  target: string;
  kind: "tab" | "chart" | "category";
  aliases: readonly string[];
  fallback?: string;
};
// Both historically published prefixes are compatibility identities, not slug generation.
const metricAliases = (...ids: string[]) => ids.flatMap(id => [id, id.replace(/^draft-/, "metric-")]);
export const FIELD_VELOCITY_LINKS: readonly FieldVelocityLink[] = [
  { slug: "metrics", title: "Metrics", target: "performance_curves", kind: "tab", aliases: ["performance_curves", "draft-charts"] },
  { slug: "inflection-points", title: "Inflection points", target: "expectations", kind: "tab", aliases: ["expectations"] },
  { slug: "citation-latency", title: "Citation latency", target: "idea_vintage", kind: "chart", aliases: ["idea_vintage"] },
  { slug: "latency-compression", title: "Latency compression", target: "latency_compression", kind: "chart", aliases: ["latency_compression"] },
  { slug: "implanted-bci-participants-over-time", title: "Implanted BCI participants over time", target: "revealed_commitments", kind: "chart", aliases: ["revealed_commitments"] },
  { slug: "neurotech-papers-per-year", title: "Neurotech papers per year", target: "publication-output", kind: "chart", aliases: ["publication-output"] },
  { slug: "publication-growth-by-group", title: "Publication growth by group", target: "publication-growth", kind: "chart", aliases: ["publication-growth"] },
  { slug: "researchers-by-publication-sector", title: "Researchers by publication sector", target: "researcher-sectors", kind: "chart", aliases: ["researcher-sectors"] },
  { slug: "researchers-first-and-latest-affiliations", title: "Researchers’ first and latest affiliations", target: "researcher-sector-changes", kind: "chart", aliases: ["researcher-sector-changes"] },
  { slug: "neurotech-search-terms", title: "Neurotech search terms", target: "google-trends-neurotech", kind: "chart", aliases: ["google-trends-neurotech"] },
  // Brand context is no longer mounted in Field velocity; keep a category fallback there.
  { slug: "neuralink-brand-context", title: "Neuralink · brand context", target: "google-trends-neuralink", kind: "chart", aliases: ["google-trends-neuralink"], fallback: "metric-category-6-toggle" },
  { slug: "simultaneous-neural-recordings", title: "Simultaneous neural recordings", target: "simultaneously-recorded-neurons", kind: "chart", aliases: ["simultaneously-recorded-neurons"] },
  { slug: "neural-recording-hours-selected-datasets", title: "Neural recording hours — selected datasets", target: "neural-recording-hours", kind: "chart", aliases: ["neural-recording-hours", ...metricAliases("draft-recording-hours", "draft-panel-neuralink-private-intracortical-hours", "draft-panel-tusz-scalp-eeg", "draft-panel-ajile12-intracranial", "draft-panel-poyo-primate-training", "draft-panel-japaneeg-scalp-eeg")] },
  { slug: "selected-chronic-intracortical-recipients", title: "Selected chronic intracortical recipients", target: "metric-panel-neuralink-cumulative", kind: "chart", aliases: metricAliases("draft-implanted-bci-humans", "draft-panel-neuralink-cumulative", "draft-panel-paradromics-connect-one") },
  { slug: "selected-public-image-resource-footprints", title: "Selected public image/resource footprints", target: "metric-panel-public-data-size", kind: "chart", aliases: metricAliases("draft-open-access-data", "draft-panel-public-data-size") },
  { slug: "selected-tissue-volume-checkpoints", title: "Selected tissue-volume checkpoints", target: "tissue-mapped", kind: "chart", aliases: ["tissue-mapped", ...metricAliases("draft-brain-tissue-mapped", "draft-panel-tissue-cm3")] },
  { slug: "selected-published-connectomes-neuron-counts", title: "Selected published connectomes — neuron counts", target: "metric-panel-largest-connectome-neurons", kind: "chart", aliases: metricAliases("draft-largest-connectome", "draft-panel-largest-connectome-neurons") },
  { slug: "selected-published-maps-synapse-counts", title: "Selected published maps — synapse counts", target: "metric-panel-largest-connectome-synapses", kind: "chart", aliases: metricAliases("draft-panel-largest-connectome-synapses") },
  { slug: "selected-em-acquisition-rates", title: "Selected EM acquisition rates", target: "metric-panel-acquisition-rates", kind: "chart", aliases: metricAliases("draft-imaging-throughput", "draft-panel-acquisition-rates") },
  { slug: "selected-structure-function-matches", title: "Selected structure–function matches", target: "metric-panel-paired-manual", kind: "chart", aliases: metricAliases("draft-paired-structure-function", "draft-panel-paired-manual") },
  { slug: "estimated-acquisition-cost-per-10m-voxels-optical-and-em", title: "Estimated acquisition cost per 10M voxels — optical and EM", target: "metric-panel-acquisition-economics", kind: "chart", aliases: metricAliases("draft-imaging-cost-efficiency", "draft-panel-acquisition-economics") },
  { slug: "human-and-mouse-cortex-split-merge-error-trade-offs", title: "Human and mouse cortex: split–merge error trade-offs", target: "metric-panel-connectomics-roboem-human-split-merge", kind: "chart", aliases: metricAliases("draft-panel-connectomics-roboem-human-split-merge", "draft-panel-connectomics-roboem-mouse-split-merge") },
  { slug: "reported-project-proofreading-effort", title: "Reported project proofreading effort", target: "metric-panel-proofreading-effort", kind: "chart", aliases: metricAliases("draft-proofreading-burden", "draft-panel-proofreading-effort") },
  { slug: "pathfinder-v1-axon-tracing-benchmark", title: "PATHFINDER v1: axon tracing benchmark", target: "metric-panel-pathfinder-nerl", kind: "chart", aliases: metricAliases("draft-reconstruction-accuracy", "draft-panel-pathfinder-nerl") },
  { slug: "neuroai-performance-cost-frontier", title: "NeuroAI performance–cost frontier", target: "metric-panel-neuroai-imagenet", kind: "chart", aliases: metricAliases("draft-neuroai-frontier", "draft-panel-neuroai-imagenet") },
  { slug: "flyvis-correct-contrast-preference", title: "FlyVis: correct contrast preference", target: "metric-panel-flyvis-contrast", kind: "chart", aliases: metricAliases("draft-simulation-fidelity", "draft-panel-flyvis-contrast") },
  { slug: "selected-application-events", title: "Selected application events", target: "metric-panel-application-events", kind: "chart", aliases: metricAliases("draft-connectomics-applications", "draft-panel-application-events") },
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
