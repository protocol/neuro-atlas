# Chart notes — crop-friendly exports and readable Atlas details

## Accepted runtime revision

`65f92607d885c2db605cb297717111da459312f5`, including upstream publication-growth PR87 (`633ca1a`). Later evidence-only commits do not change runtime code. The independent bounded source/pixel review passed at this revision with no material findings.

## Actual artifacts

- `recording-hours-desktop.png`: actual Download PNG from the note-heavy chart. Plot/legend, official PL R&D footer, white crop gap, then all supporting notes.
- `recording-hours-crop-example.png`: **example manual crop of that actual PNG**, showing the logo/permalink remain intact. This is not a separate automatic export mode.
- `recording-optical.png`, `neuroai.png`, `trends.png`, `annual.png`: real additional native downloads; full chart data and scientific qualifications retained. Annual export has 16 paper values and exact shape/coordinate parity; its legacy typed-marker selector is empty because the publication renderer uses different attributes, not because the plot is empty.
- `recording-hours-390.png` and `recording-hours-clipboard.png`: the actual narrow-source download and native clipboard PNG. Decoded pixels match exactly; native readback retained PNG, HTML image, and clean plain chart URL.
- `site-recording-notes-1440-light.png`, `site-recording-notes-390-light.png`, `site-recording-notes-320-light.png`, `site-recording-notes-390-dark.png`: the normal Atlas chart detail, with Data and sources opened via native input. Five distinct paragraphs, existing dataset-color keys, 12px muted text, wrapping and row gaps verified. Source table is retained below. Captures are scrolled to notes; a paragraph beginning above the viewport is not deleted.

`results.json`, `site-results.json`, and `manifest.json` bind six downloads and four site cases to source revision, build ID, artifact hashes, actual chart identity, geometry, crop gap and source parity. All source files matched the isolated QA build except its disposable loopback-only proxy. That proxy is **not included** in this PR.

## Checks

- Full merged-source suite: **1,026 passed, 0 failed, 0 skipped/canceled**; see `test-summary.txt`.
- Default production Turbopack build passed; see `build.txt`.
- Next type generation/TypeScript passed; changed-source ESLint and `git diff --check` passed. Two existing unused-destructure warnings remain in the older sharing test, not introduced by this change.
- RED/GREEN regression cases exercised footer-before-notes, white crop gap, 14px gray note text, preserved paragraph boundaries, exact legend-key associations, and actual site source paragraphs/track-definition rows.
- The first export-only suite exposed one assertion matching raw serialized SVG across a line wrap. Visible-text assertions retain the same scientific wording checks; the latest upstream publication test supplies the equivalent semantic DOMParser check. Final merged suite is clean.

## Scope and limitations

The shared helper preserves scientific wording, source coordinates, plotted colors and explicit newline boundaries. It does not infer new series from substrings. Existing legend-label-plus-colon paragraphs receive a matching key; generic caveats/source lists stay unkeyed. Reference multitrack definition rows have mounted-component regression coverage; the current public tissue URL aliases a curated plot, so these artifacts do not claim native public-route coverage for that legacy renderer.

All screenshots and image footers identify a **local production build**. Hosted auth is preserved; these are not production/deployment screenshots. Viewport-emulated pointer tests are not physical-phone touch tests. Clipboard representations were checked in Chrome; receiving apps choose what to paste. Cropping is an intentional user action that removes whichever supporting context they exclude; full exports and chart details retain it.

The supplied replay scripts use the task-owned loopback fixture origin and artifact directory; adapt those explicit paths/port for a future task. Do not install a bypass in release source or relax authentication for QA.
