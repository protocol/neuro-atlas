# Metrics consolidation — native visual evidence

These are screenshots of the actual Next.js production-mode UI, not mockups.

- **Before:** source `2d258e7ed05755e88fabfe23bee295974dbd4d7f`. Desktop shows the former separate Draft gallery; mobile shows the former Metrics surface.
- **After:** runtime source `7513d68e00bb9c86839d6ba65f34cd867bcc3282`. One collapsed Metrics catalog; six scientific deck categories and Field context. All 23 curated numeric panels, 79 observations and the timeline remain available. Unsupported proposals are documented separately in [draft PR #62](https://github.com/protocol/neuro-atlas/pull/62).
- Widths: 1440, 390 and 320 CSS pixels, desktop browser viewport emulation. This is not a physical-phone test.
- Both runtimes used disposable local checkouts with an explicit loopback-only proxy fixture, bound to `127.0.0.1`. The production authentication source, routing configuration and source data were unchanged. No fixture is included in the PR.
- These images establish local UI behavior and layout, **not authenticated hosted verification or production deployment**. Final test/review status is recorded in the PR description.

## Images

- `before-1440.png`: prior separate gallery.
- `before-390.png`: prior Metrics surface.
- `after-1440.png`, `after-390.png`, `after-320.png`: collapsed catalog, search and category counts.
- `after-expanded-320.png`: expanded Mapping scale with real tissue measurements and preserved H01/MICrONS labels.

## Regression coverage

The implementation adds tests for actual-only inventory, category ordering, search/clear, expansion state, source preservation, legacy/canonical links and retired-proposal aliases. Final review additionally caught and fixed repeated stale-hash scrolling during search/disclosure, the retained commitments fragment, and native focus entry into modals whose category starts hidden. Tests model native hidden-ancestor focus rejection rather than jsdom's permissive focus behavior.

See [navigation contract](../../metrics-navigation.md) for inventory, scope and link behavior. Whole-repository lint has five pre-existing errors reproduced on baseline; changed-file lint is checked separately. Dependencies and production access controls are not changed by this work.
