# BrainGate T15 recording-hours checkpoint

## Source and display

Adds one observation to **Neural recording hours — selected datasets**:

- **BrainGate T15:** ≈3,800 hours, one human participant, intracortical speech and cursor BCI, independent-use neural data non-public.
- **Date:** June 15, 2026 publication checkpoint; acquisition occurred earlier.
- **Primary source:** [Card et al. (2026), Nature Medicine](https://www.nature.com/articles/s41591-026-04414-6).
- **Duration basis:** the paper reports >3,800 hours of BCI use. Session data were saved except during privacy mode. The plotted approximation preserves that use-duration basis; an exact retained-recording duration is unspecified.
- **Supporting source:** [public figure/statistical reproduction summaries](https://github.com/Neuroprosthetics-Lab/NatMed_independent_personal_use). The source directory classifies these summaries separately from the non-public independent-use neural data and transcripts.

The shared chart retains its original 12 observations, logarithmic axis, TUSZ-only release connection and existing URL/aliases. This adds one singleton, for 13 observations across six dataset groups. The point's source inspection, coverage comparison, accessible label, source table, selected-data JSON and native PNG retain the approximate hours, matched participant count and duration basis. Its per-participant average uses the existing one-decimal display rule; session count remains unreported.

## Verification

- Test-first regression captured the missing point, then passed with actual mounted chart/rendering and registered image-export callbacks.
- Parent recording-hours test run: **29 passed, 0 failed**. After the source-directory integration fix, the BrainGate suite was rerun: **2 passed, 0 failed**.
- Exact contributor workflow contract subset: **25 passed, 0 failed**. Typecheck, scoped source lint and production build passed.
- Direct independent base-versus-candidate serialization/deep comparison of all DRAFT and METRIC evidence found only the asserted appended source plot, point, legend and note suffix. All original observations and unrelated evidence are identical. Archived evidence JSON, historical delta/golden fixtures, URL registries, dependencies and export renderer remain unchanged.
- Native browser: **1440, 390 and 320 px**; 13 real marks, BrainGate source inspection, approximation/one-participant pairing, no page overflow, first-Escape source dismissal, chart dismissal and reload. Actual application-generated PNGs were opened and visually inspected, including the approximate value, access legend, coverage bars and BCI-use basis.
- Independent review verified scientific/source fidelity, numerical preservation, exact additive compatibility fixture, native image evidence and privacy/scope. Its sole source-directory finding was repaired with a dedicated regression and bounded re-review.

### Existing regression debt

The broader 53-test compatibility run yielded 51 passes and two inherited failures. Both were independently reproduced on the exact unchanged base with identical assertion diagnostics: the connectomics metric-golden mismatch (actual `581f9fe989f7d1925b1cda65e7e70481962632d007230219850f7f82184facc3`, expected `dfbfce299a553a3aff505b70522291a74668940297ebbd011c2ecc5e3d45ee43`) and an acquisition-budget-copy regex. The separate source-directory inventory check retains its pre-existing PMC1564115 omission; the new BrainGate source is classified. These unrelated records/assertions are preserved. No full-regression-green claim is made.

## Evidence stage

Screenshots and native PNG are from a **local production build**, baseline `c1195d7862fe7dc1346922bc0159f3ad3c8b6750`, implementation `456c945aca1ed7817f6ca0220f4c59f81b737d11`, plus the source-directory fix `86f0d9c177b75cf978b30f3d5cab868a6ed238eb`. A disposable loopback-only QA proxy was used outside the source branch; hosting/auth configuration is unchanged. Evidence-only commits retain the reviewed runtime and source files.

Files: `before-desktop.png`, `after-desktop.png`, `after-mobile-point.png`, `after-mobile-coverage.png`, `native-export.png`.

Canonical chart: https://www.plneuro.xyz/neuro-atlas/field-velocity#neural-recording-hours-selected-datasets

PR handoff only; production publication follows a separate merge/release decision.
