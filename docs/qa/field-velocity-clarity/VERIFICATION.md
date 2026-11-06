# Verification receipts

## Pinned runtime

- Baseline: `17689343bccdacaf128c19d355654a0e11f98516`.
- Reviewed / exercised runtime: `c940a1343e6d9c4dd52ebae805f59458e6026ea5`.
- Any following evidence-only commit contains this report and captured PNG/JSON files; application, tests, dependencies, auth and data must remain byte-identical to that runtime.
- Real production build, with `/neuro-atlas` base path, served solely on `127.0.0.1`. A disposable proxy required an explicit runtime flag and raw loopback Host, returned the exact revision header and noindex, and denied an invalid Host with HTTP 403. Only that disposable clone's `src/proxy.ts` differed. The fixture is not in this branch.

## Source checks

- `node --import tsx --test --test-concurrency=4 tests/*.test.mjs`: **1,104 passed; 0 failed**, on the pinned final runtime.
- Typecheck, production build, changed-source ESLint and `git diff --check`: passed.
- Independent full code/design critic: PASS at `f2da559`; one inherited annual PNG heading collision identified. Corrected in `c940a13`, with failing-then-passing exported-SVG regression and actual native PNG readback. Independent bounded closure: **PASS at `c940a13`, F1 closed, no new P0/P1**.
- `src/data`, `public/data`, auth/proxy and refresh settings are unchanged from baseline.
- Historical checks are not mislabeled as all-green: the initial unbounded concurrent suite timed out; the first serial run found an unnecessary observer outside the catalog. The hook was scoped to the catalog, the focused regression passed, and both later bounded-concurrency full suites passed. The final count above is the final runtime's own run.

## Native replay

- All **24** real preview cards in all **five** sections at **1440, 390 and 320px**.
- Common card heights: 647px / 897px / 1,053px. Largest within-width spread: 0.1875px. Largest final resting body-to-footer gap: 0.015625px.
- All five first-chart native clicks at each width opened the exact requested dialog title; Escape closed it and returned focus to the trigger. Section/global collapse/reopen and search/clear retained the full inventory and card sizes.
- No document horizontal overflow. Horizontal scrolling stays local to the chart rails.
- One sharing row immediately below the enlarged-chart heading, with Copy link / Copy chart / Download PNG on one row at all three widths. Pill radius 999px; native button heights 36px desktop, 44px narrow.
- Real Download PNG captured at its Blob boundary and visually inspected. Both annual axis headings are distinct; values, 2022 anchor, legend and white/PL R&D footer remain.
- Real Copy chart wrote one clipboard item with `text/plain`, `text/html`, `image/png`; the temporary origin-scoped read permission was restored to its previous `prompt` state. This does not establish receiving-editor dual-paste support.
- All four Inflection cards retained; existing relationship labels precede their links. Native forecast disclosure and first related-measurement navigation passed at all widths.
- No-reload resizing 1440 → 390 → 320 → 1440 retained equal heights with less than 1px spare gap. Actual dark/light toggle and restoration passed.

## Evidence and limits

`after-geometry.json` and `native-actions.json` are final-runtime receipts. PNG filenames describe the real capture; the native annual image footer correctly contains the local QA origin. The failing earlier PNG is retained privately as history rather than relabeled as corrected evidence.

These are headed-browser viewport/pointer checks, not physical-phone touch testing. Tall narrow cards are the deliberate equal-height / readable-qualifier tradeoff. Individual screenshots show the visible portions of rails, not every horizontally offscreen peer; all-24 coverage is geometric plus source/test coverage. Hosted preview build/access status is checked separately; loopback checks are not a successful hosted login claim. No merge or production release was performed.
