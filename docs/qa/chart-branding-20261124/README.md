# Screenshot-ready chart branding — November 24 verification

This PR is **stacked on the pages/link PR #144**. Its diff against that branch is presentation and associated tests only: no URL/attribution algorithm, scientific data/model, authorization, dependency, or deployment-setting change. Merge #144 first, then rebase/retarget this branch before merging it into main.

## Presentation

The real interactive SVG remains live inside a white publication canvas, with a Neuro Atlas identity, blue signature, larger title, actual observation legend/key, and source footer. Editing/sharing controls and long methods stay outside that canvas. The actual legend remains directly interactive rather than becoming a decorative duplicate. Compact overview cards receive restrained Neuro Atlas branding.

Copy feedback remains readable/live but cannot intercept chart-editing clicks. No numerical/source values are changed.

## Revision and environment

Branding built/browser-tested runtime: `b5ab3293a3806ec32a083d7175bd6458d465cbac`.
Matched before runtime: pages-only `bbea2485edce7e8759efaf22deb7a0ef1f3aac6e`.
Later validation commits change only test expectations/import cleanup; runtime/assets/config/dependencies remain identical to the built revisions. `validation.json` records the exact lineage.

Both real Next production builds passed their type/build validation. The browser used exact production assets through guarded, noindex loopback viewers. Each build's 26 page GET/HEAD/canonical checks and 18 client-asset byte comparisons passed; all 140 frozen scientific input files remained unchanged.

## Actual native checks

- Three sender → copied URL → fresh recipient journeys per build at 1440/390/320 pixels: exact selected scientific view, no sender navigation, overview/search/rails/scroll/focus restoration. The pages build has no plate; only this build has the plate and compact preview branding.
- Matched fresh default BCI captures at all three widths retained identical 14-observation ID lists. Mobile screenshots explicitly scroll the chart into view; they do not claim the entire long study key fits in one phone viewport.
- Three **actual Download PNG-button generated Blobs**, captured at the download-anchor boundary: default BCI, opt-in sensory reference, and reciprocal acquisition units. The exported PNGs were decoded and visually inspected. This exercises image generation, not the browser's filesystem-download transfer.
- Native clipboard readback contained PNG, plain URL, and HTML. Its PNG bytes differ from the download representation; decoded pixels match. Receiving-app paste behavior remains untested.
- Native browser Back/Forward restored the exact selected sensory reference and query/focus context.

These are local production-build/viewport-emulated pointer checks, **not** hosted authentication, real GA delivery, physical-phone touch, or receiving-editor paste certification. No merge or deployment was performed or authorized.

## Honest test status

The completed scoped branding run at the built revision reported **228 tests: 225 passed, 3 failed, 0 cancelled**. Two are retained PR144-intake failures (provenance hash and invalid optical-query encoding). The third stale incoming-campaign expectation was corrected test-only and its complete file rerun **6/6 passed**. The independent split review's sole finding was closed by separately reproduced passes. Do not present a synthetic corrected all-green aggregate; repository-wide lint/tests remain qualified.

## Image inventory

- `before-desktop.png` / `after-desktop.png`: matched default exploration chart before/after branding.
- `after-mobile.png` / `after-mobile-320.png`: actual chart scrolled into view at 390/320 pixels.
- `native-default.png`, `native-sensory.png`, `native-reciprocal.png`: actual UI-generated PNGs, not screenshots or simulated export fixtures. Their referral footer legitimately contains the local viewer origin.

All files preserve the original captured bytes. Hashes/dimensions and the three UI-export cases are in `validation.json`.
