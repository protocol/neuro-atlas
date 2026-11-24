# Reviewed China funding compatibility — November 24, 2026

This is an explicit historical-test seam, not application filtering or a source-approval mechanism. Every old digest/expected total stays pinned. `china-funding-20261124.json` contains the exact nine-file candidate data delta from the pinned baseline; the dedicated compatibility tests verify both current and reconstructed byte hashes. The source review and new current-data regressions establish the separate acceptance evidence.

## Integration

1. Cherry-pick the test-worker commit. No financial/source data comes with it. `funding-roster-growth.test.mjs` is the parent's existing test, copied unchanged.
2. Finish the reviewed canonical/data changes and `node scripts/generate-derived.mjs` (including the generator's new `asOf`; this worker does not change the generator).
3. Materialize an independent baseline directory from commit `023598e99d14b799b536df680e07f9d30e83b649`, e.g. `git archive <sha> | tar -x -C <empty-baseline-directory>`. Git is not used by the new test-time seam or fixture builder.
4. Generate to a **new** output path (the CLI deliberately uses exclusive creation, never silently overwriting an approved fixture):

```sh
node scripts/qa/build-reviewed-delta.mjs \
  --base-dir <baseline-directory> \
  --candidate-dir "$PWD" \
  --baseline-sha 023598e99d14b799b536df680e07f9d30e83b649 \
  --output <new-review-output.json> \
  data/funding-index/companies.csv \
  data/funding-index/rounds.csv \
  data/funding-index/milestones.csv \
  data/funding-index/foundings.csv \
  data/funding-index/fx-conversions.json \
  data/market-memo-q1-2026/milestones.csv \
  src/data/funding-index.json \
  src/data/milestones.json \
  src/data/methodology-sources.json
```

5. Review every generated before/after slice against the approved source-backed data diff, then copy that reviewed output to `tests/fixtures/china-funding-20261124.json` and commit it with the data. Unchanged named files are omitted. Do not refresh old fixtures/digests.
6. Run:

```sh
node --import tsx --test tests/reviewed-delta.test.mjs tests/china-funding-compatibility.test.mjs tests/funding-*.test.mjs tests/historical-fx*.test.mjs tests/notables-6*.test.mjs tests/source-audit-scope.test.mjs tests/neuro-wide-milestones-baseline.test.mjs
npm run typecheck
npm test
```

Compare the full suite with the parent's unchanged-base failure list; the existing Notables 66 directory-classification hash failure and neuro-wide canonical-byte hash failure are deliberately retained.

## Fixture format / fail-closed behavior

The file manifest is `{version:1, baselineSha:<40-char literal SHA>, files:[...]}`. Each file names its exact repo-relative `path`, independent `beforeSha256`/`afterSha256`, `encoding`, and a reversible `delta`.

* `json`: sparse JSON paths and exact changed array-row slices; before/after formatting is retained when byte-exact round trips are possible. Unchanged historical rows are not exemptions.
* `lines`: exact raw UTF-8 lines for CSV or nonstandard JSON formatting, retaining quoting, CRLF and final-newline bytes.
* Generic delta: `{version:1, changes:[{path:[...], before:{exists:true,value:...}, after:{exists:false}}, ...]}`; array changes carry explicit before/after lengths and ordered `{beforeIndex,afterIndex,before:[...],after:[...]}` slices.

The helper checks exact reviewed values before reversing; missing/duplicate rows, extra fields in reviewed rows, duplicate/overlapping/malformed instructions, and unlisted fixture fields fail closed. It clones inputs. Unknown mutations in untouched fields survive to the original historical assertions, and the manifest regression additionally requires each entire current/reconstructed file to match its reviewed after/before byte hash. There are no geographic/name blanket exclusions.

`readHistoricalFileSync` / `readHistoricalFile` are opt-in historical readers, never used by the app. Current-data builder parity, real source generation/determinism and current UI tests remain unprojected. Notables 66 renders live links first, then uses a restored in-memory copy solely for its old capital-summary golden, with `finally` restoring module data.

## Historical FX extension

`event_date` uses `announcedOn` as the generic row event-date field and requires `investmentDate:null`; it does not invent an announcement or cash date. Default observations must still equal that basis date. `rateDateBasis:"previous_available_business_day"` is the only exception: the observed rate must be strictly earlier and at most four calendar days old. Unknown flags/fields, equal/future/older observations and contradictory dates still reject. Funding details and milestone tooltips explicitly label documented event-date FX and the previous available H.10 day.
