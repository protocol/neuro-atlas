# Verification — Neuro Atlas source corrections

Runtime/source revision: `e55dd2e25b5484ae4c508a7316b563a9a061ecf9`. Baseline: `de2301974ac1e66b35aaaec91198dc5dda8c060c`.

## Results

| Gate | Result | Evidence / qualification |
|---|---|---|
| Complete test-file coverage | PASS | **1,333/1,333 tests**, zero failures/cancellations/skips across all **208** `tests/*.test.mjs` files. 207 files ran at concurrency 2 (1,327 tests); `performance-modal.test.mjs` ran separately at concurrency 1 (6 tests). Exact file-set union reconciled; see [test receipt](qa/tests-results.json). |
| Baseline comparison | PASS | Baseline full suite: 1,264 passed, 0 failed. The initial candidate run had 1,322 passed and 3 failed; that run is not relabeled green. Two stale source/marker expectations were corrected. The file-level performance test termination did not reproduce in three alternating serial runs per old candidate/baseline or in the final runtime's serial run; exact original termination cause is unconfirmed. |
| Source-fix closure selection | PASS | 91 focused tests, including bounded historical goldens, source/data, actual mounted labels, existing Precision coverage and glossary coverage. |
| Typecheck | PASS | `npm run typecheck`, exit 0. |
| Production build | PASS | `UV_THREADPOOL_SIZE=1 NEXT_TELEMETRY_DISABLED=1 taskset -c 0,1 npm run build`, exit 0, in a clean detached checkout with physical matching dependencies. Linked dependencies failed Next/Turbopack's worktree boundary check earlier; no application/auth setting was changed to make the build pass. |
| Scoped changed-file lint | BASELINE FAILURES ONLY | Two inherited `milestone-timeline.tsx` errors: `react-hooks/set-state-in-effect` for `setNow(Date.now())`, and `react-hooks/immutability` for local lane accumulation. Both reproduced on the actual baseline; neither was suppressed or introduced by these source corrections. This is not an all-green lint claim. |
| Independent code/source review | PASS AFTER CLOSURE | Initial code review FAIL and source review CANDIDATE were retained. Their located activity/date/entity/test findings were corrected; the independent bounded re-review passed, with 60 focused tests plus separate mounted/data probes, no remaining scoped blocker and no new P0. See [closure](review-closure.md) and [verdict](qa/review-verdict.json). |
| Headed-Chrome native replay | PASS | 33 primary scenarios plus 9 closure checks at 1440/390/320px; all 90 resting source marks checked at each width (270 hit/visibility checks). Actual source values, source links, date/commitment qualifiers, modal Escape and narrow bounds checked. See [native evidence](qa/README.md). |
| Served build parity | PASS | Both served HTML pages and 16 referenced static assets matched the exact production build byte-for-byte (18 checks). Screenshot/runtime/data hashes are retained. |
| Source scope / historical preservation | PASS | All 34 actionable group IDs match the inventory exactly; all nine bounded collections restore the actual baseline hashes. Original historical golden hashes and all 25 founding-year values remain unchanged. Date ledger has exactly 146 timeline/financing/regulatory entries. |

## What these results do not establish

- Local production-static screenshots are not hosted-preview or authentication screenshots, and viewport pointer emulation is not physical-phone touch testing.
- A passing regression, review, build or deployment is not proof that an inaccessible citation body is readable or source-verified. The original unreadable-source counts remain baseline audit counts, not a final availability census.
- Legacy Neuracle, StairMed and CorTec USD estimates retain explicit unverified-FX qualifications; CorTec's captured native amount is also unverified. Unverified date positions remain labeled rather than fabricated.
- This PR does not authorize merge, production publication, gate/password changes, automatic jobs or unrelated chart edits. The PR's deep-linked preview and remote-check state are verified separately at handoff.
