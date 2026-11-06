# Final native chart-design evidence

**Application source revision:** `cf14f32109ebe5434ca015d307390d9bcee0671d`.
**Integrated upstream:** `6f475a2ab6342ce948431e25c58effc20c095672` (PR86).

This directory supersedes the earlier marker-only captures one level up. The later PR88 reader-copy merge is qualified in `acceptance-ledger.md`; these native images are explicitly before its wording changes, not newly captured later wording. The pinned code matches the production build used for these captures. `final-capture-provenance.json` binds its runtime revision header, build ID, 182-file application/asset parity digest and individual artifact hashes. The disposable QA proxy is the only modified runtime file and is not in this branch.

## Actual acceptance results

- `all-chart-native-report.json`: **24 distinct Field velocity previews/details at each of 1440/390/320px**, reconciled by `reconciled-native-coverage.json`. The original 72-record replay captured the wrong desktop identity in three slots; `desktop-corrective-native-report.json` supplies three fresh deep-link/strict-title/source-popup captures, preserving the original mismatches rather than relabeling them. There were 75 detail visits in total, covering all 72 viewport/chart pairs. Populated source marks, 12 CSS-pixel chart labels, glyph containment, shared left edge, equal preview-card heights, no page overflow, native pointer source inspection, first Escape dismissing the popup and next Escape closing the chart.
- `milestones-funding-native-report.json`: all three widths; real year change to 2025, Capital stage expansion, later/earlier month scrolling; Funding financing readouts and company timeline/stage/investor controls. Timeline/month horizontal scrolling and quantitatively sized financing bubbles remain intentional.
- `native-export-results.json`: actual **Download PNG** for electrical units (3 observations), human implant channels (2), optical cellular signals (1). PNG bytes decode with a white background and blue signature. Actual **Copy chart** readback contains PNG, HTML and plain text; the PNG is 2400×2278. Clipboard read permission was scoped to loopback and restored afterward. Recipient applications may choose the image or link rather than both.
- `neuroai-publications-native-report.json`: the six NeuroAI measurements remain, with the same pixels-per-mJ scale on 0–6 and 40–42, a visible empty-interval break, integer x ticks and the exact 41.77 source readout. PR86's shared 2022 tooltip retains 9,726 papers, research index 100 and the 100–100 band. Actual NeuroAI and annual-chart PNG handlers were exercised.
- `native-history-result.json`: native Close restores the original fragment; Forward reopens the chart and Back closes it.

## Tests and build — qualified, not overstated

- `atlas-chart-design-ship-all-tests.log`: **976 cases; 975 passed, one parallel-run history case failed** (`performance-modal.test.mjs`, original-fragment return).
- `atlas-final-history-serial.log`: the entire six-case performance-modal file **passed in isolated serial replay**, including that exact case. Its existing helper waits 30ms for asynchronous history; no navigation implementation or assertion was changed to hide the result. The native history replay above also passed. This is not a claim that the parallel run was fully green.
- Production webpack build, canonical typecheck and scoped ESLint passed; their actual logs are included.
- Independent source review and bounded evidence closure are recorded in the PR. Scientific datasets, exact observations, source quotations, qualifications and PR86's new science history/locked axes are preserved.

## Visuals

`design-contact-sheet.png` shows four actual source-backed cards, including the corrected NeuroAI axis. `neuroai-native.png`, `annual-native.png` and the three `recording-*-native.png` files come from the actual Download PNG handler, not screenshots/recreated plots. Source popup and Milestones/Funding screenshots are actual headed Chrome captures.

Local exports show the local fixture origin in their footer because share URLs deliberately retain the current app origin. Production exports resolve against the deployed app origin. The local proxy rejects non-loopback Hosts (403); no hosted sign-in, physical-phone test, merge or deployment is claimed. Mobile results use viewport emulation and pointer activation, not physical touch-device certification.
