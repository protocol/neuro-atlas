# Acquisition metric modes — implementation verification

Base: `b6f99efaa80251c4fbbe608a329776617ae383ac`.

## TDD evidence

Each behavior slice was exercised red before its implementation. Raw logs are retained in the task worktree under `.qa/acquisition-modes/` (ignored local evidence).

| Slice | Red log | Green log |
|---|---|---|
| Mode controls, reciprocal values, inverted ordering, original x geometry and default preview | `01-modes-red.log` | `01-modes-green.log` |
| Above-chart default-off target toggle and converted thresholds | `02-targets-red.log` | `02-targets-green.log` |
| Independent cost-halving labels, bounded dashed extension and computed crossing years | `03-trends-red.log` | `03-trends-green.log` |
| Stable focus/pinned popups with all three values and source qualifications | `04-tooltip-red.log` | `04-tooltip-green.log` |
| Readable assumptions, neutral modal title, selected image/data units and original fit-basis metadata | `05-display-export-red.log` | `05-display-export-green.log` |
| Compact SI per-voxel ticks and cost-axis precision within original margin | `07-si-ticks-red.log` | `07-si-ticks-green.log` |
| Visible crossing/extrapolation keys in image exports, not merely hidden descriptions | `09-visible-extrapolation-red.log` | `09-visible-extrapolation-green.log` |
| Compact preview key; long crossing explanations only in the expanded chart | `10-compact-preview-red.log` | `final-preview-regressions.log` |

The popup red run caught projected-point identity churn: `usePointTooltip` could not retain selected cloned points. The projected plot is now memoized by source plot and selected metric. Both native focus-style events and pinning are tested in all modes; switching metrics clears stale inspection without restoring focus to a mark.

## Passing verification

- **101 affected tests passed** (`focused-final.log`): acquisition modes/source math, connectomics provenance and model/UI/motion/export behavior, historical fits/layout/previews, unchanged shared count formatting, curated source preservation, chart inventory, BCI trend rendering, and the full readable-URL navigation suite including Back/Forward. This run preceded only the final two-paragraph-to-compact-preview-key change.
- **35 affected tests passed on the final implementation** (`final-preview-regressions.log`), including all 11 new acquisition tests, acquisition source math, benchmark animation/reversals/reduced motion, source inspection, narrow target/badge clearance, export checks and preview behavior.
- `npm run typecheck` passed (`typecheck.log`).
- ESLint passed for every changed TS/TSX/test file (`lint.log`). npm emits an existing environment warning about its `jobs` configuration; no TypeScript or ESLint diagnostics remained.
- `git diff --check` passed. `src/data/` and `src/lib/large-count-label.ts` remain byte-for-byte unchanged from the base.

Final focused command:

```sh
node --import tsx --test --test-concurrency=2 \
  tests/acquisition-*.test.mjs \
  tests/connectomics-brain-scale-ui.test.mjs \
  tests/connectomics-tooltip-clear.test.mjs \
  tests/connectomics-benchmark-collisions.test.mjs \
  tests/historical-trend-preview.test.mjs \
  tests/voxel-number-readability.test.mjs
```

The original acquisition-only opaque preview/SVG hashes no longer describe the intentionally changed default cost view. They were replaced by explicit independent x-coordinate, source-value, reciprocal, fit and displayed-unit assertions rather than regenerating opaque hashes. Public-data SVG goldens and all source/provenance goldens and normalizers are unchanged.

An initial repository-wide parallel test attempt was intentionally terminated under shared CPU load; `.qa/acquisition-modes/02-regression.log` is an interrupted record, not a suite verdict. Initial bounded regressions exposed stale expectations for the old acquisition default/heading; those expectations were updated narrowly. The final readable-URL suite and source/provenance checks passed. No production build, browser screenshots, native clipboard/raster QA, review, PR, push, merge or deployment is claimed by this implementation handoff.

## Source discrepancy and display boundary

- Point #10 `exaspim2024`: `1e11 voxels/$` → **$18.75B**, not the requested roughly $50–100B.
- Point #8 `peem2024`: prospective `2e10 voxels/$` → **$93.75B**.
- Human image denominator: **1.875×10²¹ voxels** at 1,200,000 mm³ and 4×4×40 nm.
- Original x domain remains **2015–2025**. Expansion continues dashed only from 2024 to 2025; EM ends at the chart edge and has no visible forward interval.
- Computed $1B crossings are **2032.741933127535** and **2039.3328704849728**. Both are explicitly labeled extrapolations beyond the displayed range, including visible image-export keys.
- The archived raw $/voxel plot sharing the internal ID is excluded from the new modes. No source observations, source quotations, model inputs, published fragments or aliases were altered.

Production-build/native QA, integration with concurrent work, and release review remain separate verification stages.
