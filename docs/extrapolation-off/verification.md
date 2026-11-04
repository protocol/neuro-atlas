# Extrapolation defaults — verification

Request: turn off extrapolation on charts that have it enabled.

## Scope

- Removed Milestones' automatic end-of-year capital extension for every focus year and scope.
- Capital lane scaling now uses the last actual cumulative total, not a modeled end-of-year total.
- Historical milestones, amounts, dates, URLs, year summaries, and comparison sparklines are unchanged.
- The current neuron chart already opens/reopens with Extrapolation Off. Its existing explicit opt-in remains available.
- The current unified recording-hours chart has no extrapolation controls or model output. The older standalone hours component remains default-off.
- Dashed source-series distinctions, gridlines, and the Today marker are not extrapolations and remain unchanged.

## Evidence

Runtime revision: `b0e55849df8b386a39792b70b374fcd9391254c0`.
Baseline: `d4f4ae0d9bd8fd86d9dea77af21043695e1013c9`.

- RED: new Milestones regression failed with two polylines instead of one on baseline.
- GREEN: all three new regressions passed. Milestones test covers 2024–2026 × All neurotech/BCI only and checks every actual coordinate against source records.
- Full suite: 485 passed; typecheck and production build passed.
- Targeted ESLint: two existing errors at milestone-timeline.tsx:147 and :169, identically reproduced on baseline (set-state-in-effect and immutability). No newly introduced errors; lint is not green.
- Independent source/spec review of `b0e5584`: PASS, no priority findings. Reviewer had no installed dependencies in its isolated worktree; full React/build results are the main task's own verified execution.
- Real Chrome replay at 1440, 390 and 320px: no automatic capital extension; focus-year changes and BCI filtering retain observed-only lines. Neuron modal starts Off with seven actual observations; unified hours has all 12 actual observations and no modeled marks.
- Native screenshots compare separately built baseline/candidate production static pages. Mobile captures center the final actual capital record so the endpoint is visible.

Screenshots are **loopback-only compiled-page QA**, not authenticated hosted verification. Production auth/noindex was not modified. Live PL Neuro returned 401/noindex without credentials; its authenticated browser route is allowlist-blocked. Positive hosted login/UI remains unverified.

The attached browser receipt records 12 primary cases plus the separately exercised year/scope interactions. The replay script is an internal task artifact; screenshot captures use native headed Chrome.

No merge or production promotion is authorized or performed.
