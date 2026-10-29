# Metrics chart direct links

The legacy `#draft-charts` location still selects Metrics. The page now uses five groups with collapsed/preview/full states; no separate Draft tab or unsupported-proposal cards are mounted. See [Metrics navigation](metrics-navigation.md).

- The registry preserves every existing card/panel ID and adds one cost-efficiency card. There are 20 card IDs and 26 panel/timeline IDs, each with both `draft-` and `metric-` forms.
- Share controls use canonical `metric-` links. Copy link preserves origin, base path and complete query; image exports intentionally strip query parameters.
- Recording hours has one generic `#metric-recording-hours` share action. Its five old dataset-panel IDs are aliases to that one shared chart, not separate plots.
- `#neural-recording-hours` and `#tissue-mapped` resolve to the curated measurement charts, not duplicate reference views. Retired proposal/panel links reveal a meaningful remaining group without resurrecting empty content.
- Acquisition economics retains its exact panel fragments but is now in Cost and automation. `#metric-imaging-cost-efficiency` is its new card alias. No value/unit conversion is part of this move.

## Stable ID contract

`src/data/draft-chart-links.ts` explicitly owns fragment IDs independently of display titles. `plotId` refers to the current presentation plot identity; several legacy panel IDs can share it. Null denotes the categorical timeline. Original evidence records remain archived. The independent fixture is `tests/fixtures/draft-chart-links.json`.

All fragments below also have a canonical `metric-` form. Append them to the current Field velocity route, including any configured basePath. This is a source contract, not evidence of a hosted deployment.

| Card / archived definition | Card fragment | Panel fragments |
|---|---|---|
| Brain tissue mapped over time | `#draft-brain-tissue-mapped` | `#draft-panel-tissue-cm3` |
| Largest published connectome over time | `#draft-largest-connectome` | `#draft-panel-largest-connectome-neurons`, `#draft-panel-largest-connectome-synapses` |
| Connectomics imaging throughput over time | `#draft-imaging-throughput` | `#draft-panel-acquisition-rates` |
| Connectomics imaging cost efficiency | `#draft-imaging-cost-efficiency` | `#draft-panel-acquisition-economics` |
| Cost to map 1 cm³ over time | `#draft-mapping-cost` | Category alias — no panel |
| Automated reconstruction accuracy over time | `#draft-reconstruction-accuracy` | `#draft-panel-pathfinder-nerl`, `#draft-panel-connectomics-roboem-human-split-merge`, `#draft-panel-connectomics-roboem-mouse-split-merge` |
| Human proofreading burden over time | `#draft-proofreading-burden` | `#draft-panel-proofreading-effort` |
| Human tissue preservation quality over time | `#draft-tissue-preservation` | Category alias — no panel |
| Tissue loss in subdivision/sectioning over time | `#draft-sectioning-loss` | `#draft-panel-gauss-section-rejection`, `#draft-panel-microns-section-loss` |
| Molecular annotation coverage over time | `#draft-molecular-annotation` | Category alias — no panel |
| Humans with implanted high-bandwidth BCIs over time | `#draft-implanted-bci-humans` | `#draft-panel-neuralink-cumulative`, `#draft-panel-paradromics-connect-one`, `#draft-panel-precision-temporary-recording` |
| Neural recording hours collected over time | `#draft-recording-hours` | `#draft-panel-neuralink-private-intracortical-hours`, `#draft-panel-tusz-scalp-eeg`, `#draft-panel-ajile12-intracranial`, `#draft-panel-poyo-primate-training`, `#draft-panel-japaneeg-scalp-eeg` |
| Paired structure–function dataset scale over time | `#draft-paired-structure-function` | `#draft-panel-paired-manual`, `#draft-panel-paired-auto` |
| Comparative connectomics cohort size over time | `#draft-comparative-cohorts` | `#draft-panel-comparative-specimens` |
| Open-access connectomics data over time | `#draft-open-access-data` | `#draft-panel-public-data-size` |
| Public connectome reuse over time | `#draft-connectome-reuse` | Category alias — no panel |
| Simulation/emulation fidelity over time | `#draft-simulation-fidelity` | `#draft-panel-flyvis-contrast` |
| Number of simulations/emulations over time | `#draft-simulation-count` | Category alias — no panel |
| NeuroAI performance–cost frontier | `#draft-neuroai-frontier` | `#draft-panel-neuroai-imagenet` |
| Demonstrated applications enabled by connectomics over time | `#draft-connectomics-applications` | `#draft-panel-application-events` |

## Reproduction and scope

Run `npm ci`, `npm test`, `npm run typecheck`, changed-source ESLint and `npm run build`. The integration regression mounts real VelocityTabs under StrictMode, exercises every candidate and panel, verifies exact URL preservation, same-target history idempotence, retired-category aliases, clipboard success/failure and existing modal return behavior.

Native probe: `scripts/qa/draft-links-browser.py` through **browser-harness**, in an owned window. Set `ATLAS_QA_URL` to the loopback Field velocity route, `ATLAS_QA_OUTPUT` to a scratch directory and `ATLAS_QA_LINKS` to the absolute regression-fixture path. It checks every fresh target at 1440/390/320 px plus native direct/repeat/copy interactions, actual clipboard readback and cross-tab/modal history. Historical Draft/modal probes must use the current five-group and retired-alias expectations; they are not proof of the present surface without adaptation.

Use a disposable checkout at the pinned source revision, with its own frozen dependency install and the established explicit loopback-only QA auth fixture. Bind the server only to `127.0.0.1`. Never copy a production password into a fixture or commit/push/deploy the fixture. Source-build and local UI evidence do not establish authenticated hosted behavior. Browser policy blocks the hosted PLRD domain, so no positive hosted QA is claimed.
