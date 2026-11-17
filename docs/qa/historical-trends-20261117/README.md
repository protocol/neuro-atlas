# Historical trend chart verification — November 17, 2026

## Revision and artifact identity

- Baseline source: `1c54bff72177e227fb0e5c4ca1e7794427233744`.
- Candidate runtime/source reviewed: `2207d8818742af548102a5118d25f9c2c0781cbe`.
- Later handoff commits contain test reconciliation and this evidence only; application/data/assets are identical to the reviewed runtime.
- Screenshots are real headed-Chrome captures from isolated loopback-bound production builds at 1440, 390 and 320px. Included before/after pairs show 1440 and 320px; the 320px card captures separately demonstrate readable dates above the sharing footer.
- `native-*.png` are the actual native Download PNG outputs, captured at the download Blob boundary, not manually cropped chart screenshots. The local origin in their information link is intentional. Artifact hashes and source revisions are in `artifacts.json`.
- The scratch-only loopback fixture rejects other Host values (403), requires an explicit runtime flag, and emits noindex. It is absent from this branch. Original authentication, package files and archived acquisition evidence are unchanged.

## Executed checks

- Baseline full suite: **1,391 passed**.
- Candidate full suite: **1,403 of 1,404 passed**. The sole failure compared the shortened preview heading with the full exported title. The assertion now uses the actual expanded chart's title; its focused rerun passed across all 15 curated images. All exact source/geometry assertions remain. Two trend/export regressions also passed after removing unused test imports. This is a full-run receipt plus a passing targeted reconciliation, not a claim of one wholly green full-suite invocation.
- Typecheck and original-auth production build passed.
- Lint retains **five pre-existing errors** in unchanged milestone/theme components and an existing test's `module` variable. The same five errors were reproduced on the untouched baseline. No new lint error; two new unused-import warnings were removed.
- Independent full scientific/code/visual review located two defects: missing painted historical exception key in the raster and clipped 320px preview dates. Both were fixed and passed one bounded independent closure review at the candidate revision; **46 focused tests passed**, with strict prior/current source/fit comparisons. No remaining blocking finding.

## Native behavior and visual acceptance

- Both opened chart titles and source marks checked at 1440, 390 and 320px: **10 acquisition estimates; 94 historical recording points**. No new document/modal overflow relative to the baseline.
- Both real PNG downloads opened and inspected. Both native ClipboardItem payloads read back with `image/png` and the expected text link. Recipient-editor paste behavior was not tested.
- Copy link retains ordinary query context; exported information links exclude it. Existing legacy fragments resolve to the proper canonical chart. Native Back/Forward restores each actual chart, not just its hash.
- All four recording views selected natively and exported: historical electrical, recent electrical units, human implant channels and optical cellular signals.
- Source inspection, first-Escape popup dismissal, second-Escape chart dismissal and modal focus containment checked.
- Default-off acquisition-budget overlay: five exact reciprocal reference values, genuine intermediate animated bounds, and exact off-state SVG restoration at all three widths. Deterministic tests also cover reduced motion and export-during-motion guards.
- Unrelated BCI information-transfer and public-image-footprint charts retain exact scientific geometry in four matched native cases.
- The compact acquisition preview retains `100M`, `1B`, `10B`, `100B` and `2015`, `2020`, `2025` above its footer at 320px. The full chart explains M/B/T/Q, and the source key uses words such as “1 billion.” Values and fitted coordinates remain exact; formatting is display-only.

## Scientific scope

See [methodology and frozen inputs](../../historical-chart-trends.md). Independent reproduction confirmed 162 raw tracker rows → 94 selected rows, doubling 6.321214735 years and log-space R² 0.900357405. Both four-point acquisition fits reproduce locally rather than borrowing figure labels. The ExA-SPIM 2024 author estimate retains its unresolved citation mismatch; PEEM is prospective and excluded from the historical EM fit. Electrical recordings, optical signals, channels and mapped neurons are not pooled.

No production deployment, positive hosted-authentication claim, forecast, common cross-method frontier or automatic refresh is part of this change.
