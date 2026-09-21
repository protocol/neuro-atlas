# Draft charts — actual evidence, not definitions alone

This revision corrects the previous definition-only gallery. It preserves all 19 proposed metric definitions and gives **14 candidates an actual visual evidence view**: **20 numeric scatter panels (57 observations) and one categorical application timeline (2 events)**. **Five candidates remain unplotted evidence gaps.**

These are not 19 completed historical series. Several views are explicitly a one-year benchmark, a single checkpoint, a selected-study comparison, or an alternative unit. Their remaining mismatch is visible in each card, not hidden only here. No annual points, global totals, cost estimates, or trend lines were invented to fill gaps.

## Source contract

`src/data/draft-chart-evidence.json` is the exact UI dataset. Every observation retains its public primary-source URL/title, supporting excerpt, date basis, numeric qualifier and comparability note. `src/data/draft-charts.ts` retains the proposed definitions separately. The source table on each plot exposes all observations; pointer activation and keyboard focus inspect individual points. Private deliberations are not included.

Sources were retrieved September 18, 2026. Publication years are not evaluation or release dates unless specifically established. Existing tissue and recording checkpoints are carried from the pinned shared snapshot after rechecking their cited sources; tissue is converted from mm³ to cm³ by division by 1,000. Existing Metrics and extrapolation records are unchanged.

## Coverage inventory

| Proposed metric | Rendered evidence | Remaining boundary |
|---|---|---|
| Brain tissue mapped over time | 1 numeric panel(s), 7 observations | Selected-study scope; not an exhaustive field total. |
| Largest published connectome over time | 2 numeric panel(s), 8 observations | A complete, consistently defined largest-map frontier has not been established. |
| Connectomics imaging throughput over time | 1 numeric panel(s), 2 observations | Comparable preparation-to-quality-controlled-volume throughput is unavailable. |
| Cost to map 1 cm³ over time | No plot — evidence gap | Imaging components, research grants and estimated whole-brain budgets omit different costs. A realized imaging + compute + storage + proofreading total at a common quality threshold is still needed. |
| Automated reconstruction accuracy over time | 1 numeric panel(s), 1 observations | No matched multi-year evaluation series was verified. |
| Human proofreading burden over time | 1 numeric panel(s), 2 observations | Common-quality person-hours/mm³ remains unavailable. |
| Human tissue preservation quality over time | No plot — evidence gap | The reviewed 2025 human brain-bank study says traceability could not be rigorously quantified. Image artifact area and visible synapses are not fractions of connections traceable. |
| Tissue loss in subdivision/sectioning over time | 2 numeric panel(s), 3 observations | A matched time series of lost/damaged tissue volume is not available. |
| Molecular annotation coverage over time | No plot — evidence gap | Cell-type morphology, classification accuracy and antigen counts do not measure experimentally validated neurotransmitter/receptor coverage. A selected molecular label, assay and denominator are still required. |
| Humans with implanted high-bandwidth BCIs over time | 2 numeric panel(s), 6 observations | Selected-study scope; not an exhaustive field total. |
| Neural recording hours collected over time | 4 numeric panel(s), 11 observations | Selected-study scope; not an exhaustive field total. |
| Paired structure–function dataset scale over time | 2 numeric panel(s), 4 observations | Selected-study scope; not an exhaustive field total. |
| Comparative connectomics cohort size over time | 1 numeric panel(s), 2 observations | Comparable mammalian disease/control/treatment cohorts remain unassembled. |
| Open-access connectomics data over time | 1 numeric panel(s), 3 observations | Raw-image versus processed-data byte splits and a deduplicated global inventory remain unavailable. |
| Public connectome reuse over time | No plot — evidence gap | No defensible year-resolved corpus denominator and validated reuse classification was recovered in this bounded search. Do not compute a percentage or equate citation counts with reuse. |
| Simulation/emulation fidelity over time | 1 numeric panel(s), 2 observations | No matched multi-year fidelity series is assembled. |
| Number of simulations/emulations over time | No plot — evidence gap | A few selected model families do not establish a field-wide count. Choose models, runs, organisms or independently validated emulations and assemble a deduplicated inventory before plotting a history. |
| NeuroAI performance–cost frontier over time | 1 numeric panel(s), 6 observations | No matched multi-year frontier or measured device-energy series is assembled. |
| Demonstrated applications enabled by connectomics over time | categorical timeline, 2 events | No synaptic-connectome-enabled clinical therapy or deployed BCI is established by this evidence. |

## Important exclusions

- Connectome neuron counts and synapse/cleft counts occupy different panels. Selected whole/partial studies are not asserted to be successive world records. FlyWire's 54.5 million mapped synapses are not replaced by its approximately 130 million predicted neuropil synapses.
- Different imaging resolutions do not establish one throughput trend; available points describe acquisition, not the complete preparation/reconstruction pipeline.
- Proofreading person-years are not converted to person-hours/mm³ using invented work-year hours or nominal volumes.
- Rejected sections and physically lost sections stay separate; neither is labeled measured total tissue-volume loss.
- MICrONS anatomy/function matching uses15,439 unique manually matched neurons, not75,909 recorded neurons. Automated37,364 matches are separate,83%-precision and overlapping.
- PB figures are producer-reported representations, not current bucket-byte audits; mirrors and versions are not added.
- FlyVis accuracy is a specific physiological classification task, not a general emulation score. The NeuroAI energy x-axis is explicitly theoretical inference energy under a45nm operation-cost model, not measured hardware energy, training energy or a cross-year improvement rate.
- The application timeline includes synaptic-connectome research demonstrations only. Functional-MRI clinical trials are excluded so they cannot masquerade as synaptic-connectome clinical impact.
- No plot is created merely by counting the few papers found in this search. Simulation/emulation count remains a gap until its inclusion unit and inventory are defined.

## Verification

Verified runtime: `533eb5bdbdd78e245bd3ecc44d63d1d8da390dfc` (September 18, 2026). Later evidence-only commits do not change runtime, tests or dependencies.

- 138 tests pass, including provenance, coordinates, qualifiers, numeric tick precision and prior navigation behavior.
- Typecheck, changed-source ESLint, and production builds pass. The source build preserves the original authentication middleware.
- Real headed Chrome at 1440 / 390 / 320 px verifies all 19 candidates, 20 numeric plots, all 57 numerical marks, source-table/point/keyboard interactions, uncut SVG text and no document overflow. Local pointer activation is not a physical-phone test.
- All 15 existing graph/viewport modal cases pass: exact source counts, fresh links, real clipboard readback, history, focus wrap/restoration, dismissal and stable page geometry. Additional cross-group/history/filter cases pass.
- Independent bounded scientific-data review and exact-runtime code review passed. Visual inspection found and fixed floating-point noise in a numeric axis tick; the final native replay uses the corrected runtime.
- Native reports are in `docs/qa/actual-draft-charts/`; captioned final captures are in `docs/screenshots/actual-draft-*.png`.

**Boundary:** Screenshots are actual local production-build UI, not a mocked chart. The disposable QA checkout alone uses an explicit loopback-only auth fixture. No authentication change is committed or deployed, and this is not authenticated hosted QA. Some approximate/lower-bound markers share circle shapes: the exact qualifier is retained in their accessible labels, inspector and source tables; do not strip those qualifications from exports.

Reproduce with `npm ci`, `npm test`, `npm run typecheck`, `npm run build`. Through the owned browser-harness window, run `scripts/qa/draft-charts-browser.py` with `ATLAS_QA_URL` (loopback `/field-velocity`), `ATLAS_QA_OUTPUT`, and `ATLAS_QA_DATA` (absolute evidence JSON path). Then run `scripts/qa/modal-browser.py` with the first two variables. The probes wait for hydrated UI and reload without cache to avoid stale bundles from a prior local build.
