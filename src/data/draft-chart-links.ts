/** Public fragment contract. IDs are explicit and independent of display text or order.
 * Never rename an existing ID when editing a title; preserve old links.
 * plotId refers to the existing evidence identity; null denotes the categorical timeline.
 */
export type DraftChartLink = {
  id: string;
  title: string;
  panels: readonly { id: string; plotId: string | null }[];
};

export const DRAFT_CHART_LINKS: readonly DraftChartLink[] = [
  {"id": "draft-brain-tissue-mapped", "title": "Brain tissue mapped over time", "panels": [{"id": "draft-panel-tissue-cm3", "plotId": "tissue-cm3"}]},
  {"id": "draft-largest-connectome", "title": "Largest published connectome over time", "panels": [{"id": "draft-panel-largest-connectome-neurons", "plotId": "largest-connectome-neurons"}, {"id": "draft-panel-largest-connectome-synapses", "plotId": "largest-connectome-synapses"}]},
  {"id": "draft-imaging-throughput", "title": "Connectomics imaging throughput over time", "panels": [{"id": "draft-panel-acquisition-rates", "plotId": "acquisition-rates"}]},
  {"id": "draft-imaging-cost-efficiency", "title": "Connectomics imaging cost efficiency", "panels": [{"id": "draft-panel-acquisition-economics", "plotId": "acquisition-economics"}]},
  {"id": "draft-mapping-cost", "title": "Cost to map 1 cm³ over time", "panels": []},
  {"id": "draft-reconstruction-accuracy", "title": "Automated reconstruction accuracy over time", "panels": [{"id": "draft-panel-pathfinder-nerl", "plotId": "pathfinder-nerl"}, {"id": "draft-panel-connectomics-roboem-human-split-merge", "plotId": "connectomics-roboem-human-split-merge"}, {"id": "draft-panel-connectomics-roboem-mouse-split-merge", "plotId": "connectomics-roboem-human-split-merge"}]},
  {"id": "draft-proofreading-burden", "title": "Human proofreading burden over time", "panels": [{"id": "draft-panel-proofreading-effort", "plotId": "proofreading-effort"}]},
  {"id": "draft-tissue-preservation", "title": "Human tissue preservation quality over time", "panels": []},
  {"id": "draft-sectioning-loss", "title": "Tissue loss in subdivision/sectioning over time", "panels": [{"id": "draft-panel-gauss-section-rejection", "plotId": "gauss-section-rejection"}, {"id": "draft-panel-microns-section-loss", "plotId": "microns-section-loss"}]},
  {"id": "draft-molecular-annotation", "title": "Molecular annotation coverage over time", "panels": []},
  {"id": "draft-implanted-bci-humans", "title": "Humans with implanted high-bandwidth BCIs over time", "panels": [{"id": "draft-panel-neuralink-cumulative", "plotId": "neuralink-cumulative"}, {"id": "draft-panel-paradromics-connect-one", "plotId": "neuralink-cumulative"}, {"id": "draft-panel-precision-temporary-recording", "plotId": "precision-temporary-recording"}]},
  {"id": "draft-recording-hours", "title": "Neural recording hours collected over time", "panels": [{"id": "draft-panel-neuralink-private-intracortical-hours", "plotId": "recording-hours"}, {"id": "draft-panel-tusz-scalp-eeg", "plotId": "recording-hours"}, {"id": "draft-panel-ajile12-intracranial", "plotId": "recording-hours"}, {"id": "draft-panel-poyo-primate-training", "plotId": "recording-hours"}, {"id": "draft-panel-japaneeg-scalp-eeg", "plotId": "recording-hours"}]},
  {"id": "draft-paired-structure-function", "title": "Paired structure–function dataset scale over time", "panels": [{"id": "draft-panel-paired-manual", "plotId": "paired-manual"}, {"id": "draft-panel-paired-auto", "plotId": "paired-auto"}]},
  {"id": "draft-comparative-cohorts", "title": "Comparative connectomics cohort size over time", "panels": [{"id": "draft-panel-comparative-specimens", "plotId": "comparative-specimens"}]},
  {"id": "draft-open-access-data", "title": "Open-access connectomics data over time", "panels": [{"id": "draft-panel-public-data-size", "plotId": "public-data-size"}]},
  {"id": "draft-connectome-reuse", "title": "Public connectome reuse over time", "panels": []},
  {"id": "draft-simulation-fidelity", "title": "Simulation/emulation fidelity over time", "panels": [{"id": "draft-panel-flyvis-contrast", "plotId": "flyvis-contrast"}]},
  {"id": "draft-simulation-count", "title": "Number of simulations/emulations over time", "panels": []},
  {"id": "draft-neuroai-frontier", "title": "NeuroAI performance–cost frontier over time", "panels": [{"id": "draft-panel-neuroai-imagenet", "plotId": "neuroai-imagenet"}]},
  {"id": "draft-connectomics-applications", "title": "Demonstrated applications enabled by connectomics over time", "panels": [{"id": "draft-panel-application-events", "plotId": null}]},
 ];

export const draftChartAnchors = DRAFT_CHART_LINKS.flatMap(chart => [chart.id, ...chart.panels.map(panel => panel.id)]);
export const canonicalMetricAnchor = (anchor: string) => anchor.replace(/^draft-/, "metric-");
export const metricChartAnchors = draftChartAnchors.map(canonicalMetricAnchor);
export function isDraftAnchor(anchor: string) {
  return anchor === "draft-charts" || draftChartAnchors.includes(anchor) || metricChartAnchors.includes(anchor);
}
