# Independent bounded chart-legibility closure

## Terminal verdict: PASS — bounded closure at `a220bbb55eea471bacc623513e5809efada000e3`

Both original P2 findings are closed. The already-open mobile width/label-gap fixes and test-contract reconciliation pass this bounded review. **No remaining P0/P1 or unresolved original finding.** This is closure of the completed original review, not a fresh design/scientific-data hunt or approval to merge/deploy.

### Scope and revision

- Read `review-original.md` verbatim and reviewed the complete 13-path delta from `82e40ce` through `b0fabf3`, `d8b1eff` and `a220bbb` in the disposable snapshot `/opt/data/tmp/atlas-chart-legibility-closure-20261112`.
- Independently checked exact HEAD, clean status, physical `node_modules`, and `git diff --check`. The closure snapshot was not edited. Only four production files change in this closure delta: the rail CSS, participant component, curve component and publication component.
- The original full review's unchanged scientific/data/interaction checks remain retained evidence. PR102 and unrelated source validation remain out of scope.

## Original finding judgments — each adjudicated once

### C1 — CLOSED

`src/components/performance-curves.tsx:270` now uses the explicit `connectTracks` opt-in for its visible note, while preserving the existing frontier and genuinely unconnected-observation branches. The expanded Citation latency dialog visibly says:

> Lines connect successive reliable observations within each measurement series; other source observations remain separate.

The direct regression passed against the actual rendered note. I opened the parent-captured final `native-final/dialog-1440-1.png` with vision: the reliable annual observations are connected, the recent hollow observations remain outside that path, and the corrected explanatory sentence is visible below the populated plot. Final native receipts show the single `idea_vintage` connection at all three widths.

### C2 — CLOSED

`src/components/performance-curves.tsx:318–320` accepts an optional, explicit track list; `src/components/participant-commitments.tsx:32` passes **only** `neuralink-cumulative`. No all-track inference was added. The direct regression passed for exactly five source checkpoints — `2024-01-01`, `2024-07-01`, `2025-02-05`, `2025-06-02`, `2026-01-28`, values **1, 2, 3, 5, 21** — with one isolated within-track path in preview, modal and serialized export. Source-coordinate matching, cohort caveat and source tables remain intact. The original source/date/value/URL identity proof is retained; the underlying source and reader-copy files are still byte-identical to main.

The inventory's participant decision is revised to this exact bounded opt-in. I inspected actual final `native-final/export-3.png` with vision: the teal Neuralink cumulative line is present, other cohorts remain separate colored marks, and the legend identifies the cumulative series. All three native-width receipts also contain only that connection and the five exact values.

## Already-open changed dependencies

### Mobile rail width and growth-label gap — PASS

- `src/components/draft-chart-plot.css:167` changes the mobile remainder from 40 to 24px: **16px inter-card gap + 8px next-card peek**, rather than claiming the entire remainder is the peek. Width increases without reduced typography or changed source values.
- `src/components/publication-charts.tsx:108–120,181,211` moves endpoint labels by **radius + 6 normalized CSS pixels** in preview and expanded views. Quantitative centers, stems, source values, source text and colors are unchanged by this fix. The direct CTM regression passed across narrow/wide scales.
- Parent native `comparison-final/geometry.json`, independently parsed: desktop cards **649.078×647 → 856.797×615**; 390px **284×879 → 300×829**; 320px **214×1016 → 230×938**. Final per-width card-height spread is 0px, 0.109375px and 0px respectively—equal-height behavior within ordinary subpixel layout rounding, not exact integer equality at 390px.
- At 320px, the growth heading changes from **10.424763px outside** to **5.254978px inside**. I inspected `comparison-final/after-growth-320.png`: the full heading and percentage endpoints fit, with visibly separated dots/labels. `native-final-extra.json` confirms 21 growth endpoint labels per width with minimum gap just above 6px, 87 preview circles per width at approximately 5px radius, and positive native horizontal-wheel movement at all three widths.

### Test-contract reconciliation — PASS, no skip/tolerance weakening

The `d8b1eff..a220bbb` commit changes exactly three test files and no production files. Independently checked:

- **All eight original SHA-256 golden constants unchanged:** three curated-reader and five extrapolation constants. Original literal test titles retained; no `skip`, `todo` or `only` directives introduced in these files.
- `curated-reader-copy.test.mjs:22–63` excludes only new plot-level `connections` metadata from the historical scientific projection, then separately asserts the complete exact connection objects, both permitted plots and absence from archived evidence.
- `extrapolation-ui.test.mjs:24–61` asserts the exact added annual-guide sequence and expanded/export radius 6 before removing only added guides and restoring historical radius 5 for comparison with unchanged geometry/content goldens. It preserves any preexisting sibling content; no source center/value/interval/tick/label is normalized away.
- `neuroai-axis-break.test.mjs:72–87` asserts the explicit 200-unit preview / 232-unit full span plus existing extension, then compares normalized y in the original 232-unit scientific frame. The original `near` function and **`1e-8`** bound are byte-for-byte unchanged. Existing x-segment, glyph, gap, table and export assertions remain.
- Eight source/evidence/reader-copy files were compared directly with `cc1ceaa` and are byte-identical; exact hashes are recorded in `review-probes/closure-static-verification.json`.

## Execution and native evidence ledger

**Reviewer-operated completed focused execution:**

```sh
node --import tsx --test tests/chart-connection-review.test.mjs tests/chart-legibility.test.mjs
```

**Exit 0; 8/8 passed; 0 failed/canceled/skipped/todo; 2.604 seconds.** Durable receipt: `review-probes/closure-independent-quick-receipt.md`.

**Incomplete attempts, not passing suites:** two preceding wider 16-file reviewer test attempts exceeded their 180-second limits. The first lost its in-memory partial stdout on timeout; the second preserves incomplete stdout in `review-probes/closure-focused.log` and terminated its own process group. That log has successful cases but no terminal suite result. Neither attempt is counted as a pass; the timeout's cause is not established. No further wide retry was performed. The independently completed narrow execution above and the parent's separately completed full suite below are the passing execution evidence.

**Parent-operated final native replay, reviewer-reconciled artifacts:** parsed `native-final/all-chart-native-report.json` and matched every title to the exact acceptance inventory: **24 previews + 24 populated dialogs at each of 1440/390/320px**, totaling **72 preview measurements and 72 dialog visits**, with `noPageOverflow: true` at each width. Checked affected connection identities/values and guide pointer exclusion, all **24 actual PNG receipts/files**, PNG signatures/dimensions, and source-popup receipts for the two affected charts. I did not operate the browser; focus restoration, resting-popup absence, click/Escape sequencing and HTTP source-header enforcement are parent-operated replay assertions. The native matrix is bound to this exact runtime by the parent's reported header-pin enforcement, not by a reviewer HTTP fetch. This closure visually inspects the three affected final images named above, not a second all-24 design sweep.

**Completed parent full gates:** read `gates-final/gates.json`: exact pin and final HEAD `a220bbb55eea471bacc623513e5809efada000e3`, clean final status; **1187/1187 tests passed, 0 failures/cancellations/skips/todo**; typecheck/build exit 0; changed-source lint has no new or retained errors. These are checked parent receipts, not a claim that the closure reviewer reran the full suite. They were pending initially and are now terminal, so no full-gate dependency remains pending here.

`review-probes/closure-native-verification.json` records the reconciled matrix/geometry, 24 PNG hashes and hashes for nine native/gate/source receipts. The retained `native-source-delta.json` source-mark identity receipt was rechecked; no new data audit was opened.

### Later evidence-only head qualification

The parent has announced a **planned** separate docs/screenshots/QA-helper commit. This verdict pins runtime and tests to **a220bbb**, not to an unknown future docs SHA. Report that later evidence head separately and prove empty runtime/test/package/config delta before carrying this verdict forward. The announced helper changes reconcile painted-height/SVG-width stability and per-label `data-export-font-size` roles with the already-executed final replay; this report does not pretend to have reviewed an unprovided future commit. No hosting, push, PR, merge, messages or access changes were performed by this reviewer.
