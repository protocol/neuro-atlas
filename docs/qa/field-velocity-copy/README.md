# Field velocity copy review

## Scope

All 24 chart dialogs, four inflection points, related measurements, source disclosures, shared controls and export captions were reviewed. Scientific source records, quantities, dates, quotations, URLs and chart interactions are retained. Reader summaries are separate from archived inputs.

The prose pass removes repeated setup, first-person narration, negative definitions, unplotted variants and internal acquisition instructions. It retains measurement scope, overlapping-cohort qualifications, bounds, source precision and indexing coverage. Panel methodology names the actual plotted axes, including split/merge error rates and proofreading person-years.

## Rendered evidence

These are **local production-build captures**, not hosted-production screenshots. A separate, uncommitted loopback-only QA proxy was used. It returns 403 for a non-loopback Host and retains noindex. Production authentication is unchanged in this PR.

- Before: `c247dc0c90fff9604e6095c32f210dbd79d471e5`.
- After runtime: `374ebaa5a028420c6d537c9d4fc13556e25b66f2`.
- Follow-up `bc39d9ad0da9f064441495bea6001f6be2087901` changes only a historical-date test; its runtime is identical.
- The branch is based on `6f475a2ab6342ce948431e25c58effc20c095672`, preserving the concurrently merged publication-axis/history update (#86). That upstream update accounts for the annual-publication geometry difference from the older before capture.

At 1440px, all 24 dialog source-link lists and source quotations match the before capture. Geometry matches for the 23 charts unaffected by #86. Data-field hashes independently preserve curated scientific values, dates, bounds, units and identities. Archived JSON and publication/citation/Trends data bytes are unchanged by the editorial diff.

Dialog paragraph/definition-list text falls from 10,217 to 7,421 whitespace-delimited words, **27.4% shorter**. This comparison includes the inherited publication-axis prose update. Tables, headings and verbatim quotations are outside that prose count.

`browser-summary.json` records the complete dialog inventory and viewport probes. The actual route was exercised at 1440, 390 and 320px; the latter are desktop Chrome viewport emulation, not physical-phone testing. The document has no additional horizontal overflow. Citation, recording and publication dialogs retain in-viewport bounds and close controls.

## Checks

Focused copy, data-invariance, source-quote/link, publication-axis, source-table/download, navigation and export tests accompany the change. The publication comparison exports retain their numerator/denominator counts. Date-label tests separately pin archived wording and exact displayed dates while allowing concise display prose.

An earlier full run on the pre-rebase editorial revision passed 930/931 tests. The 40ms Back/Forward test in `recording-evidence-ui.test.mjs` failed once under load; the identical failure reproduced on untouched baseline, and the editorial branch passed its focused rerun. No history-navigation implementation or assertion was weakened. Final pinned-suite results are reported in the PR.
