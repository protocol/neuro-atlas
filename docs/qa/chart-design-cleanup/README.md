# Chart presentation cleanup

## What changed

Ordinary observation markers now use a shared visual scale: 4 CSS pixels in previews, 5 in expanded charts, with 7px inspection emphasis in the reference renderer. The reference renderer measures its actual SVG screen transform, including height-constrained letterboxing, rather than allowing its fixed viewBox to enlarge/shrink dots with the card. Adaptive draft plots and event previews use the same base sizes.

Preview titles share a restrained 14px hierarchy. Plot guides and marker outlines share quieter, non-scaling strokes. Scope/coverage copy sits below reference previews, matching the draft-card hierarchy. Overlap rings retain quantitative centers and are explicitly explained.

Scientific source files, values, dates, scales, color/shape meanings, source links, measurement views, routing, auth, feed jobs and deployment settings are unchanged. Uniform preview heights, horizontal rails, intentional peer peeks and the saved theme choice are retained.

## Baseline and evidence

Baseline: `407a06d39b07f0d23a0f325c6c72ad32268cf9d0`.

At a 1440px browser viewport, ordinary adaptive marks were about 6px radius, versus 8.43px in reference previews. At 320px the reference marks shrank to 2.5px while adaptive marks remained 6px. The new browser replay fails on that original discrepancy and passes on the candidate.

- `before-desktop.png`: baseline Next development route, real bundled observations.
- `after-desktop.png`, `after-mobile-390.png`, `after-detail-320.png`, `after-dark.png`: actual headed Chrome, candidate production-built Next route.
- `native-results.json`: 1440/390/320 viewport, screen-space radii, exact source values, initial empty inspectors, native point activation, measurement switches, Escape/focus return and document bounds.
- `additional-native-results.json`: 113 ordinary catalog preview marks checked at 4px; seven source-backed recipient points checked at 5px in the draft detail renderer; native inspection and theme rendering.
- `capture-provenance.json`: source equivalence and native PNG-generation receipt. The generated PNG was opened and inspected, including three measured source observations and complete scope/source notes.

The screenshots use a disposable loopback-only QA checkout: the real app/components and committed scientific records, with a local proxy that refuses non-loopback hosts. That proxy is **not** part of this PR and is never deployed. These are local browser/production-build checks, not evidence of an authenticated hosted sign-in. Phone-width screenshots use browser viewport emulation, not physical-device testing.

The partially visible peer at a rail edge is intentional, matching the existing owner-approved horizontal navigation. Equal-height cards can have spare vertical space on narrow screens; that explicit owner requirement is preserved.

## Repeat the native regression

Use the task-owned loopback fixture and browser-harness:

```bash
ATLAS_QA_ORIGIN=http://127.0.0.1:35961 ATLAS_QA_MODE=after browser-harness <<'PY'
exec(compile(open('scripts/qa/chart-design-browser.py').read(), 'chart-design-browser.py', 'exec'))
PY
```

The fixture must already be running and owned by the task. The replay does not change hosted auth or Chrome's shared download directory. PNG bytes are captured from the real native Download PNG handler at its local download-anchor boundary.

## Test qualification

The unchanged baseline full suite at bounded concurrency had 649 passes and one existing asynchronous Back/Forward failure in `recording-evidence-ui.test.mjs`; all 50 recording/history/retirement/Trends cases in the involved files passed in a serial baseline replay. Final candidate test/build/lint results are recorded in the PR after their execution. No test assertions were relaxed to hide the baseline failure.

PR only. No merge, deployment promotion, data refresh, or feedback-workflow activation is part of this change.
