CANDIDATE — Two presentation-contract gaps remain, and the exact revision does not yet have attributable final native/visual evidence.

## Review scope

- Reviewed clone only: `/opt/data/projects/atlas-chart-design-critic-final-20261106`.
- Exact reviewed SHA: `684c183eea1d34ae3fcedd9a4e3c25dd322a5e65`.
- Explicit base: `c247dc0c90fff9604e6095c32f210dbd79d471e5` (PR85); verified it is an ancestor. Used `git diff c247dc0 HEAD`, not origin/main.
- One independent full pass. No earlier findings ledger was supplied or inherited. No second reviewer, source edits, browser control, build, full-suite run, credentials, hosted access or external writes.
- Evidence cutoff: **2026-11-06 13:53:35 UTC**. Native capture was explicitly still in flight; pending evidence is not a claim of failed rendering.

## Material defects

**F1 — P1: Trends observation dots bypass the shared screen-space contract.**

Location: `src/components/google-trends.tsx:33,65–69`; compare `src/lib/chart-presentation.ts:8–10` and `docs/chart-presentation.md:10`.

- Problem: labels use the CTM-aware presentation hook, but newly interactive weekly observations still use literal `r={2.5}`. Selection does not change that radius. They therefore do not have a constant 5px detail radius or 7px inspection radius.
- Why it matters: viewport-dependent ordinary-dot size remains in a family included in the cleanup; the documentation's blanket marker contract is stronger than the implementation.
- Objective probe: mounted the actual `GoogleTrends` component against its existing source, with explicit CTM scales. Labels stayed at 12 screen px. Resting and focused radii were respectively **2.3333 / 2.3333**, **2.5 / 2.5**, and **3.9333 / 3.9333** px at scales 0.9333, 1 and 1.5733. This is a deterministic component/transform probe, **not native pixel evidence**.
- Exact fix: use the hook's `unitsPerPixel` and an explicit resting/active radius contract, with canonical export-radius metadata. Verify dense weekly lines do not become a carpet of oversized dots. If smaller dense-line samples are deliberately exempt, obtain an explicit exception to the supplied bar and document/test a constant screen-space size instead of silently claiming universal 4/5/7 compliance. Do not alter values or date coordinates.

**F2 — P1: The application-event family retains its centered date caption.**

Location: `src/components/draft-chart-plot.tsx:274`, `DraftEventTimeline`.

- Problem: “Publication / demonstration year” and every caption tspan still use `x={width / 2}` with `textAnchor="middle"`. The other Draft date caption was changed to the shared left edge at line 178, but this family was missed.
- Why it matters: the general left-aligned-axis cleanup was the owner's main request, not an optional consequence of adding source popovers. The event family is mounted in both preview and detail by `src/components/draft-chart-panel.tsx:38–40`.
- Objective probe: actual mounted event-preview DOM produced `viewBox="0 0 560 320"`, caption `x="280"`, anchor `middle`, tspan `x="280"`. This establishes the implementation discrepancy; final native appearance is pending F3.
- Exact fix: set this caption and its tspans to `x={0}`, with start anchoring, preserving wrapping, tick anchors and all event coordinates. Extend the existing caption-alignment regression to `DraftEventTimeline`, not just `DraftChartPlot`.

**F3 — P1 acceptance gate, not a proven product bug: final visual evidence is not available for attribution.**

Location: `/opt/data/tmp/atlas-allchart-final-evidence/` at the stated cutoff.

- Problem: `final-capture-provenance.json`, `all-chart-native-report.json` and `design-contact-sheet.png` were absent. The repository's older `docs/qa/chart-design-cleanup/capture-provenance.json:2` names runtime revision `9b1b61bb9e3d65659198180fc38a9aabbffb99d4`, not the reviewed SHA.
- Why it matters: component tests cannot establish actual all-family legibility, glyph bounds, responsive layout, native popup behavior or final PNG clarity. Existing loose screenshots cannot be promoted to exact-revision acceptance merely because their filenames say “final.”
- Exact fix: complete the already-running parent replay; bind runtime/source/build parity and screenshot/PNG files to the reviewed revision, then inspect those exact final outputs. Require all chart previews/details at 1440/390/320, real Milestones selectors/month scrolling, Funding labels, source access, focus/Escape/history and actual clipboard/download results. Do not start another browser or change auth to satisfy this review. Full-suite/lint results remain separate parent-owned gates.

## Assumptions and evidence gaps

- **Unsupported completion claim:** none was attributed to the author. The brief correctly labels native capture and full-suite execution as pending. F3 prevents a PASS; it is not evidence that those runs failed.
- **Untested design assumption:** dense Trends line samples may justify smaller dots. That is a plausible clarity argument, but it is not a documented exception to the explicit review bar; resolve F1 deliberately.
- **Final render limitation:** I opened the loose Recording PNG, desktop source-popup screenshot, Milestones 320 screenshot and Funding 390 screenshot. Without final provenance, I did **not** treat their long captions, alignment or mobile geometry as defects in `684c183…`. The exact final compact export and contact sheet remain visually unjudged.
- **Scientific scope:** the compact Recording caption's implementation retains per-observation values, units, preparation, date/basis and citations (`performance-curves.tsx:338–345`). The optical view's description retains **1,136,223 neuronal signals at 2.2 volumes/s** (`src/data/recording-evidence.ts:80`). Full notes go into SVG `desc` (`chart-export.ts:249`). This is a reasonable compact-caption design, not a reason to restore every methodological paragraph to the raster. Native legibility still needs F3.
- Official-logo provenance is recorded in the vetted compile-time module. I did not access remote repositories or independently recertify the upstream asset during this clone-only review.

## Downside and failure map

- **Certain / limited visual impact:** F2 leaves one chart family visibly outside the intended caption hierarchy. Readers absorb the inconsistency; correction is small and reversible.
- **Certain contract mismatch / moderate clarity trade-off:** F1 keeps viewport-derived dot sizes. Blindly enlarging hundreds of weekly samples could instead obscure lines; test the dense-series countercase before choosing the fix.
- **Unknown likelihood / material acceptance impact:** stale screenshots could hide clipping, undersized type or a PNG regression. Parent and owner absorb another review cycle if interim files are presented as final. F3 is the kill criterion for claiming visual completion.
- **Do not proceed to a finished handoff** while F1/F2 are unresolved against the agreed bar or F3 is unverified. The call reverses with located code/test closure or an explicit dense-line exception, plus attributable native evidence. No merge or production authorization follows from any review verdict.

## Better way

Finish the existing implementation rather than adding another chart framework or review process. Reuse `usePreviewFont` for Trends' screen-space geometry and the existing Draft left-caption pattern for events. Let the parent finish its single owned native replay. Preserve PR85 semantics, meaningful Funding amount encoding, overlap rings and source disclosures.

## Brevity and structure cuts

**F4 — P2 caveat: retire the stale native-replay recipe.**

Location: `docs/qa/chart-design-cleanup/README.md:27–37` points to `scripts/qa/chart-design-browser.py`; that script's lines 54, 59 and 69 dereference `.pc-point-readout`, which this revision removes.

Problem → the advertised repeat command cannot validate the current inspector design → label it historical/before-only or update its assertions to the floating popup, and point the current recipe to the current all-chart replay. Also label the README's earlier 14px-title statement at line 7 as historical or reconcile it with the current 16px contract. Do not inflate the scientific export caption while cleaning up QA prose.

## Objective probes and hard gates

- **PASS — revision/scope:** exact HEAD verified; worktree clean before and after the review probes; explicit-base ancestry verified; `git diff --check c247dc0 HEAD` exited 0.
- **PASS — source/auth boundary by diff:** no changed scientific data, field-velocity data/schema library, publication-data selector, API route, middleware, dependency manifest or deployment configuration appears in the explicit-base changed-file list. The PR85 sector-change implementation remains present; its diff is presentation/inspection work, not a data refresh.
- **PASS — added-line static security review:** scanned the added lines for hardcoded-secret, shell-injection, eval/exec, unsafe-deserialization and interpolated-SQL patterns. The sole exec hit was the README's explicit local QA-script recipe, not application evaluation of untrusted input. No unresolved added-line security concern was found. This is a bounded scan, not a security certification.
- **PASS — focused execution:** `node --import tsx --test tests/point-source-tooltip.test.mjs tests/chart-export.test.mjs tests/chart-typography.test.mjs tests/funding-legibility.test.mjs tests/milestone-legibility.test.mjs` returned **40 passed, 0 failed, 0 canceled, 0 skipped**. Covers popup priority/grace/pinning/Escape, inert export/source-DOM preservation, canonical typography, Funding labels and Milestones packing. JSDOM is not native top-layer/pixel proof.
- **FAIL against the supplied presentation contract:** F1 and F2, supported by exact source locations and the independent mounted-component probes above.
- **NOT VERIFIED — rendered hard gates:** exact-revision all-family population/legibility, clipping, equal-height previews, native modal/source flows, actual PNG appearance and clipboard behavior. F3 prevents marking these PASS. No full build, full suite or lint run was duplicated.

## Prioritized fix queue

1. **P1 — F1:** resolve Trends' screen-space radius contract; preserve dense-line readability and normalize export emphasis.
2. **P1 — F2:** left-align the event date caption and add this family to the regression.
3. **P1 gate — F3:** finish and attribute the parent-owned final native evidence; inspect the actual compact PNG and final chart surfaces. Re-pin if fixes change the SHA.
4. **P2 — F4:** reconcile the historical QA recipe and title-size prose with the current revision.

## Residual risk and dissent ledger

- No P0 security, data-integrity or authorization breach was found in this bounded diff review. That does not waive native execution or the in-flight full-suite/lint gates.
- Strongest dissent against F1: dense weekly line samples legitimately need a different visual density from sparse scientific scatterplots. **This objection survives**; an explicit, tested screen-space exception is an acceptable resolution, whereas silent viewport scaling is not.
- Strongest dissent against F2: a centered year caption is readable and does not falsify data. **True, but it does not satisfy the explicit general left-alignment request.** This is a presentation-completion blocker, not a scientific-integrity accusation.
- Final all-family visual judgment, compact-export appearance and native interactions remain unresolved pending exact-revision evidence. This report is not a release approval.
