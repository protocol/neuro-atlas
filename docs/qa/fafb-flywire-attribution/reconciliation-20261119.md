# PR128 × PR129 conflict-resolution verification

Runtime merge: `9060d8da4aaeced0b9d1f664ab96ef9dc4970b3c`.
Parents: attribution PR128 `73226ca0bc3548954048439ba77c497e32f51cdb` and current-main backfill PR129 `fa32fcd7984fe2d4ddd4cc68be745409caf76603`.

## Resolution

All three conflict hunks had disjoint purposes; neither contribution was discarded:

- Export description keeps role-labeled principal/supporting references and the separate **EM Datasets, shared by Forrest Collman** discovery note.
- Sources keeps linked reconstruction and original-image references, with catalog discovery outside the scientific-reference list.
- Historical preservation tests compose the two exact approved deltas before the original frozen goldens. Canonical source notes and reader-projected notes retain distinct baselines. All six new checkpoints are asserted field-by-field before normalization; unexpected additions, missing/duplicated points and unauthorized numeric/source/qualifier mutations are rejected.

The immutable compatibility fixture was independently recomputed from the three source commits, including exact canonical and projected attribution deltas and exact backfill records. The complete integrated draft and metric projections independently equal pinned main plus the previously reviewed attribution-only delta. Main's six added points, scopes, qualifiers, catalog credit and JSON remain intact. The unchanged canonical archive still has 86 observations; the reader draft projection has 92 after the six approved additions.

## Checks

- Actual normal gated production build, including TypeScript: passed; no access-control or package changes.
- Parent focused integration replay: **40 passed, zero failed** across seven attribution, backfill, combined-provenance and preservation files.
- Historical/source follow-up: **119 passed, zero failed** across 16 files in both the reconciler's normal run and the parent's independent concurrency-bounded confirmation. `reconciliation/test-readback.json` records the parent's exact totals.
- Independent bounded code/merge review: **PASS**, no P0/P1 findings; independently reconstructed the immutable fixtures and full parent-projection union, with **134 focused tests passed**, zero failed, zero skipped.
- Exact immutable-fixture and complete-projection-union checks: passed.
- Native matched-main comparison: both affected charts at **1440, 390 and 320 px**, six cases. All plotted geometry and source-table scientific values match current main exactly; ten neuron-count and eight tissue-volume observations remain. Both role credits and separate catalog discovery appear in Sources and actual selected-data JSON.
- Both actual Download PNG handlers generated decoded raster images. New checkpoint keys/qualifiers, compact scoped FAFB / FlyWire credit, branding and referral footer were visually reviewed. Catalog discovery remains in SVG description metadata rather than painted into the compact PNG credit.
- First narrow pointer attempt hit the transparent center of the existing hollow overlap ring. The measured stroke-edge replay succeeded; no product/auth change was made. Keyboard selection and dismissal also passed. This is viewport-emulated pointer/keyboard evidence, not physical-device touch.

The original full-suite limitation in the parent README remains historical; these focused checks are not a new all-green full-suite claim. Existing 320px header-action clipping is unchanged from the matched main baseline.

## Evidence boundary

The images under `reconciliation/` are actual **local production-build screenshots and real Download PNG exports** of the merge runtime. The disposable loopback proxy is Host-restricted, noindex, not committed and never deployed; local footer URLs identify that test origin. `native-readback.json` binds the six cases and image hashes to the runtime revision. Later documentation-only commits do not alter that source.

Hosted exact-head deployment, PR mergeability and existing access gate are verified separately at handoff. No merge into main, production release or outreach is authorized by this conflict-resolution work.
