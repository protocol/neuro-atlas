# Milestones category disclosure QA

Runtime revision: `bf47ad4ff55055d6e24014ce3fb3fdf19733c72d`. Later evidence-only commits do not change that runtime.

## Change

- Keep the existing inline/wrapping category layout and all filtering semantics.
- Keep a persistent disclosure triangle: rotate down/up in 120ms when opening/closing. The options reveal with a 3px/opacity, 120ms entrance; they are immediately interactive. Closing hides the options immediately (no delayed hit targets).
- Link each `aria-expanded` trigger to its panel with `aria-controls`. Disable both new motion effects for reduced-motion users.
- Lift the existing filter row above the next year strip's negatively margined padding. Native hit testing on baseline found that padding intercepting the middle/lower half of category buttons. This is a click-delivery repair, not a faster filtering algorithm.

No change to scientific data, access/noindex, panel defaults, copy, or category selection semantics.

## Actual latency investigation

Before/after used the actual Next development `/milestones` route on a task-owned loopback server with physically isolated dependencies and synthetic local auth, in a dedicated headed-Chrome window. Native trusted mouse clicks were timestamped in capture phase. A MutationObserver measured the `aria-expanded` update; the next requestAnimationFrame measured visible panel geometry; a second rAF measured a subsequent paint **opportunity**, not hardware presentation. Three samples per category at each width, 27 per revision, no throttling, shared host.

The baseline center click could be intercepted by year-strip padding and never reach the category handler. That failed click was retained separately, not counted as a slow successful click. Baseline dispatched-click timings therefore used the exposed upper 4px of the button; candidate used the now-working center. Dismissal between samples used native Enter on the existing X control. These are different hit locations, not a controlled claim of processing speedup.

A separate 54-click production root-cause isolation restored **only** the baseline row's computed `position: static; z-index: auto` on the candidate's otherwise unchanged closed-state geometry, then compared `relative; z-index: 10`. This is labeled isolation, not a second exact-baseline build. Across center/lower-area clicks the old hit layer opened **8/18** versus **18/18** with the repair. At 1440px it was 0/6 versus 6/6; at 390 and 320px it was 4/6 versus 6/6 each. All upper-edge controls opened in both variants. The blocking hit target was the padded year-strip div. Native source assertions also verify that all candidate category centers activate during real selection roundtrips.

| Width | Baseline median / maximum visible-rAF ms | Candidate median / maximum visible-rAF ms |
|---|---:|---:|
| 1440 | 27.2 / 70.6 | 24.3 / 37.8 |
| 390 | 36.9 / 296.6 | 24.3 / 30.1 |
| 320 | 23.5 / 42.1 | 24.2 / 33.7 |

Typical dispatched-click processing was already around 22–25ms. The shared-host baseline had a single 294.2ms mutation outlier at 390px; this sample does not establish a persistent slow-JavaScript cause or prove the patch accelerated JavaScript. The verified repair is reliable center/lower-half hit delivery, plus bounded visible state feedback. No quantitative speedup claimed.

## Verification

- New component regressions failed first on baseline (missing disclosure-panel relationship and hit-layer guard), then passed. Existing category clear-all, individual selection, collapse/reopen retention, restore-all and actual rendered marker sets remain intact.
- 28 focused Milestones/company-blog tests pass, runner concurrency 2. Typecheck, production build, production dependency audit and diff checks pass.
- Scoped lint reproduces two existing hook-rule errors in unchanged timeline lines on baseline. With only those two baseline rules disabled for the scoped comparison, there are no new lint errors; the original findings are not claimed fixed.
- A broad baseline suite was canceled under shared-host load; it is **not** a pass or a product-failure verdict. No full-suite pass is claimed for this PR.
- The committed `scripts/qa/milestones-filter-browser.py` passes against the actual production Next build at 1440/390/320: all three categories, center pointer activation, clear/subset/close/reopen/all marker roundtrips, keyboard Enter, BCI/all scope roundtrip, viewport bounds, settled arrow transform, and computed reduced-motion styles.
- Native reduced-motion testing caught and fixed a selector-specificity issue before delivery; the source regression now requires that matching selector.
- Independent narrow runtime-diff review found no blocking defect. Its mistaken suggestion that a reduced-motion chevron override was missing was rejected against the actual media rule and computed `0s` native results.

Local browser results are desktop Chrome viewport emulation, not physical-phone touch or a signed-in hosted flow. The real hosted preview keeps its existing access gate.

## Captioned evidence

These are source-free actual app UI captures, not visitor-feedback screenshots. Baseline is `de2301974ac1e66b35aaaec91198dc5dda8c060c`; final images use the production build of the runtime revision above. Matched widths are 1440, 390 and 320px (1000px height); screenshots are scrolled to the filters as necessary.

- `baseline-closed-1440.png`: original closed category row, unchanged design baseline.
- `capital-open-1440.png`: existing inline Capital layout, settled down indicator and options.
- `clinical-open-390.png`: wrapped Clinical options remain readable and bounded.
- `commercial-open-320.png`: narrow Commercial options and X remain reachable.

The private evidence package retains raw benchmark samples, native scripts/results, canceled/full/scoped logs and review disposition; it is not published in this repository.
