# Chart contract reconciliation — November 12, 2026

- Branch: `test/atlas-chart-contracts-20261112`
- Base: `82e40cea6155f491dec0b67caed49d505c331072`
- Commit: `b0de76b16aa5df10f7fb4a1afa5025d651b215bd`
- Commit scope: exactly three test files; 58 insertions, 8 deletions. Working tree clean after commit.

## Reproduced failure and evidence

The correctly configured focused command (`node --import tsx --test`) reproduced exactly the parent's five failures: 22 tests, 17 passed, 5 failed. See `contracts-red.log`.

1. `curated-reader-copy.test.mjs`: archived raw bytes and DRAFT scientific projection already passed. Only METRIC's scientific projection changed, because `metric-chart-visibility.ts` adds the presentation-only `connections` property to the TUSZ aggregate and Neuralink checkpoint plots. Exclude only that new plot-level property from the existing scientific projection; preserve the unchanged golden and assert every complete connection object separately (exact IDs, labels, membership/order, both permitted plots, no metadata in archived DRAFT evidence).
2. `extrapolation-ui.test.mjs`: tissue and both hours assertions failed because new calendar-guide groups plus expanded `r=6` and `data-export-r=6` were entering unchanged historical SVG hashes. Assert the exact expected calendar-year sequence and radius metadata; remove only the added guide lines and their now-empty wrapper; restore former radius metadata before the existing normalization/hash. No source center, interval, label, tick, domain or original hash changed. Existing independent annual-guide and presentation tests exercise geometry, paint, pointer exclusion, screen-space radii and export behavior.
3. `neuroai-axis-break.test.mjs`: the first narrow preview expected a hardcoded 232-unit plot span, whereas approved previews use 200 units (full plots remain 232). Compare quantitative coordinates normalized against the actual top/bottom, projected into the original 232-unit scientific frame. This retains the original 1e-8 bound rather than widening it to fractional-coordinate units. Assert exact preview/full span plus existing equal-height extension; retain all source-coordinate, piecewise-x, glyph, tick, gap and export checks.

No production bug was found in these five failures. No production code, CSS, GrowthMarks labels, source records, skip directives or tolerance constants were changed.

## Preservation checks

- Programmatically compared all 64-character golden constants to the untouched base: all 3 curated-reader constants and all 5 extrapolation constants are unchanged.
- Programmatically compared exact bytes against `cc1ceaa` for these source files: all identical:
  - `src/data/draft-chart-evidence.json`
  - `src/data/draft-chart-observations.ts`
  - `src/data/field-velocity/neurotech.snapshot.json`
  - `src/data/field-velocity/neurotech.snapshot.json.provenance.json`
  - `src/data/field-velocity/citation-latency.bundled-20261106.json`
- The original canonical/scientific/geometry assertions now pass against those unchanged goldens.
- `git diff --check`: passed.

## Executed focused results

Final command (7.34 seconds, below 180-second budget):

```sh
node --import tsx --test tests/curated-reader-copy.test.mjs tests/extrapolation-ui.test.mjs tests/neuroai-axis-break.test.mjs tests/chart-annual-guides.test.mjs tests/chart-series-connections.test.mjs tests/chart-presentation.test.mjs tests/reference-preview-font.test.mjs
```

**44 tests, 44 passed, 0 failed, 0 skipped, 0 canceled.** Full output: `contracts-focused.log` in this directory.

Earlier primary-only green run: 23 tests, 23 passed (the original 22 plus one exact presentation-metadata contract). See `contracts-green.log`; the final 44-test run includes these tests after the final strict-tolerance clarification and guide-only removal adjustment.

No full suite, independent review, browser, push, PR, merge or deployment was run. Parent owns those gates.
