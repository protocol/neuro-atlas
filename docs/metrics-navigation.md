# Metrics navigation

The Field velocity plate has one Metrics index and Expectations. Scientific categories follow the six-category deck order; Field context separately retains pace, attention, commitments and markets. The source deck is not edited or embedded.

## Inventory and count semantics

| Category | Definitions | Numeric panels | Timelines | Evidence gaps |
|---|---:|---:|---:|---:|
| Mapping scale | 3 | 5 | 0 | 0 |
| Cost and automation | 3 | 4 | 0 | 1 |
| Tissue quality and annotation | 3 | 2 | 0 | 2 |
| Human interfaces and recordings | 2 | 6 | 0 | 0 |
| Data access and scientific use | 4 | 4 | 0 | 1 |
| Simulation, NeuroAI, and impact | 4 | 2 | 1 | 1 |

These counts are derived from the unchanged curated evidence, not inferred observations. There are 19 definitions, 23 numeric panels, 79 numeric observations, one categorical timeline and five unplotted evidence gaps. A multi-panel definition is counted once as a definition and once per numeric panel. Timeline events are not numeric observations. Bounded proxy panels retain their “Still missing” caveats and are not counted as wholly unplotted evidence gaps.

Mapping additionally contains the earlier tissue-volume reference view (mm³); Human interfaces and recordings additionally contains simultaneous-neuron and recording-hours reference views plus the explicitly unwired channel-count placeholder. These are labeled separately from curated panel counts; none replaces or duplicates the curated panel component. Existing extrapolations, modal source tables and provenance remain intact. Field context retains the two pace cards, two Google Trends cards, commitments reading and unwired markets slot.

## Search and disclosure

All seven categories start collapsed on a fresh index, including the legacy `#draft-charts` index URL. Native buttons provide Enter/Space activation, `aria-expanded` and `aria-controls`; multiple categories can remain open. Stable QA hooks are `data-metrics-category`, `data-metric-toggle`, and the labeled `#metrics-search` input.

Search matches titles, panel metadata, species, datasets and retained source metadata. Curated candidates filter individually; retained reference/context groups remain together to preserve their shared scope. The live result count explicitly counts matching **categories**, not individual charts. Search temporarily reveals matches without changing the user's expansion selection. Clear restores that selection. Disclosure buttons are explicitly disabled during search; Expand all and Collapse all clear search and apply their labeled action.

## Canonical links and aliases

`src/data/draft-chart-links.ts` is the explicit stable identity manifest: 19 candidate targets and 24 panel/timeline targets. New direct/copy controls use `#metric-…` and `#metric-panel-…`. Every old `#draft-…` / `#draft-panel-…` ID remains an exact DOM alias; canonical IDs replace only that initial prefix. IDs never derive from edited display titles. The pinned old manifest remains in `tests/fixtures/draft-chart-links.json`.

Both old and new fragments select Metrics, clear conflicting search, open the containing category, expand gap details when appropriate and scroll the exact target after layout. Repeated navigation can reveal a collapsed target without adding history. Links preserve the actual origin, base path and query, including repeated parameters. Back/Forward and Expectations transitions retain the same navigation subscription and modal focus-return contract.

Legacy modal anchors remain unchanged: `simultaneously-recorded-neurons`, `tissue-mapped`, `neural-recording-hours`, `idea_vintage`, `latency_compression`, `google-trends-neurotech`, `google-trends-neuralink`. Their category opens before the modal is inspected. Modal close and focus restoration retain StrictMode coverage.

## Validation

Behavior tests cover the collapsed index, search/clear/bulk actions, reference placement, all old and canonical targets, direct/copy URLs, Back/Forward, and existing cross-category modal focus return. SHA-256 assertions pin definitions, evidence, plot implementation and retained data/provenance byte-for-byte against base `2d258e7ed05755e88fabfe23bee295974dbd4d7f`. Native layout/keyboard/browser QA is performed separately against a frozen local build.
