# BCI PNG layout cleanup — November 16, 2026

## Result

The actual Download PNG and Copy chart outputs now keep the chart, compact category legend, fit/R² and PL R&D branding together. A concise, two-column study-identification key follows the branded crop boundary. Repeated conversion formulas, assistance conditions and task prose remain in the on-site annotations, popups, source table and methodology rather than being painted into the PNG.

- Native PNG: **2400 × 2186**, versus **2400 × 2974** before (**26.5% shorter**).
- **14** plotted observations and **14** concise key entries retained.
- Key categories distinguish text equivalents, image estimates, native task rates, an author-estimated native contribution and company reporting; the unresolved source, T5 9×9 and P2-isolated selections remain explicit.
- Fit unchanged: **9** text-equivalent observations, **R²(log10) = 0.847**.
- The `data-export-crop-bottom="785"` SVG boundary falls after the logo/referral/link and before the study key. A manual crop there preserves branding; it removes the observation-identity key, so retain the full image when study attribution matters. This is a crop boundary, not a new automatic export mode.

## Exact revision and evidence

Runtime/test/source review revision: `80a14e610f331b6b0cbd37a4f14d1893950be7d1`.

`050255ba55a1cd352d50754b1623ec37ce2060fc` contains the runtime correction. The following commit updates only the existing real-export-callback test to the newly requested dedicated-key contract. The source production build at `050255b` therefore remains valid; the final loopback fixture build and revision header match `80a14e6`.

These are **actual local loopback QA exports and screenshots**, not hosted-production captures. The localhost URL in their footer is expected. The disposable fixture remains opt-in, Host-restricted and noindex; its auth bypass is uncommitted and excluded from this PR. Production authentication is unchanged.

Files:
- `bci-bitrate-native-export.png`: captured from the real Download PNG Blob.
- `bci-bitrate-native-clipboard.png`: native clipboard image/png readback, with text/plain and text/html also verified. Its layout is checked independently; pixel identity with the download is not claimed.
- `before-after.png`: actual before and after native exports, resized equally and placed side by side; no chart data or labels were redrawn.
- `chart-desktop.png`, `chart-390.png`, `chart-320.png`: actual dialog pixels.
- `native-export.svg`, `compact-export-state.json`: exact serialized image and measured crop/key bounds.
- `native-qa.json`, `clipboard.json`, `asset-parity.json`, `tab-ownership.json`: real native actions, all three widths, clipboard receipt, **12** byte-matched served assets, task-tab closure and preservation of **7** pre-existing tabs.
- `model.before.json`, `model.after.json`, `preserved-hashes.json`: full model comparison and protected-file hashes.
- `code-review.json`, `artifact-review.md`: independent code and actual-pixel reviews; any closure is appended to the latter.
- `default-parity.json`: **42** before/after default-export cases are byte-identical when the optional key is omitted/empty, spanning all supported marker choices and three viewBox widths.

## Tests and honest limits

Two tests were observed RED before their corresponding implementation: missing concise image labels, then missing dedicated post-branding key. Both are GREEN. The first compact implementation also failed its height-reduction assertion; tightening the study identities resolved it without removing uncertainty or selected-condition qualifiers.

- Initial focused exports/model checks: **30/30 passed**, plus typecheck and scoped ESLint.
- Final affected/export/feedback/base-path cohort: **56/56 passed** (`final-scoped.log`).
- Independent artifact reviewer replay: **22/22 passed**, same revision.
- Full model equality holds after deleting only the 14 new `exportAnnotation` values and `exportPointKeyNote`. All numerical rows, fit coefficients, existing notes, source links, dates, qualifiers and annotations are unchanged.
- Historical source/candidate JSON, frozen `docs/qa/chart-legibility-20261112/acceptance-inventory.json`, provenance CSV and production auth proxy hashes are unchanged.

**A single all-green full-suite result is not claimed.** An initial completed broad run inherited the build-only `NEXT_PUBLIC_BASE_PATH` and produced **1307 total / 1297 passed / 10 failed**: nine standalone/root-path expectation mismatches and the old BCI callback assertion. `test-reconciliation.json` individually maps all ten failures to their passing final cases after isolating test configuration and updating the owner-changed key contract. A complete correct-environment rerun subsequently reached the **600-second limit (exit 124)** and recorded **1237 tests / 1223 passed / 2 failed / 12 cancelled**. The observed failures concern `performance-modal.test.mjs` and a recording-measurement history assertion (`optical` versus `human-channels`); they are not erased by reconciling the initial ten failures. Serial replays of the 14 interrupted/failing files against both exact baseline and candidate each also reached their 150-second bounds. Those broader checks remain unresolved; no cause or all-green result is inferred. The narrow PR/PNG handoff is backed by the completed affected cohort, direct default-export byte parity, scientific-model invariance, native replay and the independent reviewer’s explicit same-revision closure; this is not merge or general application-readiness clearance.

No merge or production deployment was performed. Only this PR's export presentation is changed.
