# Metrics navigation

The Field velocity plate has one Metrics index and Expectations. Scientific categories follow the six-category deck order; Field context separately retains actual pace, attention and commitments readings. The source deck is not edited or embedded. Unsupported proposals belong to the separate research-backlog workstream, not the reader-facing catalog.

## Inventory and count semantics

| Category | Displayed metrics | Numeric charts | Observations | Timelines |
|---|---:|---:|---:|---:|
| Mapping scale | 3 | 5 | 27 | 0 |
| Cost and automation | 2 | 4 | 15 | 0 |
| Tissue quality and annotation | 1 | 2 | 3 | 0 |
| Human interfaces and recordings | 2 | 6 | 17 | 0 |
| Data access and scientific use | 3 | 4 | 9 | 0 |
| Simulation, NeuroAI, and impact | 3 | 2 | 8 | 1 |

The actual catalog contains 14 metrics: 23 curated numeric charts with 79 observations, plus one categorical timeline. Multi-panel metrics count once as a metric and once per numeric chart. Timeline events are not numeric observations. The hero reports six scientific categories, 23 curated numeric panels, 79 observations and one event timeline; no gap count or page-wide coverage badge. Other pages retain their explicitly supplied PlateHero statuses.

All 19 source definitions remain unchanged internally. The five unsupported definitions are not rendered as cards or included in search; their old links remain compatible as category-level aliases. `DraftChartsSection` retains its archival `showGaps=true` default for source-preservation tests, while the actual Metrics mount explicitly passes `showGaps={false}`. No standalone Draft tab is mounted.

Mapping additionally contains the original tissue-volume reference view (mm³). Human interfaces and recordings additionally contains the simultaneous-neuron and recording-hours reference views. Counts label these as one and two reference views respectively, separate from the curated charts. Existing extrapolations, modal source tables and provenance remain intact. Field context contains two pace cards, two Google Trends cards and the commitments reading. The unwired Markets and Channel count frontier placeholders are absent from this page; their source definitions are retained.

## Scientific context and consumer-source correction

The existing chart summaries, plot implementation, raw coordinates, source tables and comparability definitions are unchanged. Essential scope remains beside the charts: the boundary-truncated mouse reconstruction, H01/MICrONS identities, acquisition economics estimates, RoboEM benchmark scopes and MICrONS proofreading denominator qualifications are not hidden or generalized. Former “Still missing” paragraphs retain their exact text as **Context** within each chart's closed Definition and comparability disclosure, rather than prominent unfinished notices.

The commitments consumer now reads the already-curated `revealed_commitments` record in `src/data/field-velocity/neurotech.snapshot.json`, rather than the stale duplicate in `src/data/velocity/neurotech_records.json`. The same 67 participants are correctly labeled **participants in implantable BCI studies through December 2023**, including intracortical, endovascular and ECoG systems—not an active installed base. Full source scope remains verbatim in closed Definition and source details. The stale intracortical-only/1998–2024 label, enrollment-acceleration claim and old milestone comparison bar are not displayed. Search uses the same shared record. This is a consumer-source binding correction, not new research or a data-file edit; both source JSON files remain byte-identical.

## Search and disclosure

All seven categories start collapsed on a fresh index, including the legacy `#draft-charts` index URL. Native buttons provide Enter/Space activation, `aria-expanded` and `aria-controls`; multiple categories can remain open. Stable QA hooks are `data-metrics-category`, `data-metric-toggle`, `.metric-category-name`, and the labeled `#metrics-search` input.

Headers use a grid with a separately wrapping title, keeping the disclosure icon aligned with the first title line on narrow screens. Numeric chart counts use singular/plural labels and omit gaps/placeholders.

Search matches actual metric titles, panel metadata, species, datasets and retained source metadata, not hidden unsupported definitions, unwired placeholders or the stale commitments claim. Curated metrics filter individually; retained reference/context groups remain together to preserve shared scope. Result counts refer to matching **categories**, not individual charts. Search temporarily reveals matches without changing the user's expansion selection. Clear restores that selection. Disclosure buttons are disabled during search; Expand all and Collapse all clear search and apply their labeled action.

## Canonical links and aliases

`src/data/draft-chart-links.ts` remains the unchanged identity manifest: 19 candidate targets and 24 panel/timeline targets. The 14 actual metric cards and 24 panel/timeline targets retain their 38 exact legacy `#draft-…` / `#draft-panel-…` IDs and canonical `#metric-…` / `#metric-panel-…` aliases. Share controls use canonical links. The pinned old manifest remains in `tests/fixtures/draft-chart-links.json`.

The five retired candidate hashes, and their canonical aliases, are empty anchor aliases at the containing real category header. Both forms select Metrics, clear conflicting search, open that category and scroll to its header without resurrecting a placeholder or gap message. Actual chart/panel links reveal and scroll their exact target after layout. Repeated navigation reveals a collapsed target without adding history. Links preserve origin, base path and query, including repeated parameters. Back/Forward and Expectations transitions retain the navigation subscription and modal focus-return contract; no route/auth logic changed.

Legacy modal anchors remain unchanged: `simultaneously-recorded-neurons`, `tissue-mapped`, `neural-recording-hours`, `idea_vintage`, `latency_compression`, `google-trends-neurotech`, `google-trends-neuralink`. Their category opens before the modal is inspected. Modal close and focus restoration retain StrictMode coverage. Fresh modal entry waits for the category to become visible before focusing Close; native browsers reject focus inside a hidden ancestor. The retained `#revealed_commitments` fragment reveals and scrolls Field context without opening a modal.

Inline-chart scrolling consumes a one-shot navigation intent. After following a chart link, searching, clearing search, or toggling unrelated categories does not scroll back to that old target. Fresh URLs, history transitions and explicit repeated links still reveal their targets. Regression tests cover both legacy and canonical fragments.

## Validation

Behavior tests cover the actual page inventory, no placeholders, concise hero, contextual limits, corrected commitments binding, collapsed index, search/clear/bulk actions, reference placement, all old/canonical targets, retired-category aliases, direct/copy URLs, Back/Forward and existing cross-category modal focus return. Source-preservation SHA-256 assertions pin definitions, evidence, plot implementation and retained data/provenance byte-for-byte against base `2d258e7ed05755e88fabfe23bee295974dbd4d7f`.

Full unit tests, typecheck and focused changed-file ESLint are the implementation gates. Whole-repository lint has five independently reproduced pre-existing errors outside this change (theme-toggle, timeline immutability and two module-variable declarations); it is not a clean baseline. Native layout/keyboard/browser QA and independent critique are performed separately by the parent against a frozen local revision; jsdom/CSS assertions alone do not verify 320px browser geometry.
