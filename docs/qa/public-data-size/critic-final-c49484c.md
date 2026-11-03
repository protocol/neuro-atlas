PASS — Both original findings are closed at the exact reviewed revision; the native PNG now retains the temporal caveat, and the snapshot's provenance exception is explicitly disclosed.

## Material defects — original ledger dispositions

- F1 — CLOSED (original P1).
  - Located source: `src/components/draft-chart-plot.tsx:198–206`, especially line 205, adds the canonical `point.dateLabel` and opt-in `point.exportNote` to the actual `ChartShare.getChart()` notes. `src/data/draft-chart-evidence.json:1374–1385` supplies the MaleCNS measurement/release distinction and concise specimen/product note. This is not a wholesale copy of the long source notes.
  - Executed evidence: the focused `actual public-data PNG payload retains measurement date, existing specimen and encoded-product scope` test passed. It mounts the real component, clicks Download PNG and inspects the generated SVG payload. It requires `2026-11-03`, `initial release October 2025`, `same specimen`, all 11 JPEG resolution levels, `50,910,260,068,834`, exclusions, plain PB and six observation marks.
  - Native evidence: before interpreting pixels, read `/opt/data/tmp/atlas-size-audit-20261103/after/results.json`; its revision is exactly `c49484c2773866a12531d23007208a15207ff5fd`. Opened its sibling `public-data-export.png`. Beneath the six numbered dataset keys, the PNG visibly retains the ISO measurement date, October 2025 initial release, same specimen, all 11 JPEG levels, exact bytes, and excluded N5 imagery, segmentation, meshes, tables and databases. The MaleCNS key also says “measured Nov. 3, 2026.” These lines are legible without clipping or overlap in the inspected image. Plain `Resource size (PB)`, six keys and all three product groups remain visible.
  - Result: the original standalone-export omission is corrected; the export assertion at `docs/public-data-size-audit.md:30` is now supported.

- F2 — CLOSED (original P2, via the expressly permitted disclosure alternative).
  - Located disclosure: `docs/public-data-size-audit.md:34` now distinguishes name/size coverage for every object from generation/update coverage for the 27,594 image shards. It explicitly calls the sole 633-byte `info` row size-only. `docs/data/public-data-size/malecns-20261103.json:103–105` records the same exception without inventing historical fields.
  - Executed evidence: the focused `historical snapshot discloses the sole size-only metadata row without inventing its provenance` test passed. It decompresses the committed snapshot and requires the complete set of records missing either provenance field to equal exactly `{"name":"em/em-clahe-jpeg/info","size":"633"}`; it also checks the manifest disclosure and shard count.
  - Preservation check: the gzip snapshot has no diff against the originally reviewed `2320407333caadcfda1c4921e3936ffc73931dcb`. Its independently computed SHA-256 remains `a17dbc5454329e9b6b5092d8f335a7e7afe6f57931e109bc01048b538fccfb09`, matching manifest line 10.
  - Result: the completeness overstatement is removed. The metadata revision remains unpinned, but that limitation is now accurately disclosed rather than retroactively repaired.

## Newly introduced P0s

None identified in the revision delta. No new-theme hunt was performed.

## Assumptions and evidence gaps

Reviewed source: clean HEAD `c49484c2773866a12531d23007208a15207ff5fd` in `/opt/data/tmp/atlas-readable-copy/review-564aea6`. Read the full original report unchanged and inspected the eight-file delta from its reviewed revision, with attention limited to its two findings and new P0s.

The native receipt reports a 729,755-byte generated PNG. I inspected that PNG and the replay script (`native-qa.py:50–58`): it clicks the actual application Download PNG control and captures the real browser-generated blob before disk-download dispatch. I did not independently drive that browser replay, verify its served asset hashes, test clipboard acceptance or verify a hosted deployment. The JSDOM regression stubs canvas output; it proves payload content, not rasterization. The supplied native PNG supplies the complementary pixel evidence.

No external source/data audit was repeated. The original report's historical values, live inventory and primary-source checks are prior evidence, not newly executed findings here. This PASS is a bounded final disposition, not a fresh certification of every original acceptance gate or production readiness.

## Downside and failure map

- The standalone chart can still be misread as a like-for-like temporal ranking. Visible product groups, unconnected observations and scope text mitigate this; they do not make the products commensurate. The publication owner bears any resulting explanation burden.
- The saved `info` row cannot identify its historical metadata revision. Do not claim complete generation/update provenance for every object.
- Reopen acceptance if the decisive export caveat disappears from the generated output, or if a future change alters the snapshot without an explicit new observation. Do not overwrite the November 3 observation with later provenance.

## Better way

Keep the small, canonical point-specific export note and honest snapshot exception. No new pipeline, reconstruction of historical metadata or automated refresh is needed.

## Brevity and structure cuts

The optional preview cut was made: `draft-chart-evidence.json:1294` now opens with the substantive scope sentence, “Footprints depend on sample size, resolution, encoding and included products.” No further cut is required to close the original ledger.

## Prioritized fix queue

No remaining P0/P1/P2 fix is required for F1 or F2. Preserve the tested export caveat and explicit provenance exception.

Executed only focused tests:

1. `node --import tsx --test --test-name-pattern='actual public-data PNG payload|historical snapshot discloses' tests/chart-sharing.test.mjs tests/public-data-inventory.test.mjs` — 2 passed, 0 failed.
2. `node --import tsx --test --test-name-pattern='exported dataset keys include size' tests/public-data-size-audit.test.mjs` — 1 passed, 0 failed.

`git diff --check` passed; final HEAD remained exact and `git status --porcelain` was empty. No full suite, build, repository edit, delegation, send or production action was performed.

## Residual risk and dissent ledger

The strongest original objection—that a detached PNG discards the measurement-versus-release correction—does not survive this revision's payload and native-image evidence. The provenance objection survives only as the explicitly disclosed inability to pin the historical metadata row, not as a remaining documentation defect. Unlike footprints still cannot establish scientific regression or a compression multiplier; no such inference is approved by this bounded PASS.
