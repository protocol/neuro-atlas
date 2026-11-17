## PASS — bounded artifact, code, and source review

**Reviewed SHA:** `b555ec15a68f25461fad2427397478b6006fd65f`  
**Runtime evidence SHA:** `6e4a7ff73a620ac873860938d22fa895db975600`; verified subsequent changes affect only documentation and the QA heading selector, not runtime code/data.

**No reproducible blocking findings.** This is **not full-suite release clearance**: the parent’s test log still lacked a terminal summary at my final check. Parent must join `proc_874baab9c732` before push.

I treated the owner’s actual objection—“I don’t want Protocol Labs featured prominently here”—separately from the builder’s proposed grouping/count correction.

### Hard gates

Paths below are relative to the isolated review repository unless specified.

| Gate | Verdict | Located evidence |
|---|---|---|
| No PL-specific showcase | **PASS** | `src/components/funding-index-dashboard.tsx:380–417` contains only the shared ranking and generic guide. Showcase/component/upward links removed. Independently inspected owner screenshot, baseline screenshot, and final captures with vision. |
| All ordinary rows neutral and normally sorted | **PASS** | Shared markup at component `:388–405`; unchanged sort at `scripts/lib/funding-index.mjs:243–250`. Mounted neutrality test checks every row’s styling, rank, dots, counts, and capital. All four native cases reconcile all 24 displayed rows to canonical output. Family is ordinarily ranked **#2**, not artificially promoted. |
| Four publicly supported family records; exact identities retained | **PASS** | `tests/funding-investor-groups.test.mjs:71–94`; canonical records are Synchron, Neurosoft, Merge, and Science. Independently read captured issuer/reporting bodies in source JSON entries `[17]`, `[4]/[9]`, `[22]`, `[2]`. Exact round labels remain `Protocol Labs`, `PL Capital`, and `PLC Neurotech`; grouping affects ranking only. No Echo/Precision/Paradromics inference. |
| Merge primary participation anchor and precision qualification | **PASS** | `investor-evidence.json:2–11`, `rounds.csv:28`, component `:486–492`. Official post explicitly says “we were proud to join”; WIRED separately reports $252M. Visible note preserves $250M+, TechCrunch’s $250M, reporting status, undisclosed check size/vehicle, and original unverified date basis. Both actual UI anchors verified in native receipts and screenshots. |
| Cohort, records, capital, unrelated data unchanged | **PASS** | Independent canonical recomputation: **25 companies / 42 records / $3,553.96M**. Family: **4 records / 4 companies / $859.5M**, displayed as $860M by the shared formatter. Baseline comparison confirms all other generated collections/summary/methodology unchanged; only the enumerated Merge correction and derived investor ranking differ. |
| Prior P2 display-name collision fixed | **PASS** | Builder `:196–200`; regression `tests/funding-investor-groups.test.mjs:56–69`. Independently replayed the real `Khosla Ventures` collision: now rejected. Tests also cover below-threshold and undisclosed-amount participants. |
| Participant-evidence validation and UI link correct | **PASS** | Builder `:203–221` requires exact existing event, listed participant, HTTPS provenance, valid review date, source kind/excerpt, and nonduplicate citation. Evidence cannot create participation. Data regressions and mounted generic link test pass; UI uses the evidence URL directly with `_blank`/`noreferrer`. |
| Generated output matches canonical inputs | **PASS** | Independent in-memory comparison of rounds, investors, milestones, portfolio metadata, and company fields against the builder; unchanged generated fields compared against merged baseline. Generator binding: `scripts/generate-derived.mjs:100–130`. |
| Historical goldens not weakened | **PASS** | No fixture/golden or historical test-file changes. `tests/helpers/merge-attribution-baseline.mjs:18–48` asserts the **entire exact corrected row** before restoring only enumerated fields in a clone. Historical/source-audit run: **19 passed, 0 failed**. |
| Mobile, history, readability; honest evidence scope | **PASS** | Inspected all **12 final captures** at 1440/768/390/320. Names, counts, amounts, qualifications, and links remain readable. Native receipt confirms direct/reload/Back/Forward and repeated query/hash preservation; no document overflow. Independently matched production HTML and **13 static assets** to parity hashes. This proves local production-built replay—not hosted authentication or physical-touch behavior. |

### Verification and remaining limits

- Independent focused data/UI/grouping tests: **23 passed, 0 failed**.
- Changed-file lint and `git diff --check`: **passed**. Parent build/typecheck receipts inspected.
- Whole-repository lint remains the documented three pre-existing errors; no new blocker found.
- **Nonblocking suggestions:** none required.
- Evidence limits remain explicit: four is a supported minimum, not complete investing history; Synchron’s blocked original was corroborated through issuer syndication.
- **Files changed:** none. Temporary dependency symlink removed; review worktree clean. No outward actions.

Parent terminal addendum: full-suite process `proc_874baab9c732` exited 0 after the review; 1,440 tests passed, 0 failed, 0 skipped. The review’s outstanding parent test-join gate is now closed by `tests-summary.json`.
