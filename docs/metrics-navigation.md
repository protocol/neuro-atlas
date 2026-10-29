# Metrics navigation

The Field velocity plate has one Metrics index and Expectations. Five groups follow the current reading order: Neurotech Engagement, Human interfaces and recordings, Mapping Scale, Cost and automation, Simulation and NeuroAI. Mapping Scale includes paired datasets and open data, formerly under Data access and scientific use. The source deck is not edited or embedded. Unsupported proposals belong to the separate research-backlog workstream, not the reader-facing catalog.

## Inventory and count semantics

| Group | Curated cards | Curated numeric charts | Curated observations | Timelines |
|---|---:|---:|---:|---:|
| Neurotech Engagement | — | — | — | — |
| Human interfaces and recordings | 2 | 2 | 19 | 0 |
| Mapping Scale | 5 | 6 | 26 | 0 |
| Cost and automation | 3 | 4 | 24 | 0 |
| Simulation and NeuroAI | 3 | 2 | 8 | 1 |

The hero reports five groups, 14 curated numeric charts, 77 curated observations and one event timeline. Human interfaces and recordings additionally retains the unique seven-observation simultaneous-neuron capability chart, so its header counts three charts. Neurotech Engagement contains two pace charts, two Google Trends charts and the commitments reading. The curated catalog has thirteen cards; counts never treat aliases or preview/detail presentations as additional observations.

All 19 source definitions remain archived. `METRIC_CHARTS` adds only a presentation definition for acquisition cost efficiency, moved from Mapping Scale to Cost and automation with unchanged plot values and scope. Unsupported and previously retired panels remain absent from the actual page. The separate Draft tab is not mounted. `DraftChartsSection` retains its archival `showGaps=true` default for source-preservation tests; Metrics passes `showGaps={false}`.

The duplicate tissue and hours reference views are retired. Their original observations remain in the snapshot and corresponding curated charts; the generic reference introduction and self-links are removed. The unique neuron chart and its default-off scenarios remain. See [recording-hours consolidation](recording-hours-consolidation.md) for exact scope, aliases and conservation checks.

## Scientific context and consumer-source correction

Original raw coordinates and source qualifications remain unchanged; summaries and chart grouping follow the presentation projection. Essential scope remains beside the charts: the boundary-truncated mouse reconstruction, H01/MICrONS identities, acquisition economics estimates, RoboEM benchmark scopes and MICrONS proofreading denominator qualifications are not hidden or generalized. Former “Still missing” paragraphs retain their exact text as **Context** within each chart's closed Definition and comparability disclosure, rather than prominent unfinished notices.

The commitments consumer now reads the already-curated `revealed_commitments` record in `src/data/field-velocity/neurotech.snapshot.json`, rather than the stale duplicate in `src/data/velocity/neurotech_records.json`. The same 67 participants are correctly labeled **participants in implantable BCI studies through December 2023**, including intracortical, endovascular and ECoG systems—not an active installed base. Full source scope remains verbatim in closed Definition and source details. The stale intracortical-only/1998–2024 label, enrollment-acceleration claim and old milestone comparison bar are not displayed. Search uses the same shared record. This is a consumer-source binding correction, not new research or a data-file edit; both source JSON files remain byte-identical.

## Search and disclosure

Every group has three states, exposed as `data-metric-state="collapsed|preview|full"`:

- **Collapsed:** headline only.
- **Preview (default):** headline plus one featured chart. In order: Google Trends neurotech search terms (not the Neuralink brand series); neural recording hours; open-access connectomics data; acquisition economics; NeuroAI performance–cost frontier.
- **Full:** all charts in that group. No preview/full copies are created; the existing card instances are revealed.

The headline button (`data-metric-toggle`) switches collapsed/preview. A separate native Show all / Show featured button (`data-metric-more`) switches preview/full. Both have `aria-controls` and `aria-expanded`; keyboard focus remains on the activated control. Bulk Expand all and Collapse all set all groups to full/collapsed. QA can select groups with `data-metrics-category`, with names exactly matching the table above. Historic category content IDs remain 6, 3, 0, 1, 5 in the new visual order.

Search matches group names, actual metric titles, panel metadata, species, datasets and retained source metadata, not unsupported definitions or unwired placeholders. Matching non-featured charts are revealed in full state; Clear restores the previous group states. Search-time disclosure buttons are disabled. Result counts describe matching groups, not individual charts.

Navigation to a featured chart reveals preview (without collapsing an already-full group); non-featured charts reveal full. Legacy aliases follow their actual chart's group, including the moved acquisition-cost panel and merged mapping/data group. Search is cleared before explicit navigation. These are navigation intents, not effects replayed on ordinary searching or disclosure changes.

## Canonical links and aliases

`src/data/draft-chart-links.ts` keeps all existing IDs and adds only `draft-imaging-cost-efficiency` (plus its canonical alias). The manifest has 20 card targets and 26 panel/timeline targets; multiple panel IDs may alias one plot. All 46 IDs have both `draft-` and `metric-` forms. The independent fixture pins the deliberate recording-hours consolidation and acquisition-economics move. Shared recording-hours actions use `#metric-recording-hours`; its five dataset panel IDs remain compatibility aliases.

The five retired candidate hashes, and their canonical aliases, are empty anchor aliases at the containing real category header. Both forms select Metrics, clear conflicting search, open that category and scroll to its header without resurrecting a placeholder or gap message. Actual chart/panel links reveal their containing group and open the exact URL-selected popup without scrolling the background. Repeated navigation reveals a collapsed target without adding history. Links preserve origin, base path and query, including repeated parameters. Back/Forward and Expectations transitions retain the navigation subscription and modal focus-return contract; no route/auth logic changed.

Retained modal anchors are `simultaneously-recorded-neurons`, `idea_vintage`, `latency_compression`, `google-trends-neurotech`, and `google-trends-neuralink`. Their category opens before the modal is inspected; Close focus and restoration retain StrictMode coverage. `#tissue-mapped` and `#neural-recording-hours` open their corresponding curated chart popups rather than the retired reference renderers. The retained `#revealed_commitments` fragment reveals Neurotech Engagement without a modal.

Only retained inline readings and retired-category anchors scroll, consuming a one-shot navigation intent. Popup entry, dismissal and repeat links keep the background fixed. After following a chart link, searching, clearing search, or toggling unrelated categories does not scroll back to that old target. Fresh URLs, history transitions and explicit repeated links still reveal their targets. Regression tests cover both legacy and canonical fragments.

## Validation

Behavior tests cover the actual page inventory, no placeholders, concise hero, contextual limits, corrected commitments binding, all three group states, search/clear/bulk actions, unique capability placement, all old/canonical targets, retired-category aliases, direct/copy URLs, Back/Forward and existing cross-category modal focus return. Source-preservation assertions pin archived definitions and shared data/provenance; conservation tests compare actual plotted identities and source-qualified values. Native QA is separate from these DOM and data tests.

Full unit tests, typecheck and focused changed-file ESLint are the implementation gates. Whole-repository lint has five independently reproduced pre-existing errors outside this change (theme-toggle, timeline immutability and two module-variable declarations); it is not a clean baseline. Native layout/keyboard/browser QA and independent critique are performed separately by the parent against a frozen local revision; jsdom/CSS assertions alone do not verify 320px browser geometry.
