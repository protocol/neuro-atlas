# Landing feedback invitation removal

## Scope

Remove the landing-page feedback invitation, without replacing it with a link or moving it. The existing Feedback trigger and Explore CTA are unchanged. Remove only the invitation's now-unused `.landing-feedback` rule; no spacing or format redesign.

## Native before / after

These are actual headed Chrome captures of the Neuro Atlas Next production page, served only on loopback with a synthetic gate password. They show public repository UI, not visitor feedback or a hosted authenticated session. No feedback was submitted.

- Before source: `de2301974ac1e66b35aaaec91198dc5dda8c060c`.
- After runtime source: `9f9b1d826d518987b57471242d98844c5ba51bb6`.
- The subsequent evidence-only commit does not change runtime or tests.

| Viewport | Before | After |
| --- | --- | --- |
| 1440 × 1000 | `before-1440.png` | `after-1440.png` |
| 390 × 844 | `before-390.png` | `after-390.png` |
| 320 × 740 | `before-320.png` | `after-320.png` |

At all three widths, native assertions verified the invitation present before and absent afterward across the entire document, the unchanged Explore label/anchor with real click and focus transfer, and exactly one displayed Feedback trigger opening element selection and closing with Escape. The mobile trigger is in the footer below these first-fold captures. Requested viewport width, document width, horizontal overflow, headline glyph bounds and four directory destinations were checked. Native pointer checks are not physical-phone touch certification.

## Checks

- Failing first: the new regression failed specifically because the invitation was still rendered (9 passed, 1 failed).
- Green: `node --import tsx --test tests/landing-page.test.mjs tests/feedback-trigger.test.mjs` — 10 passed.
- `npm run typecheck` — passed.
- `npm run build` — passed (actual Next production build).
- `npx eslint src/app/page.tsx tests/landing-page.test.mjs` — passed; this is scoped lint, not repository-wide lint or CSS lint.
- `git diff --check` — passed.
- Bounded independent code review of the runtime diff: no security or logic findings. Fresh visual review: only the requested line disappears and the following content moves upward naturally; no replacement link, clipping, private context or unrelated redesign observed.

The repository-wide test suite and repository-wide lint were not run for this two-line runtime deletion. Hosted preview gate checks do not prove authenticated hosted-page content or feedback submission. No auth, backend, scientific data, dependencies or hosting settings were changed; merge and production release remain manual.
