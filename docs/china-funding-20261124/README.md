# China BCI backfill — verification

## Revision and scope

- Runtime/data/code reviewed and exercised: `204cfb81ff2ba00c6338fedaf405368669b4e388`.
- Exact unchanged baseline: `023598e99d14b799b536df680e07f9d30e83b649`.
- Six new companies and eleven additional financing records, synchronized across Funding Index and Milestones. The existing screen is unchanged; this is not a China market census.
- [Admission, date, accounting, metadata and held-out notes](../../data/funding-index/source-review-20261124.md).
- Evidence-only commits after the runtime revision do not change application/data/test inputs. No merge, production release, background sweep or new monitoring is included.

## Checks actually completed

| Check | Result |
|---|---|
| Original unchanged-base `npm test` | Exit 1: 1,633 tests; 1,597 pass; 36 fail; zero canceled/skipped |
| Final pinned `npm test` | Exit 1: 1,651 tests; 1,615 pass; the same 36 fail; zero canceled/skipped |
| Failure diagnostic comparison | No new failure IDs **and no changed actual error/assertion diagnostics** after removing timing and stack frames. This is not a green full suite. |
| Focused current backfill, source-directory, exact-delta, roster, FX and mobile-note tests | 22/22 pass, exit 0 |
| Production `npm run build` | Pass, exit 0 |
| `npm run typecheck` | Pass, exit 0 |
| Changed-code ESLint | Pass, exit 0 |
| Independent direct-source/accounting review | PASS: all eleven accepted financing records and six new companies; actual direct issuer/investor/regulator/Federal Reserve bodies and exact prospectus pages; no material defect |
| Independent code/report review | Initial CN-CODE-001 identified a worsened source catalog despite an unchanged failing test name; corrected and independently closed on exact revision `204cfb8` |
| Exact historical fixture | Nine current files reconstruct actual pinned baseline bytes; old goldens were not refreshed; unrelated mutations still reach historical assertions |
| Source inventory | Candidate and exact base have the same one missing source (`https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/`) and no extra entries. Dedicated regression passes; original test continues to expose that existing gap. |
| Canonical/builder/generated/Milestones parity | Eleven financing records occur once each with identical native amounts, source/date semantics and source-bound historical FX; 31 companies / 53 financing records |
| Native local production browser replay | Four desktop/mobile/theme cases pass; details for all six new companies plus Neuracle and Gestala verified against actual generated amounts and source links; stage view contains 31 companies |

### Exact focused command

```sh
node --import tsx --test \
  tests/china-source-directory.test.mjs \
  tests/china-funding-*.test.mjs \
  tests/funding-roster-growth.test.mjs \
  tests/historical-fx*.test.mjs \
  tests/reviewed-delta.test.mjs
```

## Native evidence and limitations

The browser ran the actual production-built Next.js application bound only to loopback. Viewports were 1440×1000 and 390×844, each light/dark, using native Chrome pointer/keyboard input. This is **not** a hosted-preview walkthrough or a physical-phone touch test. `qa/browser-results.json` retains the exercised source revision, case assertions and screenshot hashes.

The first native run exposed a long literal WeChat URL overflowing its financing-note card. A mounted RED regression preceded the one-class wrapping fix; the final actual 390px replay measured note `scrollWidth == clientWidth == 278`, dialog `scrollWidth == clientWidth == 360`, and inspected readable source/FX/approximate-amount text. The failed capture and earlier accepted replay remain private historical evidence, not relabeled as final success.

The funding timeline is intentionally horizontally scrollable inside its own container; the final page and detail-panel bounds do not overflow. Screenshots show real data, not mock values. All task-owned tabs were closed, pre-existing tabs preserved, the loopback runtime stopped and its port verified closed.

### Representative captures

- [Desktop, dark](qa/funding-dark-1440.png)
- [Desktop, light](qa/funding-light-1440.png)
- [Neuracle agreement/date evidence in detail](qa/detail-neuracle-technology-light-1440.png)
- [Nanochap detail](qa/detail-nanochap-light-1440.png)
- [Mobile unknown metadata](qa/detail-xinsheng-shijie-light-390.png)
- [Mobile financing qualification and source-note wrapping](qa/detail-xinsheng-financing-light-390.png)
- [Mobile stage view, light](qa/stage-light-390.png)
- [Mobile stage view, dark](qa/stage-dark-390.png)

## Scope limits that remain

The financing dataset still has partial company histories and legacy unverified timing/FX estimates. Neuracle's old RMB60m investor-page record is not a verified March 2024 cash-flow date; no complete historical total is claimed. Conmind and Xinsheng disclosures are explicitly **nearly** amounts. Mindtrix's combined angel-series total and Ruiyi's individual investor subscription are held outside new round-size totals. Corporate fields not established by direct sources remain unknown. The 36 unrelated original test failures are neither hidden nor resolved by this PR.
