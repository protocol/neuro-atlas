# Complete publication-affiliation endpoints — November 6, 2026

## Verified result

The additive endpoint method `atlas-publication-affiliation-endpoints-v1` was genuinely recomputed from the existing complete private primary records. The full offline receipt replay passed, including all **180 topic/year slices, 403,266 candidate works, 117,060 required author histories and 5,516 original raw receipt metadata/body hashes**, followed by exact normalized-row comparison and production schema/feed staging. No live acquisition, credentials, publication, deployment or job/configuration changes were used.

A separate read-only tally from the checksum-verified original SQLite independently covered all **111,345 P2 works / 168,577 identified authors**. It reproduced all sixteen producer cells exactly. The annual 2025 sector population was not used to obtain the diagonals.

Destination order is Academic, Industry, Other institutions, No listed affiliation:

| First observed sector | Academic | Industry | Other institutions | No listed affiliation |
| --- | ---: | ---: | ---: | ---: |
| Academic | 18,781 | 94 | 740 | 1,091 |
| Industry | 43 | 196 | 8 | 49 |
| Other institutions | 688 | 16 | 1,609 | 156 |
| No listed affiliation | 1,624 | 23 | 243 | 1,132 |

**26,493 eligible authors = 21,718 same-sector endpoints + 4,775 changed-sector endpoints.** Entry means first selected-topic year ≥2016, with at least two distinct active years, observed through 2025. Same-sector means **same sector at first and latest paper**, not continuous staying or verified employment. Other institutions is inclusive; No listed affiliation means missing paper metadata, not no job.

## Exact preservation and evidence

The checked-in [anonymous receipt](endpoint-replay-20261106.json) retains the source proof, real input byte hashes, implementation hash, matrix and cohort totals. No raw author/work identifiers, names or source payloads are emitted.

- Integrated bundled snapshot SHA-256: `2a06d39911b08f50a695070f0fb53073cdc4c9cd08d86daa50cf77d764b2d30c`.
- Integrated derivation implementation SHA-256: `4680e5fb712dd63681ba8297d3003c078d716e9f75bd4e61bdb53814ba9b1ec9`.
- Owner-merged PR86 base (`6f475a2ab6342ce948431e25c58effc20c095672`) snapshot SHA-256: `d5991bca0441b496e7703dcd17b6b9f97d5152f316b9b723fc8924b4fac71c55`.
- Removing only `tables.nt_talent_endpoints` and `audit.affiliationEndpointCohort`, and restoring that base method hash, reproduces **every PR86-base snapshot byte**. Its 2010–2025 science history, dual-axis source values, dates, original null move diagonals, twelve off-diagonals, fractional audit and matched comparisons are preserved.
- The initial endpoint replay was completed against the prior PR85 base. Its snapshot/method/base hashes are retained in `originalReplay*` receipt fields; its original raw `sourceProof` describes that replay, not a second full combined-feed replay. Integration verifies the PR86 base has identical primary input byte hashes, primary acquisition time and move table before reusing the independently replayed sixteen endpoint cells. The merged derivation hash is computed from the actual combined producer file. No new acquisition or feed publication occurs in this integration.

The initial full primary replay first used a later separately acquired science receipt set. That was caught before integration. The original PR85 science receipts were verified and re-applied through the existing `read_science` and `science_context` producers, their real source proof regenerated, and the complete production staging gate rerun. The subsequent PR86 integration above deliberately preserves its owner-merged extended science capture unchanged; it does not relabel the original replay proof as covering that later capture.

## Contract and source compatibility

`nt_talent_endpoints` is an optional additive table with the same columns/sector identities as `nt_talent_moves`, but all sixteen cells are integer counts. It must be paired with the exact anonymous endpoint-cohort audit. Parsing validates off-diagonal equality, diagonal/changed/eligible totals, the whole-author upper bound, exact categories, complete unique origins, numeric types and privacy boundaries.

A legacy snapshot may omit both additions. Absence is preserved as unavailable, never zero-filled. Once a server/client has a complete valid bundled/accepted cohort, the shared compatibility guard rejects a legacy candidate even when its hash and newer/equal acquisition time are valid. It retains the **entire** last-good acquisition; no matrix is spliced into another source capture. A complete accepted acquisition can replace the whole snapshot normally. No selector or Sankey rendering implementation is included in this data lane.

The synthetic fixture's all-author count is explicitly corrected from 150 to 250 so its 206 changed endpoints and 44 same-sector endpoints can fit; no real data was adjusted to satisfy a fixture invariant.

## Executed checks

- Tests-first producer, strict-contract, source-regression and bundled-observation failures were observed before implementation/integration.
- Applicable Python publication/acquisition/refresh suite: **47 passed**. One existing SQLite `ResourceWarning` was emitted; no test failed.
- Final focused publication Node suites: **125 passed, 0 failed**. Includes actual Python producer → production parser, all sixteen synthetic cells, cohort exclusions, intermediate change-and-return, duplicate bylines, null/zero distinctions, private-field rejection, bundled receipt/hash/legacy-byte identity, and fresh/hash-valid legacy server/client downgrade refusal.
- Typecheck and targeted ESLint passed; `git diff --check` passed.
- The first unbounded full Node suite hit the terminal timeout (583 passed, 56 canceled, zero failed). A bounded full-suite retry was stopped on parent instruction to prioritize raw replay; task-owned orphan audit found no test processes remaining. Full-suite acceptance is **not claimed** for this lane.
- Native route, rendered Sankey and real export acceptance remain parent-owned. Nothing was pushed or deployed.

## Repeatable offline source stage

Use the existing completed private acquisition and its **original** independent science/matched receipt sets, not a later capture:

```sh
python3 scripts/publications/refresh.py stage \
  --source /private/original-primary \
  --science /private/original-science \
  --matched /private/original-matched-receipts \
  --minimum-known-share 0.5 \
  --out .qa/endpoint-replay-fresh

python3 -m unittest discover -s tests -p 'test_*publications*.py' -v
node --import tsx --test --test-concurrency=1 \
  tests/publication-*.test.mjs tests/publications-*.test.mjs
npm run typecheck
```

Output contains only anonymous staged source files; raw replay intermediates stay private/ignored. The real private invocation paths and final stage are in the parent handoff, not the public source proof. A runtime/method upgrade still requires the normal reviewed installation; this receipt is not a feed publication.
