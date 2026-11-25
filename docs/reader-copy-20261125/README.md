# Neuro Atlas reader-copy review — November 25, 2026

This is an editorial pass over the current site, based on merged PR #151 (`9c1ddcca0bb49daf1c825d9b3b6e318fd870ac3b`). It uses direct language and positive definitions while retaining financial and scientific qualifications.

## Scope

- Reviewed every page, navigation label, metadata description, shared control, source directory, glossary tooltip and feedback state. Clear existing copy, the home hero, legal disclaimer, source titles and quotations remain unchanged.
- Revised Milestones and Funding Index explanations, company details and canonical event/source notes. Financing, commitments, investor participation, acquisition values and unknown amounts remain distinct.
- Reviewed all 25 current Field velocity charts, their explanations, source details, exports and supported states. The five categories and their chart coverage are listed below.
- Edited canonical inputs and regenerated the derived JSON and four Google Trends CSV comment headers. This is a wording change, not a source refresh. CSV rows, observation values, dates, IDs, citations, source hashes and accounting are unchanged.
- Two existing explanations are reconciled with unchanged data: the Milestones year badge now says **2022–26**, and the capital definition explicitly includes labeled philanthropic commitments.

The only reader-formatting expression added removes the internal phrase “not DOI date string” from displayed date-basis copy. Chart calculations, inclusion rules, filters, routes, query/hash identities and access behavior stay unchanged. Unmerged PRs #152, #144 and #148 remain separate. There is no merge or production deployment in this handoff.

## Examples

| Before | After |
|---|---|
| “date TBD” | “Date unknown” |
| “context not fitted” | “context outside the fit” |
| “No program-wide amount is counted as Motif financing.” | “Motif’s financing amount is unknown and remains outside capital totals.” |
| “Table A1 Approx. Voxels/$ values, rather than digitized Figure 2 marks or throughput/hour divided by cost/hour.” | “Values reproduce the Approx. Voxels/$ column in Table A1.” |
| “We plan to enable contributions through GitHub pull requests.” | “Fork the Neuro Atlas repository and open a pull request…” |

## Current chart coverage

| Category | Chart |
|---|---|
| Neurotech field engagement | Neurotech search terms |
| Neurotech field engagement | Citation latency |
| Neurotech field engagement | Latency compression |
| Neurotech field engagement | Implanted BCI participants over time |
| Neurotech field engagement | Neurotech papers per year |
| Neurotech field engagement | Publication growth by group |
| Neurotech field engagement | Researchers by publication sector |
| Neurotech field engagement | Researchers’ first and latest affiliations |
| Human interfaces and recordings | Neural recording hours — selected datasets |
| Human interfaces and recordings | Selected chronic intracortical recipients |
| Human interfaces and recordings | BCI communication rates over time |
| Human interfaces and recordings | Neurons per experiment |
| Mapping Scale | Selected public image/resource footprints |
| Mapping Scale | Selected tissue-volume checkpoints |
| Mapping Scale | Selected published connectomes — neuron counts |
| Mapping Scale | Selected published maps — synapse counts |
| Mapping Scale | Selected EM acquisition rates |
| Mapping Scale | Selected structure–function matches |
| Cost and automation | Imaging efficiency |
| Cost and automation | Human and mouse cortex: split–merge error trade-offs |
| Cost and automation | Reported project proofreading effort |
| Cost and automation | PATHFINDER v1: axon tracing benchmark |
| Simulation and NeuroAI | NeuroAI performance–cost frontier |
| Simulation and NeuroAI | FlyVis: correct contrast preference |
| Simulation and NeuroAI | Selected application events |

## Native evidence

The local production build was exercised in real Chrome: **46 page/detail cases** across 1440px and 390px viewports, light and dark page states, plus **50 chart-dialog cases** covering each current chart at both widths. Dialog identity is checked explicitly; two existing preview/dialog title aliases are retained. Captured source-mark attributes, external source links and horizontal bounds match the merged-main baseline. Embedded JSON/CSV downloads change only reviewed prose; other values and source URLs stay exact. The existing 10px desktop dialog scroll-width/client-width difference is unchanged.

A real Download PNG handler produced the [BCI chart image](qa/bci-native-download.png), captured at the browser download-anchor boundary. The local footer URL correctly reflects the loopback runtime. The mobile financing note wraps inside its visible content bounds. Feedback selection/composer was opened read-only; local feedback is disabled and no feedback was submitted. This does not certify production activation, physical-phone touch or hosted authentication.

Application-source review and native captures are bound to `394cfd56fbe859f88ee461a310ee6b31632d7bc9`. Later commits change only regression-test packaging and regenerated CSV comments, plus this evidence. Served script bytes were matched to the built assets. The raw capture records the unique prefix `394cfd5`; the full revision and its receipt hash are bound in [native parity](qa/native-parity.json).

## Screenshots

- [Methodology before](qa/methodology-before-desktop.png) / [after](qa/methodology-after-desktop.png)
- [Mobile methodology](qa/methodology-after-mobile.png)
- [Mobile financing/source note](qa/funding-source-note-mobile.png)
- [Dark Field velocity page](qa/field-velocity-dark-desktop.png)
- [Read-only local feedback state](qa/feedback-local-disabled-mobile.png)


## Executed checks

| Check | Actual result |
|---|---|
| Production build | Pass |
| Typecheck | Pass |
| Merged-main full baseline | 1,652 tests: 1,616 pass, 36 fail |
| Integrated full run at `eecb1c0` | 1,657 tests: 1,620 pass, 37 fail; no cancellations |
| Later BrainGate consumer-order correction | Complete affected file: 3/3 pass; exact two-line correction independently reviewed |
| Final source/generator/copy/SVG safeguards | 9/9 pass, including current builder parity and unlisted numeric-mutation controls |
| Lint | Same existing 3 errors and 13 warnings as merged main |

The integrated run's one additional failure compared current prose with historical prose. The correction applies the same explicit copy projection to both sides; exact point/legend comparisons, live-data immutability and the numeric-mutation guard remain. The complete affected file was then replayed successfully. This is **not** relabeled as an all-green aggregate run.

All 36 original failing cases remain accounted for. Thirty-three had identical normalized diagnostics. Three reflected intended copy/serialization changes and were inspected individually: the complete 30-entry SVG actual-hash dictionary now reproduces the original baseline through a historical-copy-only renderer seam; the acquisition-copy test reaches its original all-in-cost-boundary failure after its stale wording check is updated; PATHFINDER retains the same original strict short-axis-label expectation. No original expected scientific hash was refreshed. See the [machine-readable comparison](qa/test-comparison.json).

The existing lint errors are in `src/components/theme-toggle.tsx` and `tests/draft-chart-plot.test.mjs`, outside the edited application surface. Source/editorial review passed; final helper/generator/fixture gates passed independent review, with the located historical-consumer correction closed by its committed replay. These checks establish a reviewed editorial PR, not a clean baseline suite or production release.

## Review and limits

The independent source review passed with all eight located proposal findings closed. Existing scientific and historical goldens remain frozen: exact, fail-closed copy reversals are applied only at historical test seams. Current-data generation and parity tests read the actual unprojected inputs. Added negative controls preserve detection of unlisted numeric, source, date, quotation and prose mutations.

This is not a fresh audit of every source claim. Existing source-specific differences in Synchron investor lists, SubSense stage support, date bases and Precision co-lead completeness remain outside this wording pass. Existing broad Neuracle approval wording is retained for a separate source/definition review.
