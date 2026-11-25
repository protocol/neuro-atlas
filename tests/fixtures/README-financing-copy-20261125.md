# Financing + reader-copy compatibility (2026-11-25)

The application/canonical checkpoint is **f6a963f27ab279e0faaef23342b825749d23f554** (M). These test-only artifacts follow that frozen checkpoint; their own commit is not a data checkpoint or a new source approval.

## Disjoint historical entrypoints

- `financing-copy-composite-20261125.json`: F (`b3b901831da6ed7e50cd0dee15d636e4cdbbe4fc`) → M, exactly eight financing files. Archived finance/merge/China/Paradromics assertions reverse this edge to F.
- `merge-financing-over-copy-20261125.json`: B (`df97d0d70736465657ac50bc9569bbc1b60e6095`) → M, exactly four shared data files and six runtime files. Copy history reverses this edge to B, then the **unchanged** original copy fixture to C (`9c1ddcca0bb49daf1c825d9b3b6e318fd870ac3b`).
- The financing dispatcher falls back to copy history **only** for `data/funding-index/foundings.csv` and `data/funding-index/milestones.csv`. Never apply both inverses to a financing file; a repeated/wrong-checkpoint inverse rejects.

Both deltas are produced by the unchanged reviewed-file builder from pinned Git objects. The bridge's compact `src/data/funding-index.json` uses the builder's existing exact line-array fallback: B lacks the new `reportedTotals` root key, and a leaf insertion cannot reproduce M's insertion order in the forward direction. This is a literal byte allowance, not a JSON root-value exemption or an idempotent normalizer. It rejects unknown mutations rather than erasing them. The financing composite still retains JSON leaf/LCS operations. Forward and inverse **complete bytes** are tested on both edges.

## Independent current contracts

`financing-copy-current-revision-20261125.json` locks the exact 53-path union, all endpoints, and ten artifact hashes. It pins finance parent A (`ba3a4dfa5769f7837a03bbf506cb6f11b1200def`) and data checkpoint D (`43ffb9cdd85cf329a93b0391efeaf586ea1775c6`); all eight A/D data files were byte-identical during capture.

`financing-copy-parent-nonprose-20261125.json` was captured independently from A, not from a generated allowance. The raw-current validator compares all ten complete parsed canonical/generated files with only these string-valued schema locations masked:

- The four canonical CSV row `note` fields.
- Generated Funding `rounds/*/note`, `milestones/*/note`, and `companies/*/founding/note`.
- Generated Milestones `*/note`.

Missing fields, non-string types, all other keys (including nested `note` keys), array identities/lengths/order, source/FX/investor evidence, methodology, and economic fields remain exact. The independent snapshot's full digest and the immutable manifest's full digest are pinned in code. Regenerating or coordinating an allowance with a lock never authorizes changed economics.

`financing-copy-current-assertions-20261125.json` preserves all original correction IDs and F before-records. Non-note after-fields equal immutable A; only exact approved M notes are rebound by stable identities. The original assertions, D revision, original finance delta, original copy delta, all 33 F fixtures, and scientific/SVG helpers/goldens remain untouched.

Native/current tests read raw data. Static parsed-import checks enforce explicit archived-consumer allowlists, no native transitive historical reads, and no compatibility cycles. Existing scientific prose/source projection behavior and every original SVG golden are unchanged. Inherited baseline test failures are not repaired by refreshing goldens or weakening assertions.
