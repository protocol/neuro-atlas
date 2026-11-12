# Independent chart-legibility review — original findings

## Verdict: CANDIDATE — two located P2 issues; no P0/P1 found

The requested chart delta is substantially on target: the visible desktop charts are wider and shorter, fixed-size marks are larger, temporal plots get quiet annual divisions, and the new TUSZ/Neuralink/citation connections do not join unrelated techniques, projects, species, or cohorts. **It is not yet a clean pass:** the citation modal contradicts its new line, and the all-24 connection decision incorrectly excludes a source-supported Neuralink series in the participant overview.

This is the completed original hunt, not release approval. Close the findings below, reconcile the parent's already-open narrow-screen work, and finish the final native/full-gate ledger. Re-review should be bounded to these findings and changed dependencies, not another broad design hunt.

### Exact scope and base qualification

- Reviewed disposable source snapshot: `/opt/data/tmp/atlas-chart-legibility-review-20261112` at **`ab45005197005c08b5d91e4af0b73ce598e80964`**, compared with **`05a314c3889836230d179d7bb5b1f626b6804193`**. Read the complete actual diff and all three acceptance/handoff documents.
- No snapshot edits, commits, rebases, browser operations, services, provider requests, messages, or releases were performed. Final status verification is recorded below.
- Parent subsequently reported that PR102 was merged; runtime **`82e40cea6155f491dec0b67caed49d505c331072`** uses main **`cc1ceaa`**, with deterministic byte identity for all 31 chart-changed paths. That makes the source review portable to the chart bytes, **not an independent approval of PR102 or a reviewer-operated runtime-pin check**.
- Inspected both actual owner screenshots with vision. Also inspected parent-captured full-size representative previews/dialogs/downloaded PNGs and reviewer-owned contact sheets of all 24 native PNGs. These are observations of the parent's artifacts; I did not perform their browser interactions.

## C1 — P2: Citation latency's visible explanation still says the newly connected points are separate

**Location:** `src/components/performance-curves.tsx:270`; connected-series construction/rendering at `:178–182`, `:238`; opt-in at `src/components/pace-readings.tsx:20–24`.

**Observed:** Citation latency now correctly draws one path through its reliable annual medians. Its accessible SVG label and serialized export evidence correctly say those observations connect. Immediately below the on-screen plot, however, the visible `.pc-chart-note` still reads:

> Separate source observations; overlapping markers retain their coordinates.

The note checks only `data.line`, while this chart deliberately keeps `line: false` and opts into `connectTracks`. This is new visible inconsistency caused by the feature, not a preexisting disagreement with an unchanged plot.

**Independent reproduction:** `review-probes/review-probes.mjs`, final result `knownCitationNoteContradiction` in `review-probe-results.json`: one `idea_vintage` path, connected-series aria-label, contradictory visible note. Confirmed in actual parent screenshot `native/dialog-1440-1.png`, below “Publication year.”

**Closure:** Make the visible note use the same explicit connected-series semantics as the chart/export; retain the separate-observation wording for genuinely unconnected curves. Add a regression on the visible note, not only the aria-label or hidden export evidence. No data/methodology change is needed.

## C2 — P2: The participant overview misses the same supported Neuralink sequence already connected in the recipient chart

**Locations:**

- `src/components/performance-curves.tsx:318–321` — `MeasurementCard` always creates a non-connected `PlotData`.
- `src/components/participant-commitments.tsx:27–32` — actual overview passes through that path.
- `docs/qa/chart-legibility-20261112/acceptance-inventory.md:45–51`, especially `:50`, and JSON `:76–98` — entire overview is marked not applicable for series connections.
- Source basis: `src/data/field-velocity/neurotech.snapshot.json:555–608`; reader-facing definition `src/data/participant-reader-copy.ts:4,12–16`.

**Observed:** “Implanted BCI participants over time” contains five points explicitly identified as **Neuralink cumulative recipients**, dated `2024-01-01`, `2024-07-01`, `2025-02-05`, `2025-06-02`, `2026-01-28`, with values **1, 2, 3, 5, 21**. These are exactly the same dates, values, and primary-source URLs that the feature connects in “Selected chronic intracortical recipients.” The overview draws no series path in preview/modal/export.

Different programs and review cohorts must remain separate. That is **not** a reason to leave a repeated, explicitly cumulative within-program sequence unconnected. The owner's request was to connect related datapoints across the complete chart set; the inventory's blanket exclusion is narrower than that request and internally inconsistent with the implemented recipient chart. This is an omitted requested improvement, not a claim that the baseline had a newly introduced data error.

**Independent reproduction:** `review-probes/participant-connections.mjs` and `participant-connection-results.json` prove five overview Neuralink marks, zero overview connections, and exact source/date/value identity with the already-connected curated series. Confirmed in `native/dialog-1440-3.png` and `native/export-3.png`.

**Closure:** Explicitly opt the overview's supported Neuralink cumulative track into a within-track connection; do not enable all tracks or infer paths from shared colors. Retain the mixed implantation/disclosure date caveat and separate review/program cohorts. Update the inventory decision and test preview/modal/export parity, including track isolation. This finding does not require adding any other program's line without its own source support.

## What passed the independent review

### Owner-reference comparison

- Recording-hours reference: a landscape plot with sizable marks, annual guides, one connected TUSZ release history, and isolated other datasets. The feature's actual desktop recording preview and native PNG preserve that relationship. TUSZ releases are overlapping snapshots, not additive hours; the new legend/evidence says so. Existing rings keep coincident releases at their source centers.
- Acquisition-cost reference: broad plot, annual divisions, distinct unconnected techniques. The actual feature preview/PNG preserve this; optical/EM colors are categories, not justification for a line. The source's prospective PEEM distinction remains in the legend.
- The reference images do not mandate the exact 5/6px radii or `/1.25` divisor. Those are implementation choices. They appear sensible in the inspected actual desktop surfaces; they are not substituted for the owner's real request.

### All-24 scope and scientific invariance

- Independently rendered the actual route and reconciled **24 titles in route order**, not merely 24 definitions. `review-probe-results.json` contains the per-chart matrix and source-mark/guide/path counts.
- Deep-compared baseline and current derived curated evidence after removing only new `connections` metadata: **14 plots, 78 observations, all remaining fields exactly equal**, including values, dates, units, log/linear scales, qualifiers, source URLs/quotes, notes, colors and marker kinds.
- Compared old/new draft rendering at measured content widths **176, 230, 500, 780**, in both preview and full modes: **112 chart/width/mode comparisons passed**. Every quantitative x coordinate and normalized y coordinate remained invariant. No new source-glyph overflow outside the SVG frame was found by the deterministic shape-bounds probe.
- Shorter previews can legitimately create a new ring when unchanged measurements become closer in screen space. I rejected an over-strict initial probe that demanded identical ring membership; it did not establish a product defect. Ring centers and quantitative values remain pinned.
- Temporal guides share actual year/date projections; numerical error/energy axes, growth percentage, waffle composition, and Sankey counts receive no fake calendars. Existing publication/Trends paths, missing-value gaps, uncertainty intervals and under-indexed hollow marks are preserved.
- Raw scientific datasets, recording evidence, navigation, recording-view parsing, modal and tooltip implementations, auth/API files, and lockfile are unchanged by the reviewed diff. No funding-area encoding or approval-scope change is in this delta.

### Serialization and behavior coverage

- Independent probes retained exact annual-guide geometry and explicit connection counts through `buildChartImage` serialization at the four draft widths. This is SVG evidence, not a claim of independently downloaded raster output.
- Executed existing/new focused test batches on the pinned snapshot: **72/72**, **38/38**, **63/63** passed. Commands/coverage are below. CTM radius/typography, overlap rings, export callback serialization, equal-height observer cleanup, rail focus, query/hash/Back/Forward navigation, source popup/tap/Escape/focus, recording-view date/URL state and publication axes were exercised in jsdom.
- `git diff --check` passed. No claim is made that I independently ran the full suite, typecheck, lint, build or a real browser. The parent's final gates remain authoritative.

## Parent native evidence reviewed and remaining acceptance

The frozen copy of `native/native-progress.json` parses to **24 populated desktop dialogs and 24 populated 390px dialogs**, with exact inventory titles; the desktop section also has 24 previews and `noPageOverflow: true`. I visually swept all 24 parent-downloaded PNGs via four contact sheets, then inspected full-size recording/cost exports, recording/cost desktop previews, citation/participant desktop dialogs, Sankey desktop preview, and citation/NeuroAI narrow previews. No additional substantive styling-delta defect was found in that pass.

Parent reports these settled before/after measurements: desktop cards **649.1×647 → 856.8×615**, 390px cards **284×879 → 284×847**, 320px cards **214×1016 → 214×984**, with equal heights. These are parent native measurements, not my independent browser probe.

The parent also independently reproduced the 320px GrowthPreview heading clipping as **identical before and after** (10.4248px; 214px card / 172px SVG) and has already delegated bounded mobile-peek/label-gap improvements. I inspected the clipped diagnostic but do not relabel it as a newly introduced regression or add it to this review's defect queue. Sector-modal 24/16px count/label hierarchy is intentional; an old blanket 12px assertion is not a product defect.

**Still pending:** C1/C2 closure, the already-open narrow fixes and their affected native replay, final 320px/all-surface/native ledger, final revision pin after fixes, and full standard gates. Do not treat my static tests, image contact sheets, or the older `ab45005` screenshots as proof of those later revisions. PR102 remains out of this review's scope.

## Reproduction and evidence files

All reviewer-created files are outside the source snapshot, under `/opt/data/tmp/atlas-chart-legibility-20261112/`:

- `review-original.md` — this stable original verdict.
- `review-probes/review-probes.mjs`, `review-probe-results.json` — data, 24-route, geometry, export-serialization and C1 probes.
- `review-probes/participant-connections.mjs`, `participant-connection-results.json` — C2 source-identity and actual-component probe.
- `review-probes/baseline-draft.tsx`, `baseline-visibility.ts` — read-only comparison copies from `05a314c`, with imports redirected to unchanged snapshot dependencies; former marker constants restored for baseline glyph comparisons. No original source is altered.
- `review-probes/native-progress-reviewed.json`, `review-evidence-ledger.json` — frozen parent matrix and SHA-256 ledger for 34 inspected/native/probe evidence files. Runtime binding is explicitly parent-reported.
- `review-probes/native-exports-{1-6,7-12,13-18,19-24}.jpg` — review-only contact sheets derived from native exports, not new native captures.

Commands, from the exact source snapshot:

```sh
node --import tsx /opt/data/tmp/atlas-chart-legibility-20261112/review-probes/review-probes.mjs
node --import tsx /opt/data/tmp/atlas-chart-legibility-20261112/review-probes/participant-connections.mjs
```

Passing test batches:

```sh
# 72 passed (two nonexistent requested path tokens did not contribute tests)
node --import tsx --test tests/chart-legibility-inventory.test.mjs tests/chart-legibility.test.mjs tests/chart-annual-guides.test.mjs tests/chart-series-connections.test.mjs tests/chart-landscape-rails.test.mjs tests/chart-presentation.test.mjs tests/reference-preview-font.test.mjs tests/recording-hours-consolidation.test.mjs tests/chart-sharing.test.mjs tests/metric-card-height.test.mjs tests/metric-preview-space.test.mjs

# 38 passed (nonexistent recording-measurement-views/chart-modal tokens did not contribute tests)
node --import tsx --test tests/metrics-equal-heights.test.mjs tests/metrics-featured-stability.test.mjs tests/metrics-rail-focus-snap.test.mjs tests/metrics-modal-entry-focus.test.mjs tests/metrics-navigation.test.mjs tests/point-source-tooltip.test.mjs tests/recording-measurement-views.test.mjs tests/chart-modal.test.mjs

# 63 passed
node --import tsx --test tests/recording-axis-dates.test.mjs tests/recording-evidence-ui.test.mjs tests/recording-viewport.test.mjs tests/recording-sharing-state.test.mjs tests/publication-chart-typography.test.mjs tests/publication-annual-axis.test.mjs tests/draft-chart-marker-styles.test.mjs tests/draft-chart-popout.test.mjs
```

Initial custom-probe failures were reviewer-harness mistakes, not hidden product failures: requiring unchanged overlap membership despite shorter previews, and constructing/looking up chart anchors instead of using the source-owned link record. Those probes were corrected and the final complete run passed. The baseline-copy write's standalone lint also lacked the repository's alias/JSON compiler configuration; the actual `tsx` run resolved the task snapshot and passed. No fabricated provider or raster output was produced.
