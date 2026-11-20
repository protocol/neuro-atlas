# Historical-first acquisition view — implementation verification

Implementation base: `60dab9a3c50ce7993916a269183801e171a3e0ed`, rebased on main `c0ebfcbc22328f94692b503371cb316c10814df6`.

This records the initial historical-first implementation checks. [Final native evidence](acquisition-historical-20261120/README.md) adds the standalone reference's visible 4×4×40 nm/image-only qualification and the later parent regression run; source observations and numerical transformations remain unchanged.

## Display contract

- Historical acquisition efficiency is the default: **Voxels per $**. The only alternative is **$ per voxel**, with cheaper values at the top. There is no human-brain axis.
- All 10 qualified observations, 2015–2025 dates and original x geometry remain intact. Expansion and EM fits keep their original independent inputs, equations and diagnostics; only displayed quantity is transformed.
- No future crossing helper, crossing-year label or dashed forecast continuation remains. The on-site caveat identifies historical rates and heterogeneous resolutions, scope and cost definitions.
- One default-off **Human-brain reference ($1B)** is available only in voxels/$. It is `1.875e12 voxels/$`, displayed as **1.88T**, separate from observations. No five-budget ladder remains.
- Switching reference-on efficiency to reciprocal clears the reference URL state and immediately uses historical bounds, including during ordinary motion. Reciprocal share/export links cannot retain an active reference.
- Point details retain efficiency, reciprocal cost and **Illustrative human-brain acquisition cost**, plus source/year and the original estimate/prospective qualifications. The human conversion is acquisition-only, source-estimated and explicitly not a matched whole-brain project budget.
- The compact preview always shows historical efficiency, reference off, a short heading and one row of separate family-rate labels. Equal-height card CSS and shared type/data sizes are unchanged.
- Reciprocal ticks use SI dollars; their explanation does not use the efficiency M/B/T/Q legend. Human-cost detail has at most four significant digits; large efficiency values use scientific notation without changing the shared formatter.
- Selected JSON identifies the selected quantity and original efficiency fit basis without orphaned human-axis metadata. The source table and a separate original-source JSON retain canonical source values/units regardless of quantity selection. The archived raw $/voxel plot is unchanged.
- Published fragments, earlier aliases, unrelated duplicate query entries, router state and Back/Forward are preserved. Default/invalid/duplicate/unpublished `acquisitionMetric=human-brain` selections sanitize to efficiency. Existing valid `brainScale` tokens remain usable in the eligible view.

## Focused TDD evidence

Local ignored logs are under `.qa/acquisition-reframe/`:

| Behavior slice | RED | GREEN |
|---|---|---|
| Two quantity buttons, efficiency default and original observation geometry | `01-two-quantities-red.log` | `01-two-quantities-green.log` |
| Single optional efficiency-only $1B reference | `02-single-reference-red.log` | `02-single-reference-green.log` |
| Actual mounted controls clear reciprocal reference URL state | `03-reciprocal-url-red.log` | `03-reciprocal-url-green.log` |
| Compact historical preview and one short fit-label row | `04-compact-preview-red.log` | `04-compact-preview-green.log` |
| Stable source details with explicitly illustrative human conversion | `05-illustrative-detail-red.log` | `05-illustrative-detail-green.log` |
| Visible historical-rate/scope caveat | `06-historical-scope-red.log` | `06-historical-scope-green.log` |
| Selected export metadata and separate unchanged source table/download | `07-source-and-selected-export-red.log` | `07-source-and-selected-export-green.log` |
| Ordinary-motion reciprocal domain is historical before export registration | `09-reference-motion-red.log` | `09-reference-motion-green.log` |

The ordinary-motion regression reproduced a hidden leftover scenario domain while reciprocal exports were enabled. Effective benchmark progress is now zero whenever that view has no benchmark. The test compares all rendered point positions before reference activation and immediately after switching to reciprocal, then checks export registration and later animation frames.

## Passing bounded verification

- **76 affected tests passed**, zero failures, in `focused-final.log`.
- `npm run typecheck` passed in `typecheck-final.log` (existing npm `jobs` environment warning only; no TypeScript diagnostics).
- Changed-file ESLint, including the new motion regression, passed without diagnostics in `eslint.log`.
- `git diff --check` passed.
- No changes to `src/data/`, `docs/data/`, source/provenance goldens, source normalizers or `src/lib/large-count-label.ts` relative to the implementation base.

Focused command:

```sh
node --import tsx --test \
  tests/acquisition*.test.mjs \
  tests/chart-toggle-urls.test.mjs \
  tests/chart-trend-exports.test.mjs \
  tests/historical-trend-layout.test.mjs \
  tests/historical-trend-preview.test.mjs \
  tests/connectomics-brain-benchmarks.test.mjs \
  tests/connectomics-brain-scale-ui.test.mjs \
  tests/connectomics-benchmark-collisions.test.mjs \
  tests/connectomics-tooltip-clear.test.mjs \
  tests/voxel-number-readability.test.mjs
```

Source math remains unchanged: `exaspim2024` is the author estimate `1e11 voxels/$` → illustrative **$18.75B**; `peem2024` is prospective `2e10 voxels/$` → **$93.75B**, using `H=1.875e21` voxels. The ExA-SPIM/HiExM citation mismatch stays visible.

Production build, native browser geometry at 320/390/desktop widths, real clipboard/raster PNG checks and release-stage review are separate verification. This implementation verification does not claim push, PR, merge or deployment.
