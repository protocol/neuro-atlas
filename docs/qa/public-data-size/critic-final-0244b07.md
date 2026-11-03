PASS — Both original findings remain closed at exact revision 0244b074d08e7506741a891ab647581d53375af8; the sole source-link change points to the corrected immutable audit without changing the measurements or export.

## Material defects — original ledger dispositions

- F1 — CLOSED (original P1).
  - Located implementation: `src/components/draft-chart-plot.tsx:198–206` still includes the canonical dateLabel and exportNote in the actual export notes; `src/data/draft-chart-evidence.json:1376,1383–1385` retains the measurement date, release distinction, same-specimen note, exact bytes, JPEG scope and exclusions.
  - Executed evidence: the focused actual-PNG-payload regression passed. It mounts the real component, clicks Download PNG, and checks the generated SVG for those facts, plain PB and six observations (`tests/chart-sharing.test.mjs:385–395`).
  - Native evidence: read `after-0244b07/results.json:2` and verified its exact reviewed revision before opening its sibling `public-data-export.png`. The PNG visibly retains 2026-11-03, initial release October 2025, same specimen, all 11 JPEG resolution levels, 50,910,260,068,834 bytes and the exclusions. Those lines are legible and unclipped. Plain Resource size (PB), six numbered keys and all three product groups remain visible. The 2400×2854, 729,755-byte PNG is byte-identical to the prior final's supplied native PNG.
  - Result: the standalone export does not lose the temporal correction.

- F2 — CLOSED (original P2, through the original disclosure alternative).
  - Located disclosure: read the linked document directly from Git at `c49484c2773866a12531d23007208a15207ff5fd:docs/public-data-size-audit.md`. Line 34 explicitly limits generation/update coverage to 27,594 image-shard records and identifies the sole 633-byte info record as size-only, with no retrospectively inferred fields. Its content is identical to the current audit. The associated manifest at that commit is also unchanged; lines 103–105 record the exception.
  - Link correction: `src/data/draft-chart-evidence.json:1377` now points exactly to `https://github.com/protocol/neuro-atlas/blob/c49484c2773866a12531d23007208a15207ff5fd/docs/public-data-size-audit.md#malecns-measured-public-jpeg-image-pyramid`. The target heading exists at audit line 19; lines 26–27 support the same total and inventory scope. The new sourceURL regression passed (`tests/public-data-size-audit.test.mjs:79–81`). Inspected the saved RED receipt, `source-link-red.log:13–27`, which records failure on the old 2320407 URL; that historical run was not independently rerun.
  - Preservation and executed evidence: the snapshot-exception regression passed (`tests/public-data-inventory.test.mjs:26–31`). Independently decompressed and integer-summed the snapshot: 27,595 objects, 50,910,260,068,834 bytes; native-level bytes 44,428,865,656,516. Only JSONL record 27,595 lacks provenance fields: `{"name":"em/em-clahe-jpeg/info","size":"633"}`. Snapshot bytes equal both original 2320407 and prior c49484c versions. SHA-256 remains `a17dbc5454329e9b6b5092d8f335a7e7afe6f57931e109bc01048b538fccfb09`, matching the manifest.
  - Result: the directly linked audit now carries the honest exception without changing the historical observation.

## Newly introduced P0s

None identified. The complete delta from the prior final contains only the MaleCNS sourceURL substitution and its regression test. Parsed chart data are identical after that one substitution; renderer, displayed notes, keys, other measurements and archives have no delta. No new-theme hunt was performed.

## Assumptions and evidence gaps

Read both full reports unchanged. Reviewed clean disposable clone `/opt/data/tmp/atlas-readable-copy/review-564aea6` at the exact requested SHA. This is bounded final 2, not an inherited PASS or a fresh whole-product certification.

The native replay and PNG were supplied evidence. Inspected their receipt, PNG and `native-qa.py:50–58`, which captures the application's generated PNG blob before disk-download dispatch. Did not independently drive the browser, verify served asset hashes, exercise a hosted GitHub link, or verify deployment readiness. The JSDOM test proves export payload content, not native rasterization; the inspected PNG supplies complementary pixel evidence. No external research or live inventory refresh was repeated.

## Downside and failure map

- Retained caveat: unlike product footprints remain noncommensurate. Groups and scope text mitigate, but cannot eliminate, ranking misinterpretation; the publication owner bears that explanation burden.
- Retained low-severity caveat: the historical metadata row's generation/update remain unknown. Do not claim complete per-object revision provenance or backfill later readings as original observation evidence.
- Stop acceptance if a later revision drops the export's temporal caveat or silently rewrites the saved November 3 inventory. A future measurement is a separate observation, not a replacement for this one.

## Better way

Keep the existing scoped export note, disclosed provenance exception and corrected immutable link. No new process or metadata reconstruction is needed.

## Brevity and structure cuts

No further cut is required for the original ledger. The prior preview improvement remains unchanged; no new editorial theme was opened.

## Prioritized fix queue

No required fix remains for F1 or F2. Preserve their tested invariants. This completes the second bounded final; no third hunt is proposed.

Executed only the requested focused tests:

`node --import tsx --test --test-name-pattern='actual public-data PNG payload|historical snapshot discloses|MaleCNS source opens' tests/chart-sharing.test.mjs tests/public-data-inventory.test.mjs tests/public-data-size-audit.test.mjs`

Actual result: 3 tests passed, 0 failed. `git diff --check` passed. Final HEAD remained `0244b074d08e7506741a891ab647581d53375af8`; `git status --porcelain` remained empty. No full suite, build, repository changes, child critic, external research, sends or production actions were performed. Only this requested report was written outside the repository.

## Residual risk and dissent ledger

The strongest original objection—that a detached PNG loses the measurement-versus-release distinction—does not survive the actual export test and native-image inspection. The provenance objection survives only as a disclosed limitation, not an outstanding documentation defect. The objection that unlike footprints cannot establish scientific regression or a compression multiplier still survives; this bounded PASS authorizes no such inference and is not merge or publication approval.
