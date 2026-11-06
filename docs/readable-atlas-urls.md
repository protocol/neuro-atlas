# Readable Field velocity URLs

Public fragments are an explicit compatibility contract in `src/data/field-velocity-links.ts`.
The route remains `/neuro-atlas/field-velocity`; origin, basePath and navigation query strings are retained.
Internal source, evidence, DOM and feedback IDs are unchanged. Slugs are not generated from mutable display copy.

## Behavior

- Tab/chart actions, Copy link (including failure fallbacks), related-measurement native hrefs, and chart image/clipboard links use the canonical fragment.
- Known old fragments normalize with `history.replaceState(history.state, ...)` on entry and hash/popstate events; no extra history entry is added.
- Modal history, Close fallback to `#metrics`, focus and manual scroll restoration stay in the existing navigation/modal flow.
- Retired proposal/panel URLs reveal their current real category. Their old DOM anchors remain; no retired plots or source records are restored.
- Neuralink brand context is not mounted in Field velocity. Its old and canonical URLs reveal Neurotech field engagement there; a standalone Trends consumer can still resolve the retained brand chart.
- Image/clipboard exports continue to strip credentials and arbitrary query values, retaining only the exact allowlisted recording view for either recording URL identity.
- Unknown fragments are left untouched; unknown share targets are rejected. No routing configuration, data acquisition/refresh contract, dependencies or auth is changed.

## Mapping inventory

Each listed legacy alias resolves to the canonical slug. Both historical `draft-` and `metric-` aliases are expanded below.

| Current title / destination | Canonical fragment | Internal target | Legacy aliases |
| --- | --- | --- | --- |
| Metrics | `#metrics` | `performance_curves` | `#performance_curves`, `#draft-charts` |
| Inflection points | `#inflection-points` | `expectations` | `#expectations` |
| Citation latency | `#citation-latency` | `idea_vintage` | `#idea_vintage` |
| Latency compression | `#latency-compression` | `latency_compression` | `#latency_compression` |
| Implanted BCI participants over time | `#implanted-bci-participants-over-time` | `revealed_commitments` | `#revealed_commitments` |
| Neurotech papers per year | `#neurotech-papers-per-year` | `publication-output` | `#publication-output` |
| Publication growth by group | `#publication-growth-by-group` | `publication-growth` | `#publication-growth` |
| Researchers by publication sector | `#researchers-by-publication-sector` | `researcher-sectors` | `#researcher-sectors` |
| Researchers’ first and latest affiliations | `#researchers-first-and-latest-affiliations` | `researcher-sector-changes` | `#researcher-sector-changes` |
| Neurotech search terms | `#neurotech-search-terms` | `google-trends-neurotech` | `#google-trends-neurotech` |
| Neuralink · brand context | `#neuralink-brand-context` | `google-trends-neuralink` | `#google-trends-neuralink` |
| Simultaneous neural recordings | `#simultaneous-neural-recordings` | `simultaneously-recorded-neurons` | `#simultaneously-recorded-neurons` |
| Neural recording hours — selected datasets | `#neural-recording-hours-selected-datasets` | `neural-recording-hours` | `#neural-recording-hours`, `#draft-recording-hours`, `#metric-recording-hours`, `#draft-panel-neuralink-private-intracortical-hours`, `#metric-panel-neuralink-private-intracortical-hours`, `#draft-panel-tusz-scalp-eeg`, `#metric-panel-tusz-scalp-eeg`, `#draft-panel-ajile12-intracranial`, `#metric-panel-ajile12-intracranial`, `#draft-panel-poyo-primate-training`, `#metric-panel-poyo-primate-training`, `#draft-panel-japaneeg-scalp-eeg`, `#metric-panel-japaneeg-scalp-eeg` |
| Selected chronic intracortical recipients | `#selected-chronic-intracortical-recipients` | `metric-panel-neuralink-cumulative` | `#draft-implanted-bci-humans`, `#metric-implanted-bci-humans`, `#draft-panel-neuralink-cumulative`, `#metric-panel-neuralink-cumulative`, `#draft-panel-paradromics-connect-one`, `#metric-panel-paradromics-connect-one` |
| Selected public image/resource footprints | `#selected-public-image-resource-footprints` | `metric-panel-public-data-size` | `#draft-open-access-data`, `#metric-open-access-data`, `#draft-panel-public-data-size`, `#metric-panel-public-data-size` |
| Selected tissue-volume checkpoints | `#selected-tissue-volume-checkpoints` | `tissue-mapped` | `#tissue-mapped`, `#draft-brain-tissue-mapped`, `#metric-brain-tissue-mapped`, `#draft-panel-tissue-cm3`, `#metric-panel-tissue-cm3` |
| Selected published connectomes — neuron counts | `#selected-published-connectomes-neuron-counts` | `metric-panel-largest-connectome-neurons` | `#draft-largest-connectome`, `#metric-largest-connectome`, `#draft-panel-largest-connectome-neurons`, `#metric-panel-largest-connectome-neurons` |
| Selected published maps — synapse counts | `#selected-published-maps-synapse-counts` | `metric-panel-largest-connectome-synapses` | `#draft-panel-largest-connectome-synapses`, `#metric-panel-largest-connectome-synapses` |
| Selected EM acquisition rates | `#selected-em-acquisition-rates` | `metric-panel-acquisition-rates` | `#draft-imaging-throughput`, `#metric-imaging-throughput`, `#draft-panel-acquisition-rates`, `#metric-panel-acquisition-rates` |
| Selected structure–function matches | `#selected-structure-function-matches` | `metric-panel-paired-manual` | `#draft-paired-structure-function`, `#metric-paired-structure-function`, `#draft-panel-paired-manual`, `#metric-panel-paired-manual` |
| Estimated acquisition cost per 10M voxels — optical and EM | `#estimated-acquisition-cost-per-10m-voxels-optical-and-em` | `metric-panel-acquisition-economics` | `#draft-imaging-cost-efficiency`, `#metric-imaging-cost-efficiency`, `#draft-panel-acquisition-economics`, `#metric-panel-acquisition-economics` |
| Human and mouse cortex: split–merge error trade-offs | `#human-and-mouse-cortex-split-merge-error-trade-offs` | `metric-panel-connectomics-roboem-human-split-merge` | `#draft-panel-connectomics-roboem-human-split-merge`, `#metric-panel-connectomics-roboem-human-split-merge`, `#draft-panel-connectomics-roboem-mouse-split-merge`, `#metric-panel-connectomics-roboem-mouse-split-merge` |
| Reported project proofreading effort | `#reported-project-proofreading-effort` | `metric-panel-proofreading-effort` | `#draft-proofreading-burden`, `#metric-proofreading-burden`, `#draft-panel-proofreading-effort`, `#metric-panel-proofreading-effort` |
| PATHFINDER v1: axon tracing benchmark | `#pathfinder-v1-axon-tracing-benchmark` | `metric-panel-pathfinder-nerl` | `#draft-reconstruction-accuracy`, `#metric-reconstruction-accuracy`, `#draft-panel-pathfinder-nerl`, `#metric-panel-pathfinder-nerl` |
| NeuroAI performance–cost frontier | `#neuroai-performance-cost-frontier` | `metric-panel-neuroai-imagenet` | `#draft-neuroai-frontier`, `#metric-neuroai-frontier`, `#draft-panel-neuroai-imagenet`, `#metric-panel-neuroai-imagenet` |
| FlyVis: correct contrast preference | `#flyvis-correct-contrast-preference` | `metric-panel-flyvis-contrast` | `#draft-simulation-fidelity`, `#metric-simulation-fidelity`, `#draft-panel-flyvis-contrast`, `#metric-panel-flyvis-contrast` |
| Selected application events | `#selected-application-events` | `metric-panel-application-events` | `#draft-connectomics-applications`, `#metric-connectomics-applications`, `#draft-panel-application-events`, `#metric-panel-application-events` |
| Mapping Scale | `#mapping-scale` | `metric-category-0-toggle` | `#draft-tissue-preservation`, `#metric-tissue-preservation`, `#draft-sectioning-loss`, `#metric-sectioning-loss`, `#draft-panel-gauss-section-rejection`, `#metric-panel-gauss-section-rejection`, `#draft-panel-microns-section-loss`, `#metric-panel-microns-section-loss`, `#draft-molecular-annotation`, `#metric-molecular-annotation`, `#draft-panel-paired-auto`, `#metric-panel-paired-auto`, `#draft-comparative-cohorts`, `#metric-comparative-cohorts`, `#draft-panel-comparative-specimens`, `#metric-panel-comparative-specimens`, `#draft-connectome-reuse`, `#metric-connectome-reuse` |
| Cost and automation | `#cost-and-automation` | `metric-category-1-toggle` | `#draft-mapping-cost`, `#metric-mapping-cost` |
| Simulation and NeuroAI | `#simulation-and-neuroai` | `metric-category-5-toggle` | `#draft-simulation-count`, `#metric-simulation-count` |
| Human interfaces and recordings | `#human-interfaces-and-recordings` | `metric-category-3-toggle` | `#draft-panel-precision-temporary-recording`, `#metric-panel-precision-temporary-recording` |
| Neurotech field engagement | `#neurotech-field-engagement` | `metric-category-6-toggle` | — |

## Verification scope

`tests/fixtures/readable-atlas-urls.json` independently pins all 24 rendered chart titles and public slugs.
Regression coverage checks the complete frozen legacy registry, canonical/legacy entries, StrictMode, category retirement, per-entry router state, repeated queries, same-target history, Back/Forward, focus, actual Copy link callbacks/fallbacks and export URLs.
The standard test suite retains original scientific observations, URL alias inputs, modal behavior and evidence checks; only deliberately changed public URL/derived PNG-filename expectations are updated.

Verified locally: `npm test` passed all 1,098 tests (zero failures, cancellations or skips); `npm run typecheck`, scoped runtime ESLint and `git diff --check` passed.

RED/GREEN evidence: the first six URL regressions failed on legacy output, then passed with the explicit registry. Fresh-entry/rendered-link regressions failed before canonical navigation and then passed. Separate regressions caught the unmounted-brand category reveal and canonical recording-view export; both were fixed and passed. All 107 legacy aliases remain covered, including the original 92 draft/metric-prefixed identities.
This is local automated verification, not native-browser or hosted QA. No push, PR, deploy or merge is part of this implementation.
