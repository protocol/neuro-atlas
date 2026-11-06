CANDIDATE — The source fixes close F1, F2 and F4, but F3 remains blocking because exact-revision native acceptance evidence is incomplete.

## Scope and revision

- First bounded closure review of the complete original ledger at `/opt/data/tmp/atlas-chart-design-final-critic-report.md` (F1–F4), plus the three expressly authorized deltas. No new design hunt.
- Read-only clone: `/opt/data/projects/atlas-chart-design-critic-closure-20261106`.
- Verified exact HEAD: `cf14f32109ebe5434ca015d307390d9bcee0671d`.
- Explicit comparison base: `6f475a2ab6342ce948431e25c58effc20c095672` (PR86), verified as an ancestor. Did not use origin/main.
- Evidence cutoff: **2026-11-06 14:47:36 UTC**. Worktree remained clean; explicit-base `git diff --check` passed.
- No source edits, commits, browser control, credentials/auth access, owner contact, delegation, full suite or production build. This report is the only deliverable written.

## Material defects — original finding dispositions

**F1 — CLOSED.**

Location: `src/components/google-trends.tsx:33,65–68`; `docs/chart-presentation.md:10`; `tests/chart-typography.test.mjs:98–114`.

Resting dense weekly samples now multiply the explicit 2.5px radius by `unitsPerPixel`; inspection uses 7px, and `data-export-r` restores 2.5 for export. Independently executed the regression at CTM scales 0.9333, 1 and 1.5733. Resting/inspection size and canonical export assertions passed. The documented density exception is scientifically reasonable; enlarging all weekly samples to scatter size is not required for closure. Source values/date positions remain untouched.

**F2 — CLOSED.**

Location: `src/components/draft-chart-plot.tsx:297`; `tests/chart-typography.test.mjs:93–97`.

The event date caption now has `x={0}`, `textAnchor="start"`, and every tspan has `x={0}`. Independently executed preview and full-chart regressions; both passed. Event coordinate formulas remain separate and unchanged.

**F3 — RETAINED, P1 acceptance gate; not a demonstrated rendering bug.**

Location: `/opt/data/tmp/atlas-allchart-final-evidence/` at the cutoff; `final-source-parity.json:2–8`.

- Problem: `final-capture-provenance.json`, `all-chart-native-report.json`, `milestones-funding-native-report.json` and `native-export-results.json` were absent. So were `neuroai-detail-desktop.png`, `neuroai-native.png`, `recording-human-channels-native.png` and `recording-optical-native.png` in the inspected directory inventory. An older `milestones-funding-native.json` exists but does not supply the missing final attribution.
- The available `final-source-parity.json` names cf14 and the correct base and asserts code/asset parity. It does not identify the served build/assets, connect individual captures to that runtime, or provide the pending acceptance results. That assertion alone cannot authenticate the loose images.
- I opened `design-contact-sheet.png` and `recording-branded-native.png`. The sheet contains four populated cards, but its bottom-right NeuroAI chart still shows the **unbroken** 1.13 / 21.45 / 41.77 axis. This is evidence that this image does not depict the requested broken-axis revision, not proof of a cf14 code defect. The recording PNG visibly has a white backdrop, blue tab, PL R&D logo and readable source observations; its current-revision attribution remains unverified.
- Why it matters: focused component/serialization tests cannot establish final all-family legibility, native pointer targeting, clipping, actual PNG/clipboard behavior or the owner's specific visual correction.
- Exact fix: finish the parent's existing replay, bind runtime/source/build parity and the actual output files to cf14, then inspect those final captures and native receipts. Cover all 24 Field velocity cards/details at the required viewports, Milestones selectors/month scrolling, Funding amount encoding/labels, popup focus/tap/Escape/history, and electrical/human-channel/optical plus broken-axis exports. Do not relabel the old four-card sheet as cf14. No source fix is warranted solely because evidence is still being produced.

**F4 — CLOSED.**

Location: `docs/qa/chart-design-cleanup/README.md:7,27–37`.

The README now specifies 16px preview headings, points the current recipe to `all-chart-design-browser.py`, and explicitly labels `chart-design-browser.py` historical/marker-only rather than current tooltip acceptance. The stale selectors remaining in that historical script are not a current acceptance claim.

## Authorized deltas — objective closure checks

**PR86 integration: PASS at source/component level; native acceptance remains under F3.**

- Independently compared baseline bytes for 65 tracked files under `src/data`, `public`, and the named publication selector/provider, proxy and package manifests: no differences from PR86. This preserves the scientific snapshots, source observations and checked boundary files; it is not a claim about every possible deployment setting.
- `publication-charts.tsx:33–51,62–87` retains 2010–2025 mapping, separate paper/index units, the actual 2022 anchor, index-to-paper scale lock, shared-year values, colored keys and guide. Existing annual tests retain their exact value/unit/anchor assertions while moving tooltip selectors to the portal.
- Added independent mounted-component probe: click 2023 paper then 2023 science with distinct trigger rectangles. The same text remained visible and the popup moved from `122px,104px` to `522px,304px`, rather than toggling off. Escape removed both popup and year guide and kept the chart open. This uses mocked rectangles, not native pixels.

**NeuroAI break: PASS at source/component/serializer level; actual PNG and pixel legibility remain under F3.**

- `src/lib/neuroai-energy-axis.ts:4–33`: scope guard limits the break to numeric, linear `neuroai-imagenet`; segments are 0–6 and 40–42 with widths 75%/25%, hence the same pixels per unit. A gap/out-of-range observation restores the full-range axis.
- `draft-chart-plot.tsx:112–119,138–160,185–213`: unchanged y mapping, split grid/axis, explicit slashes, integer ticks, wrapped SVG explanation, and segment-bounded leaders. Export notes also carry the explanation (`:175–179`).
- Independently ran all six `tests/neuroai-axis-break.test.mjs` cases: exact six x/y coordinates and tables/tooltips, operation-count estimated energy versus evaluated accuracy, unchanged y positions, narrow/wide geometry, no cross-gap lines, fallback, unrelated-plot isolation and SVG-export retention passed. These tests use estimated text bounds; they do not substitute for native glyph/PNG inspection.

**Narrow popup and rapid Escape: PASS at focused component level; native targeting remains under F3.**

- `point-source-tooltip.tsx:39–42,52–54,97–125`: side placement when possible; otherwise above/below with constrained height; same-value selections distinguish triggers; synchronous dismissed flag lets a rapid second Escape propagate.
- Focused tests passed narrow clamping/reanchoring, focus priority, actionable source links, pin/toggle/dismiss, and two Escapes before passive cleanup. Browser-native pointer-down/up and top-layer behavior remain unverified in this closure.

**New P0s:** none substantiated. **New P1 correctness defects in the named deltas:** none substantiated.

## Assumptions and evidence gaps

- Unsupported completion claim: none attributed. Parent build/full-suite/native capture gates are explicitly pending, not reported failures.
- Reasonable tested assumption: a broken axis can clarify this empty interval without dropping observations. Equal linear scales, explicit disclosure and fallback support it; native inspection must still establish clarity at delivery size.
- Exact-revision all-family population, Funding bubble preservation in the rendered surface, final native exports and clipboard results remain unverified under F3.
- Phone-width loopback QA is viewport emulation, not physical-phone testing or authenticated hosted-access verification. Do not conflate those scopes.

## Downside and failure map

- **Verified evidence mismatch / material acceptance impact:** promoting the old unbroken-axis sheet would claim the owner's latest request was visually verified when it was not. Owner and parent absorb rework and credibility loss.
- **Unknown likelihood / moderate usability impact:** narrow popups or break notes could still fail native geometry despite passing mocked-DOM tests. Readers absorb inaccessible or obscured evidence.
- **Kill criterion:** do not claim finished visual acceptance while F3 is retained. Reverse this call when source/runtime/build parity and final native artifacts close that gate. A missing receipt alone is not grounds for rewriting working chart code.

## Better way

Finish the single parent-owned replay and inspect its attributable outputs. Keep the current localized break, shared tooltip and density exception; do not add another framework, browser run or design process. No broader redesign is justified by this closure.

## Brevity and structure cuts

F4 is resolved. No further writing/design theme is opened. Keep historical captures labeled historical and put exact final provenance first in the evidence handoff.

## Objective execution receipts

- `node --import tsx --test tests/neuroai-axis-break.test.mjs tests/point-source-tooltip.test.mjs tests/publication-source-tooltip.test.mjs tests/publication-annual-axis.test.mjs tests/trends-source-tooltip.test.mjs tests/chart-presentation.test.mjs` — **38 passed, 0 failed, 0 canceled, 0 skipped**.
- `node --import tsx --test tests/chart-typography.test.mjs tests/chart-export.test.mjs` — **21 passed, 0 failed, 0 canceled, 0 skipped**.
- Separate inline same-year reanchoring/Escape probe passed with the coordinates reported above.
- Full suite and production build were not duplicated; no acceptance verdict is inferred from the earlier bdcd run.

## Prioritized fix queue

1. **P1 — F3:** complete and attribute the parent's final native evidence, then close the remaining visual/export/interaction gate. Preserve this report's F1/F2/F4 closures; any further review is the remaining bounded closure, not a fresh hunt.

## Residual risk and dissent ledger

- Strongest objection: source changes and focused tests are correct, so more review may only delay delivery. **Partly survives:** no additional source defect was established, and no further design hunt is justified. It does not establish the requested actual rendered/exported artifact.
- Strongest objection to the broken axis: it can exaggerate apparent proximity across an omitted range. **Mitigated in source** by identical linear scales, visible slashes, full-range disclosure and preserved exact values; native readability is still unverified.
- F3 remains the sole blocking finding. No merge, deployment or member-facing completion authorization follows from this report.
