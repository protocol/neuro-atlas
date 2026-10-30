# Uniform Metrics preview cards and light default

Runtime source: `83ea91e3c3331d77c9c8cd3e69f3582582f33904`. Screenshots show the real production-built `/neuro-atlas/field-velocity#metrics` route with an isolated loopback-only QA proxy. Production auth/noindex source was unchanged; local UI evidence does not establish authenticated hosted rendering.

## Acceptance

- All 20 real chart cards have matching outer heights across the five sections; all five featured cards also match at rest. Height follows the tallest visible natural-size body plus footer, rather than compressing SVGs or clipping scientific qualifiers. Height can change when the visible chart set changes.
- Native widths: 1440, 1024, 768, 390 and 320px; resize without reload in both directions; body/footer containment; no internal vertical scroll or page-level horizontal overflow; actual 11px in-bounds tick labels.
- Native blank-space clicks open each of the three chart families and Escape closes them. Existing horizontal-rail/focus/partial-peek regression passed all five widths at source9797ad8; the final runtime changes only unreachable CSS selectors and a test name.
- Fresh, legacy system and unknown preferences default to light even when the OS prefers dark. Explicit saved light/dark choices remain; native toggle, reload and sidebar navigation preserve the selection. SSR/StrictMode hydration is covered separately in `tests/theme-preference.test.mjs`.
- 452 tests, typecheck and production build passed at the exact runtime. Independent candidate review passed; bounded final disposed F1 (obsolete CSS) and F2 (test description) with no material open findings.
- Protected source files: 22 unchanged. Served client assets: 11 verified against this exact build.

## Tradeoff and boundaries

Uniformity requires extra whitespace on shorter previews, especially at narrow widths where labels/qualifiers wrap. It does not imply identical plotting geometry. Pop-out charts/PNG source geometry and scientific observations remain unchanged. The historical scalar context reading is not counted as an additional chart.

Automatic Trends refreshing remains deferred: no schedule or consumer integration is enabled by this PR. No merge or production deployment was performed.
