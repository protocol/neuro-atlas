# Uniform chart actions — November 4, 2026

User request: put **Copy link · Copy chart · Download PNG** in one row and the same position across charts. The supplied Latency compression screenshot showed Copy link alone above the description and image actions in another row.

## Implementation

One shared `ChartActions` wrapper lays out existing stateful controls. The action row comes immediately below the expanded modal heading and before chart content across reference/Pace/participant charts, curated numeric charts and the application timeline, and both Google Trends charts. Status and manual-copy fallback content occupy subsequent rows without splitting the three buttons. Preview-card Copy link controls remain.

This PR changes layout and composition only. Existing chart sources, data, source qualifications, export payload construction, scenarios, URLs and production auth are unchanged. The feedback-to-agent feature is a separate PR/workstream.

## Verification

- Full Node suite: **489 passed, 0 failed**. Type generation/TypeScript and production build passed; changed-source ESLint and `git diff --check` passed.
- Added regression-first `tests/chart-actions-layout.test.mjs`: initially failed for absent/inconsistent action rows, then passed for actual modal families, retained latency scope, image/link behavior, failure fallbacks and responsive CSS.
- Actual headed Chrome at **1440, 390, 320 px**, all **21 rendered chart modals per width**: exactly one toolbar, three full-label buttons in the requested order on one row, above the plot, fitting the modal and without page horizontal overflow.
- Baseline/candidate SVG check: 61 of 63 full SVG strings matched exactly. On the two remaining desktop charts, removing a redundant row removed the vertical modal scrollbar, and the existing responsive renderer widened from 943 to 958 coordinate units. Source values and rendering functions were unchanged. This is not a claim that all physical plot rectangles remain identical after a layout change.
- Representative native actions on reference/Pace, curated and Trends charts at 390 px: Copy link matched the exact current chart URL; Copy chart produced readable native clipboard `image/png` plus text/HTML; Download PNG handler produced valid PNG payloads. The download test captured the actual blob while suppressing final browser-download navigation to avoid changing the shared Chrome download destination. It does not prove file-manager delivery or cross-app paste behavior.
- Simulated denied link-clipboard writes exposed the correct manual URL, kept all three buttons on one row and caused no page overflow. Escape still closed each representative modal. Origin-specific clipboard permission state was restored.

Screenshots are actual local production renders using a disposable loopback-only proxy fixture. That fixture is excluded from the branch; hosted positive authentication remains unverified. The main application’s auth/proxy file was not changed.

## Evidence

- `before-latency-1440.png` → `after-latency-1440.png`: multiple action rows → one top row.
- `after-latency-320.png`: full labels fit at the narrowest tested width; defining latency scope remains above the plot.
- `after-curated-1440.png`, `after-trends-390.png`: same placement across chart families.
- `clipboard-fallback-390.png`: fallback content does not split the toolbar.
- `native-results.json`: all 63 final layout cases.
- `interaction-results.json`: native clipboard and captured PNG-handler receipts.

PR handoff only; no merge or production release is authorized by this work.
