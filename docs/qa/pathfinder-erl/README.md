# PATHFINDER ERL explanation

Scope: presentation-only clarification of the existing PATHFINDER v1 chart. No observations, source records, coordinates, dates, chart structure or published URLs change.

## Reader-facing changes

- The underlined `Normalized ERL (%)` label opens a short explanation on hover, keyboard focus or click/tap. ERL means **expected run length**. Escape dismisses the explanation before the chart.
- The compact chart's existing enlarge button also has the expansion in its native hover title; previews gain no nested controls.
- The observation popup spells out **Normalized expected run length (%)**.
- The **Axes** description uses the full name and explains 50%, the reported 94.2%, and a possible 100% score. The score applies to the reference sample and evaluation rules; it is not a count of fully correct neurons.

## Scientific basis

[PATHFINDER v1](https://www.biorxiv.org/content/10.1101/2025.05.16.654254v1.full), Table 1 and Methods → Segmentation evaluation, reports 94.2% normalized expected run length for unmyelinated mouse cortical axons. Normalization uses the maximum ERL for that same ground-truth set. A 100% score is possible for a reconstruction matching the reference under those scoring rules. The method excludes minor errors through node-count thresholds, so a perfect score does not establish the absence of every small error.

## Verification

- New regression was observed failing before implementation, then passing.
- Focused regression run: **39 tests passed**, including the ERL explanation, real DOM focus, Enter/Space, Escape with enclosing-modal retention, chart point inspection and popup/history behavior.
- Typecheck, targeted ESLint and a production build passed.
- Native Chrome on the local production build at **1440, 390 and 320 pixels**: explanation visible and within viewport; Axes copy readable; one source observation retained; no document overflow. Native pointer activation pins the help; first Escape leaves the chart open. The old `#metric-panel-pathfinder-nerl` link still opens the same chart and canonicalizes to `#pathfinder-v1-axon-tracing-benchmark`.
- The original PATHFINDER SVG geometry hash is retained after stripping only the four exact new interaction attributes. Historical golden hashes are not regenerated.
- Whole-suite result is **not green**: the broad run exposed existing failures and was stopped rather than represented as a complete passing run. The two acquisition-economics SVG hash mismatches and two chart-sharing null-selector failures were independently reproduced on unchanged main `c1195d7862fe7dc1346922bc0159f3ad3c8b6750`. They are outside this clarification's scope.

Screenshots are local production-build evidence, not a hosted deployment. `before-live.png` is the live production chart before this change. No merge or production deployment was performed.
