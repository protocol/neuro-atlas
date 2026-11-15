PASS — The pinned revision distinguishes reported results from conversions and image estimates, preserves the working chart, and has no unresolved P0/P1 defect.

## Review boundary

- Reviewed `679a029a3c64c7d8eba0c579b9ae79bc0079c3fd` in `/opt/data/tmp/atlas-bitrate-review-20261115`, against `6154bbd7cb5ad6466a5d0133dc46ec0a0d7b9ae9`.
- One independent full review. No other critic, artifact edits, outreach, publication, or merge.
- Native replay used the existing disposable loopback fixture at the same commit. All 18 changed files matched the reviewed clone byte-for-byte. Its sole tracked modification is the explicitly local, opt-in, Host-restricted QA proxy; that is not part of the candidate or an approved production access change.

## Material defects

No P0 or P1 findings.

**F1 — P2, verified editorial leakage.** `src/data/bci-bitrate.ts:73–74` appends archived `native.note` directly to current reader-facing notes. This exposes old reviewer instructions, including “Do not mix … into a common 6-bits/word series” and “32.8 was not established … in this worker” (`bci-bitrate.source.json:355,522`). The current series uses five assumed bits/word, not six. Pandarinath's archived “rather than silently replaced” explanation also reads awkwardly beside the newly selected 4.16 value (`:275`). This does not change the data or negate the explicit current selection, but it makes provenance harder to read. **Minimal fix:** retain the archive exactly; compose a separate current display note containing the factual condition/date caveats without procedural instructions or superseded implementation wording.

## Assumptions and evidence gaps

**Explicit, reasonable but unvalidated assumptions:**

- Five speech estimates use WPM × 5 / 60 with no WER adjustment. The linked independent ITR Atlas methodology explicitly supplies a five-bits/word convention, but does not validate these particular tasks or this gross-rate implementation. The candidate correctly identifies the one-bit/character and five-character/word premises as assumptions and distinguishes information bits from encoded bytes. No reason to veto a transparent conversion the owner requested.
- Handwriting uses a different model. The original authors' Stanford technical report, Table 1 and Sections 2–3, actually gives 16.06 correct WPM / 2.6 ≈ 6.18 bits/s with modeled correction overhead. “Author estimate” is accurate; claiming Nature measured that ITR would not be.
- The fit describes the selected values and reference-year placements, not a validated common neural channel, independent cohorts, or a causal scaling law. This limitation is explicit in `bci-bitrate.ts:100,112,124`.

**Unresolved factual questions, accurately disclosed:**

- Kennedy's numerical result and the four anonymous assignments remain unverified. The candidate papers are real leads, not recovered identities. In particular, Gilja's Fitts rates, Jarosiewicz's retrospectively tabulated result, and scanning-interface candidates are distinguished rather than conflated.
- The original author's numeric table, conversion/statistic choices and band meaning remain unavailable. Confirmation requires the original dataset/code or a source explicitly identifying each mark—not a closer numerical match.

Primary evidence checked included Pandarinath's original paper/results and retrospective table; Oxley's isolated-versus-hybrid calculation; the Shenoy/Willett author report; Neuralink's company update; speech paper/preprint text; and candidate studies/supplement. Some publisher requests were blocked; primary repository copies or the saved primary-text extracts were used instead. The home-use 56.1-WPM input was checked in the saved v1 preprint text, not silently replaced by the later final paper.

## Downside and failure map

- **Likely misunderstanding; moderate impact:** a detached image can still be read as a performance ranking. The visible evidence labels, assumed-bits/word text, qualified axis and mixed-evidence fit label substantially reduce this risk; they cannot make heterogeneous tasks comparable. Atlas and downstream readers bear the interpretation risk.
- **Possible; moderate impact:** provisional candidate names become accepted attributions after copying. Keep “assignment unconfirmed,” and retain candidates outside confirmed `sourceUrl`.
- **Kill criteria:** do not reuse this as measured neural bandwidth, a cross-task league table, a growth forecast, or evidence that an anonymous mark has been identified. Those uses require matched task/channel evidence or original-figure attribution. They are not what this revision claims.

## Better way

Keep the working implementation and the owner-requested descriptive fit. No new estimator, symmetric-symbol handwriting model, redesign, or additional process is needed. Clean the current display notes without rewriting the original archive.

## Brevity and structure cuts

F1 is the useful cut. Also, the rendered numbered key already lists qualified values; the generic paragraph below repeats them (`draft-chart-plot.tsx:350–356`). A short explanation of “≈” could replace that repetition if desired, without removing the keys, task qualifiers or source table. This is optional polish, not a release condition.

## Prioritized fix queue

1. **P2 — F1:** separate archival research notes from current reader-facing prose; preserve all original observations and quotes unchanged.

No delivery-blocking fix is required by this review.

## Residual risk and dissent ledger

**Verified gates:**

- **PASS — values and arithmetic:** all 14 active CSV values, evidence labels, primary URLs, calculation URLs and candidate arrays reconcile with the runtime model. Five speech values replay as 1.2666667, 5.1666667, 6.525, 2.6333333 and 4.675 bits/s; handwriting replays as 16.06/2.6. Paper selections are 4.16 and 0.46; company selection is 8.0.
- **PASS — fit:** independent arithmetic reproduces intercept −0.9294723618914491, slope 0.06027654128356745, R² 0.45533018672824777, n=14, domain 2000–2025. Native SVG geometry maps every mark to its active x/y value. No extrapolation or band is rendered.
- **PASS — preservation:** original observation/native-source arrays, calibration and archived trendline remain equal to the prior revision. The delta contains no auth/configuration, legacy-URL or historical-acceptance changes.
- **PASS — requested artifact and native UX:** actual chart, all 14 marks/rows, per-point basis labels, candidate links and separate calculation links were exercised. Native replay passed at 1440, 390 and 320 pixels, including inspection/Escape, focus return, history and copy-link readback. Actual Download PNG and clipboard PNG were generated; the downloaded raster was visually inspected. It retains all 14 identity/value/unit/evidence keys, calculation qualifiers, fitted line and brand/link without clipping. This is local-fixture evidence, not hosted authentication or physical-phone testing.
- **PASS — focused regression checks:** 18/18 bitrate/provenance/integration checks; 95/95 shared draft-chart/fit checks; `next typegen` followed by `tsc --noEmit --incremental false`. The initial standalone tsc invocation lacked generated `LayoutProps`; generating route types resolved it without a tracked edit. These results do not assert that every repository test is green: the supplied broader serial log contains an analytics-navigation failure and was incomplete when read. No relation to this chart delta was established.

Independent replay evidence: `/opt/data/tmp/atlas-bitrate-20261115/critic-native/`; runtime model: `critic-runtime-model.json`; shared-test output: `critic-shared-tests.log` in the same task directory. Native PNG SHA-256: `ec0191d54f2e78a69373be87c4893162510d0a2e4cae2cd23b02886d98ab3fd6`.

**Strongest surviving objection:** the common bits/s axis combines incompatible operational definitions. It survives as a methodological limitation, not a blocking defect, because the owner requested an illustrative conversion and fit, and the exact revision labels its estimates and disclaims a common benchmark. **Second objection:** the four identities remain unknown. That survives too, but the new linked, qualified candidates answer the request for useful source leads without pretending identification is complete.

This PASS applies only to the reviewed revision and requested chart scope. It grants no merge or publication authority.
