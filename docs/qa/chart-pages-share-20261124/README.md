# Chart pages and sharing — November 24 verification

This is the pages/link half of the split. It intentionally contains **no new chart branding plate, preview brand label, title-hiding rule, or editing-control portal**. Those belong to the separate branding PR stacked on #144.

## Behavior exercised

- Field velocity cards open the real interactive chart in place. Copy link does not navigate the sender.
- Deliberately copied URLs use the dedicated chart route and preserve its validated visible-series/model/view settings. They carry only the fixed `neuro_atlas / share / chart_share / <chart slug>` campaign vocabulary, not arbitrary sender queries or identifiers.
- Canonical metadata and PNG identity remain untagged. Ordinary internal navigation removes campaign tags; compatibility translation of an incoming old link preserves safe incoming campaign multiplicity while removing private tokens.
- Actual browser journeys at 1440, 390, and 320 pixels verified selected BCI observations/model against fresh recipients, one-action return, and retained overview search, category preferences, rails, scroll, and trigger focus.
- A fresh default-chart capture at all three widths retained the same 14 BCI observation IDs as the separate branding build, with no branding plate in this build.

## Revision and environment

Built/browser-tested runtime: `bbea2485edce7e8759efaf22deb7a0ef1f3aac6e`. The later validation heads change only test expectations/import cleanup; runtime, public assets, configuration, and dependencies have zero delta. `validation.json` binds the exact revisions and files.

The real Next production build, including its type validation, passed. Browser captures use exact production HTML/RSC/client assets in a Host-restricted, noindex loopback viewer. All 26 pages (25 charts plus overview) passed GET/HEAD and canonical checks; all 18 referenced client assets matched the pinned build; all 140 frozen scientific input files remained unchanged.

This is **local production-build evidence**, not a hosted preview, positive hosted-auth test, server-API test, GA delivery certification, or physical-phone touch test. No merge or deployment is authorized. Both feature branches have explicit Git-deployment-disabled guards.

## Honest test status

The completed scoped run at the built revision reported **200 tests: 197 passed, 3 failed, 0 cancelled**. Two failures were already present in the PR144 intake: the archived provenance hash fixture and invalid `recordingView=optical%20` raw-query encoding expectation. The third was a stale legacy campaign expectation after restoring incoming-link continuity; that one-line expectation was corrected and the **entire affected file rerun: 6 passed, 0 failed**. Do not rewrite this as an all-green aggregate.

Independent split review found no production/privacy/scope defect; its sole stale-test finding was closed by independently reproduced passes. Subsequent unused-import cleanup passed the affected file's lint and tests. Repository-wide tests/lint are **not** claimed green.

## Captures

- `recipient-desktop.png`, `recipient-mobile.png`: fresh standalone recipient with the selected nine-observation/refit view. This exploratory image is honestly link-only.
- `explore-desktop.png`, `explore-mobile.png`: default exploration chart with all 14 observations and the existing, unbranded presentation.

The images are unmodified native browser captures. Their hashes and dimensions are recorded in `validation.json`.
