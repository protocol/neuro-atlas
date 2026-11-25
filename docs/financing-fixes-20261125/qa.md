# Financing verification

## Revisions and evidence scope

- Canonical data checkpoint: `43ffb9cdd85cf329a93b0391efeaf586ea1775c6`.
- Reviewed and locally built application: `acdd4f138d21ea24bd1ab6e0a6aaf2cb7520927e`.
- Final test-only successor: `48dcb97767a9b26e5cf4a509ed89fa27d455c10f`. Its only change is the month-precision source-link assertion in `company-blog-milestones.test.mjs`; application and data bytes are unchanged.
- The screenshots below are actual headed-Chrome captures of the local production build, not hosted screenshots. Twelve served JavaScript/CSS assets matched the built files exactly. The [screenshot manifest](screenshot-manifest.json) binds the captured files to those revisions.
- Later documentation/evidence-only commits do not change these application, data or test inputs. The PR records the separate hosted deployment identity and final remote head.

## Native browser checks

| Surface/state | Observed result | Capture |
| --- | --- | --- |
| Funding, Precision company detail, light, 1440px | $430M company-reported total remains separate from $405M indexed financing; the excluded record and source are visible. | [Company detail](precision-detail-light-1440.png) |
| Funding, stage view, dark, 1440px | Corrected current stages, indexed company values and reported-total annotations render. | [Stage view](funding-stage-dark-1440.png) |
| Funding, timeline legend, dark, 1440px | Hollow marks are labeled “Disclosed amount excluded from totals · reason shown per record”; NeuCyber visibly retains its scope-specific exclusion. | [Exclusion legend](funding-exclusion-legend-dark-1440.png) |
| Funding source context, Science, dark, 390px | $103.604355M convertible-note sales, filing date, $110M target and unresolved allocation to later equity are readable without page overflow. | [Mobile source context](science-source-dark-390.png) |
| Milestones source context, CorTec, dark, 390px | The undated grant remains accessible without an invented event date or empty `<time>` element. | [Undated grant](cortec-source-dark-390.png) |
| Milestones, all-neuro 2024, dark, 1440px | NeuroPace’s $3.4M ATM remains a year-level record on the period shelf, not a January 1 point. The supported amount stays in the annual financing total. | [Annual period shelf](annual-2024-period-shelf-dark-1440.png) |
| Milestones, actual Jan. 1–5 pointer selection, dark, 1440px | Located capital is $0M; “Window allocation unknown · $3.4m across 1 period-level record” is distinct from located financing. The month-level clinical record also retains its timing uncertainty. | [Selected window](annual-2024-selected-window-dark-1440.png) |
| Milestones, period shelf, dark, 390px | Both month/year-level records remain readable. Requested width, inner width, document client width and scroll width are all 390px. | [Mobile period shelf](annual-period-shelf-dark-390.png) |
| Milestones, Zhiran 2025 Series A tooltip, dark, 1440px | “Over RMB 300m (over ≈$41.8m)” and the reported date remain in the headline; the note explains the lower-bound comparison. | [Qualified tooltip](zhiran-qualified-tooltip-dark-1440.png) |

Actual source-context routes were also checked for the four added Blackrock, BCI-Sonics, Nanochap and Zhiran disclosures, including their full source notes, stage labels, dates and qualifications. Funding source context was checked in light and dark themes. The broader company/source/drawer checks from the included Paradromics change remain historical evidence at their original revision, not new captures of this revision.

These are desktop and viewport-emulated pointer checks, not physical-phone touch tests. No hosted authentication or production activation is inferred from localhost.

## Data, code and test gates

- Canonical generation, production webpack build and application/route typecheck passed.
- The accepted public-evidence plans passed 446 literal evidence checks with no issues. Historical exchange-rate replay passed 34/34 provider checks.
- The four missing qualifying Milestones and three related notes were reconciled across canonical inputs, generated payloads, public dispositions and exact data locks. All 56 original noncapital Milestones remain unchanged.
- Independent source/data and code reviews found material omissions and partial-date/exclusion defects. Those findings were fixed; bounded re-reviews closed them with no retained P0/P1. The independent code probe made 123 real-component assertions; focused native tests, strict data-lock/current-data checks and mutation-rejection checks passed.
- All 33 original historical fixtures remain byte-identical. The exact reviewed-delta helpers fail closed for unexpected changes; native current-data tests independently read the actual canonical and generated records.
- Changed-file lint has zero errors and two nonblocking unused-test-variable warnings (`logo`, `funding`). The `logo` warning is also present on the baseline. No lint failure is described as a clean whole-repository result.
- The standard full-suite terminal comparison is recorded in [verification-summary.json](verification-summary.json) and the PR. It compares exact failure identities and actual/expected diagnostics, not just failure counts. The existing baseline has 36 failures; a partial or focused pass does not erase them.

An additional eight-worker diagnostic run reported the same 36 baseline diagnostics plus the original-fragment history assertion in the unchanged `performance-modal.test.mjs`. That failed run is retained, not labeled green. The test, helper, application component and snapshot inputs are byte-identical to baseline; both baseline and candidate passed 6/6 twice in subsequent focused replays. The precise cause of that additional diagnostic-run failure was not established. This is separate from the repository-standard full-suite result.

## Release boundary

This is a reviewable financing correction, not a complete public financing history or proof of cash receipts. Source-access gaps, unknown per-round allocations, commitments, secondary consideration and unresolved instrument overlap remain explicitly qualified. Company-reported cumulative totals are context, not synthetic balancing rounds.

No merge or production release is authorized or performed by this handoff.
