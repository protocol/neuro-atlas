# Animated connectomics benchmark toggles — QA

## Revision and boundary

- Runtime: `9345401064d2f4e851be06d91ad71788a9f70b27`.
- Independent before-state: main `5015d2cc27a2c63babbdc0ad93d975724a25b84b`.
- Captures use a **real local production build**, `/neuro-atlas/field-velocity`, behind a disposable loopback-only, runtime-flagged, Host-restricted/noindex QA proxy. The fixture is excluded from the branch; production authentication is unchanged.
- Later evidence-only commits do not change application code, assets, dependencies or tests. Main subsequently advanced only in the separate Milestones-header work; that work is not reverted or included in this feature.
- This is a PR handoff, not merge or production authorization. Hosted positive-password acceptance and physical-phone touch are not claimed by these local receipts.

## User-facing result

The two pop-out charts have default-off native switch buttons:

1. **Selected public image/resource footprints**: mouse, rhesus macaque and human whole-brain raw-image-equivalent benchmarks.
2. **Estimated acquisition cost per 10M voxels — optical and EM**: human image-acquisition budget targets of $1B, $100M, $10M, $1M and $100K.

Both interpolate the log-axis bounds and observed marks over 700 ms, reveal faint directly labeled dotted references as room opens, reverse from the current frame, and restore the exact original off-state geometry. Reduced motion settles directly. The model/source disclosure is collapsed below each switch. All observed data remain unchanged; these are hypothetical scale/budget scenarios. [Methods and source arithmetic](../../connectomics-brain-scale.md).

## Objective checks

- **33 focused tests passed** on the final runtime: 20 new feature/collision/source-clear tests plus all 13 recording-UI tests. Typecheck, changed-source ESLint, diff whitespace and the production build passed.
- **Broad-run qualification:** untouched main passed 1,235/1,235 tests. The initial feature revision `9d7b39c` passed 1,249/1,250 in the combined suite; `recording-evidence-ui.test.mjs`'s copied-URL/history roundtrip expected `optical` but observed `human-channels`. That entire unchanged file passed isolated on final HEAD (13/13); the cause of the combined-run failure remains unresolved. **The combined run is not all-green.** The final delta is limited to enabled-benchmark annotation clearance, non-focusing source-popup clear and a caption clarification, with dedicated passing regressions.
- Independently rendered inventories prove all **14 curated plot objects and previews** unchanged, and all **12 unrelated full views** unchanged. Original source/scientific data, auth, dependencies and hosting files are unchanged.
- Source volumes, sampling and all five budget conversions were independently retrieved/calculated. `independent-arithmetic.json` preserves the derived values.
- Independent review passed at `a0be536`; one P2 caption clarification was fixed. A bounded review passed exact runtime `9345401`, closed that finding and found no new P0/P1.

## Native acceptance

`candidate-motion.json` records both charts at **1440, 390 and 320 px**:

- Actual intermediate RAF positions in forward, reverse and interrupted motion; stable SVG top/height.
- Exact off-state source-table, preview and numeric geometry parity with the independent baseline, including after toggling back.
- Three/five visible reference lines; target-label bounds and pairwise clearance, including clearance from movable numbered observation keys.
- Native keyboard switches and reduced motion; disabled exports during transition.
- Pinned source → keyboard scale change clears the popup without stealing switch focus; first/second Escape retains source/modal layering.
- Two **actual Download PNGs** reopened and inspected. Selected scenario labels, budgets and compact scope survive the native export path.

`extra-native.json` records actual Copy chart writes/readback (one ClipboardItem containing text/plain, text/html and image/png), scoped clipboard permission restoration, dark-theme root-class ink, assumptions disclosure keyboard activation, native chart-trigger entry, default-off reopen and exact trigger-focus return.

Matched baseline has a 10px desktop dialog padding/scroll measurement difference and an already-clipped third sharing pill at 320px. This feature does not increase document/dialog overflow or change the shared header. Pointer-emulated narrow checks are not physical-phone touch tests.

## Reproduction

Use an owned browser-harness window and separate pinned production-build checkouts. Keep any local test proxy outside the source branch and loopback-bound; do not weaken hosted access. Supply `BRAIN_QA_BASE` with the loopback origin and `BRAIN_QA_OUT` with a task-specific directory.

First execute `scripts/qa/connectomics-brain-scale-baseline.py` against the pinned baseline with `BRAIN_QA_PHASE=baseline`; it writes `baseline.json`. Then execute `scripts/qa/connectomics-brain-scale-browser.py` against the candidate using the same output directory. Browser globals are injected by browser-harness, not a separate Chrome. Wait for fonts and measured plot width; document-ready alone can capture a pre-ResizeObserver viewBox.

The reusable replay also checks pinned-source keyboard switching and annotation/reference-label collisions, which were missed by the initial value-only and text-to-text bounds checks. `artifacts.json` binds the committed native receipts/images to their exact local runtime and file hashes.
