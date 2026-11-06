# NeuroAI ImageNet energy-axis break

Presentation-only, scoped to `neuroai-imagenet` with a numeric x-axis and linear y-axis.

- Current source energies: 1.13, 3.56, 3.9, 4.5, 5.53 and 41.77 mJ/image. The open interval (6, 40) contains no observations.
- Show linear segments **0–6** and **40–42** mJ/image, using 75% and 25% of the drawable width after the break. Both segments use the same pixels-per-mJ scale; their widths match their 6:2 numeric ranges. This is not a logarithmic axis.
- A real axis/grid discontinuity and two slash strokes mark the break. Gridlines and annotation leaders never cross the omitted interval.
- Integer ticks thin adaptively to avoid overlap. The SVG itself contains the wrapped, accessible explanation: “X-axis break: 6–40 mJ/image omitted (no observations). Same linear scale on both sides.” The same explanation is included in export notes.
- If a new observation enters the gap, leaves the supported domains, or either cluster disappears, use the ordinary full-range axis instead. No observation is dropped or clamped. Mapping within the gap is undefined, not an extrapolation.
- All six source x/y values, the exact table and tooltips, the existing y-axis, marker sizes and other charts are unchanged. Energy remains an **operation-count estimate**, not measured hardware energy; accuracy remains experimentally evaluated. No source-data or export-pipeline edits.

## Focused verification

TDD: the first component regression failed on the missing split axis, then passed; the responsive regression then caught annotation leaders crossing the gap at 120px, fixed by bounding callouts to their own segment.

`node --import tsx --test tests/neuroai-axis-break.test.mjs tests/draft-chart-plot.test.mjs tests/draft-chart-number-precision.test.mjs tests/draft-chart-overlap-accessibility.test.mjs tests/draft-chart-annotations.test.mjs tests/draft-chart-marker-styles.test.mjs tests/chart-typography.test.mjs`

Result: **40 passed, 0 failed** (6 new regressions). Coverage includes 120/180/230/320/560/800px preview/full geometry, exact piecewise coordinates and unchanged y positions, nonoverlapping tick strings, complete in-frame glyphs, no cross-gap lines, source-value table/tooltip readback, safe fallback, unchanged unrelated numeric/time/log plots, and real SVG-export serialization at 120/230/800px. Scoped ESLint and `git diff --check` passed. Native browser/PNG review, the full suite, build, and PR86 integration remain parent-owned.
