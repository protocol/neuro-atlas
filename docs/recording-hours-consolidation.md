# Recording hours and duplicate measurement views

## Current presentation

`Neural recording hours collected over time` contains one populated scatter chart with a shared release/publication/disclosure-year axis and a logarithmic recording-hours axis. Five colored, labeled series retain twelve original observations: Neuralink (1), TUSZ (8), AJILE12 (1), POYO-1 (1), JapanEEG (1). The compact chart opens one URL-addressed detail popup with one initially empty point inspector, one source table, one Copy chart action and one Download PNG action.

This is a presentation projection in `src/data/metric-chart-visibility.ts`, not an evidence rewrite. Every original observation field, exact coordinate, date label, quotation, note and source URL is retained. Missing presentation groups receive their dataset label; existing source groups are preserved. No points are summed or connected; no pooled fit is introduced.

- Neuralink remains **>50,000 accumulated company-held human intracortical recording hours**, disclosed October 1, 2026. Not a public release, channel-hours or one pooled model's training total; participant-specific pretraining and undisclosed session-union/QC rules remain qualified.
- POYO-1 remains **>100 hours** of reused nonhuman-primate training-corpus recordings, not new unique data.
- TUSZ releases overlap and include held-out evaluation data. AJILE12's frozen release, JapanEEG's reported release/access claim and all modality/species distinctions remain in the source disclosure.
- Static exports include the five-series legend, per-series source scope, units and visibly observation-linked strict lower bounds. The clipboard URL is the generic `#metric-recording-hours`, not a Neuralink-specific panel URL. Native raster/clipboard behavior is a separate parent-owned QA gate.

## Retired duplicates, retained evidence

The old recording-hours reference held four tracks / eleven observations. Its original dates, values, source URLs and qualifiers match the corresponding curated records; Neuralink is the extra curated observation. The old mapped-tissue reference held seven observations already represented in the curated tissue chart, with mm³ converted to cm³. Both redundant views are unmounted, not hidden or removed from the source snapshot.

`#neural-recording-hours` now reveals the shared recording-hours chart; `#tissue-mapped` reveals the curated mapped-tissue chart. Both reveal the correct group and open the curated chart popup, focusing Close without scrolling the background. All old and clean recording card/panel fragments still resolve to the same populated chart. Dataset-specific panel fragments are aliases, not separate charts or export actions. Self-referential “open existing chart” links and the obsolete Reference views introduction are removed.

The **simultaneously recorded neurons** chart is unique recording-capability evidence, not a count of neurons in a static connectome. Its seven historical observations, modal, source table and default-off extrapolation remain. The duplicate hours view's exploratory TUSZ-only scenarios remain in the internal renderer/math tests but are not mounted on the current page. Neurotech Engagement, attention and other opt-in forecasts are unchanged.

## Adjacent owner-requested presentation changes

- The displayed NeuroAI card title is **NeuroAI performance–cost frontier**, without “over time.” The card, preview, popup and export use that display title; its archived source key/title, observations and all existing fragments remain unchanged.
- `acquisition-economics` moves from Mapping Scale into **Cost and automation**, in a **Connectomics imaging cost efficiency** card. Only presentation ownership changes: all existing plotted values, approximate qualifiers, units, source estimates and protocol scopes stay exact. The current source plot already displays approximate $/voxel; this move does not invert it again. It is acquisition cost, not end-to-end cost to map 1 cm³. `acquisition-rates` stays in Mapping Scale. Both old panel fragments now reveal Cost and automation; the new card fragments are `#draft-imaging-cost-efficiency` and `#metric-imaging-cost-efficiency`.

## Counts and tests

The curated catalog has **13 cards, 14 numeric plots, 77 observations and one event timeline** in the five-group catalog. The neuron capability chart is additional to those explicitly curated totals and is counted in its category header. The archival evidence still has 23 original plot records / 85 observations; the shared snapshot is unchanged.

Tests mount real components and the actual page, not just definitions. They check one SVG / twelve exact source identities, logarithmic coordinates, five series, the empty/interactive inspector, source rows, generic export URL and qualified serialized image text; duplicate removal; all thirteen recording aliases; tissue alias; cost placement; search, collapsed categories, focus and Back/Forward. Native browser geometry and clipboard decoding are deliberately left to the parent. No auth source, browser fixture, deployment or hosted state is changed by this implementation.

## Group navigation

The five groups are ordered Neurotech Engagement; Human interfaces and recordings; Mapping Scale (including paired datasets and open data); Cost and automation; Simulation and NeuroAI. All default to headline + one featured chart, not all-collapsed. Independent collapsed/preview/full states retain existing instances and source identities. See [Metrics navigation](metrics-navigation.md) for exact featured charts, controls, selectors and search/history semantics.
