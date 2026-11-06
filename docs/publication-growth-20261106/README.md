# Publication growth — reference-faithful chart

## Scope

The `#publication-growth` chart follows the supplied reference: horizontal zero-to-dot lollipops, endpoint-adjacent percentages, muted uppercase sections, blue/gray/orange above/within/below colors, the gray all-science band, a dashed all-neurotech total and an actual dot legend. The percentage axis stays visible during chart scrolling.

The added baseline selector defaults to **General science** and can switch to **Same-category reference**. That mode uses the nine acquired group-specific comparisons; the remaining twelve references are explicitly unavailable (hollow neutral dots), not silently replaced with the general baseline. The 21 measured values, coordinates and ordering remain unchanged. Matched references use scalar local ticks, not invented confidence bands or a second numerator series.

The total is calculated from the NT10 annual counts (9,726 in 2022 and 16,057 in 2025), not by averaging subgroup rates. The gray range is independently acquired four-domain global context. Category numerator universes and count units still vary; source qualifications and inspection detail remain. Growth source JSON now includes `nt_yearly` so both context and aggregate can be reproduced.

No primary data, acquisition code, method contract, feed, authentication, public routing or unrelated chart renderer changes are included. This is a PR for review, not a production release.

## Evidence identity

- Before: `fb77f9592459dc8d37a89f50608137cca0dc3b61`.
- After runtime: `9fe17a5db376692277fd6ad6456382a2a2236c17`. Subsequent changes are test assertion and evidence documentation only; runtime identity is checked before handoff.
- Images are actual headed-Chrome captures of an isolated local production build, using a disposable loopback-only QA proxy. The proxy requires an explicit QA flag and rejects non-loopback Host values. It is not committed or deployed.
- Local positive UI evidence is not a successful hosted-password sign-in claim. Hosted preview access gates remain intact.

## Native checks

`native-report.json` records 1440×1000, 390×844 and 320×844 cases:

- All 21 row values checked against the primary snapshot; gray range and total independently checked against annual counts.
- Horizontal stems, endpoint-adjacent percentages, readable fonts and text bounds.
- Sticky scale at top/middle/bottom, aligned during internal horizontal scrolling; numeric zero visible initially.
- Native baseline selection, nine distinct acquired references and twelve unavailable references, value/geometry preservation, and full immutable source JSON.
- Empty initial inspection, keyboard point selection, Escape, actual trigger opening, Back/Forward and focus return.
- No document-level horizontal overflow.

`preview-short-report.json` covers compact chart previews plus 1440×650, 1440×1000, 390×844 and 320×844 layouts. Compact captions, scale and dot legend remain readable; mode setup in this particular geometry replay is programmatic, while native selection is independently checked in `native-report.json`.

On narrow screens the full chart deliberately pans horizontally within its own region rather than squeezing scientific labels into tiny type. Mobile initial/scrolled screenshots show this tradeoff. The full SVG retains its own axis for export; the aria-hidden live sticky copy overlaps that axis at the bottom instead of displaying a second scale.

## Native PNG checks

`export-report.json` records two real Download PNG handler runs: general science and matched mode. The page-local anchor transfer was intercepted to avoid changing the shared browser download destination. The files were decoded and visually inspected; they include the complete chart, selected-mode colors/baseline/legend/axis and source notes. These are actual exports, not screenshot stand-ins or receiving-editor clipboard tests.

- `growth-default-export.png`
- `growth-matched-export.png`

## Automated checks

- The focused publication UI/legend plus performance-modal replay passes **31/31** tests after aligning the compact-caption assertion with its clipping fix.
- Typecheck, production build, changed-component ESLint and `git diff --check` pass.
- The broad 916-test run returned **914 passed / 2 failed**: the now-corrected compact-caption assertion, plus an unrelated history-close timing assertion in `performance-modal.test.mjs`. All six performance-modal cases passed on an isolated baseline replay and on the candidate focused replay. The broad suite is not claimed fully green; the unchanged modal source and successful native history/focus checks distinguish that timing result from an introduced runtime change.
