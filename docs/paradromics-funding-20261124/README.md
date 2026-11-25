# Paradromics funding correction — verification

## Data and scope

The [source reconciliation](../../data/funding-index/source-review-20261124.md) records the public evidence and date bases. Paradromics shows **$180M company-reported total**, including federal funding, separately from **$85.37M indexed financing** (**$85.4M** displayed). The 2022 **$8.864853M** disclosure is visible and held out of indexed capital pending conversion reconciliation. The cumulative company report adds no financing record or investor-associated capital.

The company roster, unrelated financings, founding records, regulatory markers, Milestones, routes, authentication and indexing configuration are unchanged.

## Rendered evidence

- `before-detail-1440.png`: hosted baseline at `023598e99d14b799b536df680e07f9d30e83b649`, showing the earlier $60M indexed view.
- `after-detail-1440.png` and `after-detail-320.png`: real local Next.js production build of this PR's runtime, showing $180M and the distinct $85.4M indexed subtotal together.
- `after-stage-390.png`: indexed stage/bar retained, with the company-reported total annotated separately.
- `after-source-1440.png`, `after-source-390.png` and `after-source-dark-1440.png`: the exact interview-source context in light/dark layouts.

Narrow-width captures use Chrome viewport emulation and pointer input, not physical-phone touch testing. Native replay also covered the 390px company detail, closed Source notes disclosure, source hyperlink, Escape dismissal, filtering, stage selection, and source-query/fragment navigation. At 320px and 390px, requested width, layout width and document scroll width agree.

## Checks

- Production build and route/application typecheck passed.
- New reported-total tests: **9/9 passed**.
- Full-suite replay: **1,618/1,654 passed**, with **36 failures matching the baseline's exact failure identities and diagnostic values**; no new full-run failure was introduced. A subsequent literal-citation validation fix was checked with the focused suite below and leaves generated data and rendered application files byte-unchanged.
- Post-review funding/source/audit/legacy focused suite: **194/196 passed**; the two source-catalog failures retain the baseline's exact actual/expected values.
- Changed-file lint and whitespace checks passed. Repository-wide lint retains the baseline's exact **3 errors / 12 warnings**; CI status is recorded in the PR description.
- Generator output is byte-deterministic. All indexed metrics remain unchanged by the separate reported-total metadata; earlier offering corrections have exact historical compatibility checks.

The hosted preview and its exact edited-route URL are linked in the PR description. These screenshots are local-build evidence, not production-release evidence.
