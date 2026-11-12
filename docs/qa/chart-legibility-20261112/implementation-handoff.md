# Implementation handoff — Field Velocity chart legibility

## Scope and acceptance

Code-only feature work on `feat/atlas-chart-legibility-20261112`, based on `05a314c`. No push, PR, merge, deployment, browser, service, or messages. The parent owns full standard/build gates, independent review, actual native interaction/geometry checks, and PNG readability.

- `acceptance-inventory.json` and `acceptance-inventory.md` enumerate **all 24 visible charts**, in actual route order, with an applies/not-applicable decision for all four requested criteria. Static rendering is reconciled against the parent's current native title list; every native acceptance item remains explicitly pending.
- Shared fixed-size marks grow from 4/5px to 5/6px preview/expanded. Curve and publication marks use the actual SVG CTM. Responsive draft/event marks retain content-pixel coordinates and overlap-ring semantics. Dense weekly samples retain their distinct 2.5px contract; waffle and Sankey area/count encodings are untouched.
- Thin annual guides use the same exact date/year projections as observations, with non-scaling 1px strokes and no hit interception. Non-temporal scatter/growth/composition/Sankey axes never receive year divisions.
- New connections are explicitly scoped to TUSZ releases, Neuralink cumulative-recipient checkpoints, and reliable annual citation medians. Existing term/publication paths are retained. Cost-technique categories, different research projects, pooled/review cohorts, device translation pathways, separate recording studies, and categorical events are not inferred to be series.
- Desktop/medium rail width changes from `/ 1.65` to `/ 1.25`; mobile still has the established 24px next-card peek. Plot heights reflow naturally instead of shrinking labels. The existing measured equal-height card contract and scrolling/focus/history implementation are retained.
- Full scientific data objects, source dates, values, units, qualifications, source tables, and original methodology remain unchanged. Preview re-projection tests now compare normalized quantitative coordinates rather than incorrectly requiring identical pixel y positions in the deliberately shorter preview.

## Observed RED → GREEN evidence

Tests were written and run before each production slice:

1. **Point radii:** five tests initially failed at old 4/5px marks and the growth chart's unnormalized 5-unit glyphs. After the shared 5/6px contract and CTM-normalized growth marks: five passed; existing typography tests passed as well.
2. **Annual guides:** six temporal-family assertions initially failed because guides were absent; the non-temporal exclusion assertion already passed. After the common calendar guide renderer: seven passed. The initial Trends fixture incorrectly assumed a six-year range and read an obsolete public snapshot; it was corrected to the actual bundled source's 2024/2025/2026 boundaries and exact UTC projection, not relaxed to accept arbitrary lines.
3. **Series paths:** four tests initially failed because explicit TUSZ/Neuralink/citation paths and track partitioning were absent. After implementation: four passed, with exact path-to-source-center checks and all other curated plots required to remain unconnected. A separate accessibility assertion then failed on the old “Separate source observations” label and passed after source-faithful connected-series wording was added.
4. **Landscape rails:** four assertions initially failed on the `/ 1.65` width budget, 340px draft preview, 360×220 scaled curve frame, and 270px Trends preview. After implementation: four passed, including preserved full/export coordinate frames and the retained equal-height CSS contract.
5. **Inventory:** the current-route reconciliation test failed on the obsolete “Publication-affiliation sector changes” title. Updating the native fixture to the actual curly-apostrophe title made it pass. The native harness default now reads the current checkout's fixture instead of a retired absolute worktree path.

Existing tests were updated only where the approved presentation contract changed: explicit radii, the one supported TUSZ line/wording, normalized preview y coordinates, and year-guide-aware horizontal-grid selection. The historical reference geometry hashes remain unchanged: the comparison strips only separately tested presentation additions and restores their old radius/stroke metadata before hashing. No assertion is skipped, no tolerance is widened, and no scientific golden is replaced.

## Executed verification

- Final focused feature command:
  `node --import tsx --test tests/chart-legibility-inventory.test.mjs tests/chart-legibility.test.mjs tests/chart-annual-guides.test.mjs tests/chart-series-connections.test.mjs tests/chart-landscape-rails.test.mjs`
  **21 passed, 0 failed.**
- Actual export callback replay after the last obsolete assertion was updated:
  `node --import tsx --test --test-name-pattern='unified recording-hours export' tests/chart-sharing.test.mjs`
  **1 passed, 0 failed.** It checks all 12 marks, original lower bounds/scopes, and the exact single TUSZ polyline coordinates in the serialized exported chart.
- A broader scoped chart/draft/metrics/reference/publication/recording/performance/pace/Trends regression run completed with **383 passed, 1 failed** in 384 tests. The sole failure was the obsolete exported “Unconnected observations” wording above; its targeted final rerun passed. This is **not** claimed as a fresh all-green broad run. An earlier 300-second attempt was interrupted; the longer retry completed. No additional broad rerun was started after the parent requested the pin.
- Separate focused existing batches passed: reference font/geometry + recording consolidation **21/21**; export/typography/actions/rail-focus/recording behavior **56/56**; new feature + equal-height/featured stability **29/29**. Some overlap across batches is intentional; these counts are not added into a claimed unique total.
- `npm run typecheck`: passed (`next typegen && tsc --noEmit`).
- Changed-source ESLint: passed for all ten changed/new TS/TSX source files listed below.
- `git diff --check`: passed.
- Dependencies installed with `npm ci` inside this isolated worktree; no shared symlink/install.

Changed-source lint paths:
`src/lib/chart-presentation.ts`, `src/lib/draft-chart-types.ts`, `src/data/metric-chart-visibility.ts`, `src/components/chart-year-guides.tsx`, `src/components/use-metric-preview-width.ts`, `src/components/draft-chart-plot.tsx`, `src/components/performance-curves.tsx`, `src/components/google-trends.tsx`, `src/components/pace-readings.tsx`, `src/components/publication-charts.tsx`.

## Observed issues and visual/scientific caveats

- `npm ci` reported 10 vulnerabilities (7 moderate, 3 high) on the unchanged lockfile, plus existing package/install-script policy warnings. No dependency upgrade was attempted.
- Existing test harnesses emitted nonfatal `about:blank` CSS-import warnings and one logged `scrollIntoView` rejection in the removed-brand-chart test, although that test passed. These are observed harness outputs, not claimed to be independently reproduced on baseline. No navigation or harness behavior was changed to suppress them.
- Native actual CSS-pixel radii, font/glyph bounds, settled equal heights, next-card paint/hit geometry, contrast, source focus/tap/history, and actual downloaded raster readability are **unverified here**. Source/serialized-SVG and jsdom checks do not substitute for native QA.
- Annual guides do not imply day-level source precision. Single-day recording views have no invented year span. Forecast/extrapolation guides stay tied to the historical observation years; speculative centuries are not filled with annual lines.
- TUSZ release hours overlap and are never summed. Neuralink checkpoints retain their existing mixed implantation/disclosure date basis; connecting them does not resolve that source limitation. Citation lines exclude hollow under-indexed points and are not fitted trends.
- Wider rail geometry preserves count/area semantics, but native QA should especially inspect dense growth labels, waffle composition, Sankey labels/internal scrolling, overlapping TUSZ rings, and narrow scatter annotation placement.

For parent native replay, run from this checkout or set `ATLAS_QA_INVENTORY` to this checkout's `tests/fixtures/chart-design-inventory.json`. Full native QA and clean-critic/independent review have deliberately not been delegated or run by this worker.
