# Independent matched-growth baselines

`scripts/publications/matched_baselines.py` is an offline adapter, not a UI or an Artio data dependency. It consumes **actual OpenAlex counts**, then computes growth locally. No credentials, environment access, transport implementation, author records, browser access, or live requests are included.

## Verified starting state

The integrated November 6 primary snapshot has 21 inventory rows: **nine matched**, **12 references not yet established**. Six geography/institution pairs use independently acquired P2/all-field involvement counts; three venue pairs now use complete owned NT10 indexed-work numerators and identically classified all-field denominators. All 12 remaining numerator series are populated. Their missing references are unfinished acquisition/comparison work—not demonstrated impossibilities, zeros, or a reused global science band. This is a **partial category-matched upgrade**; `completeMatchedInventory` remains false.

| Group | N 2022 → 2025 | D 2022 → 2025 |
|---|---:|---:|
| Asia | 3,305 → 5,581 | 2,632,284 → 3,743,357 |
| Europe | 1,797 → 2,094 | 1,646,031 → 1,758,415 |
| US and Canada | 1,101 → 1,487 | 925,664 → 1,028,663 |
| Education institutions (legacy label Universities) | 5,622 → 8,335 | 4,788,725 → 6,151,131 |
| Companies | 163 → 224 | 185,364 → 213,800 |
| Government OR facility | 1,251 → 1,523 | 1,091,879 → 1,140,323 |

These are revised **whole-work involvement**, not legacy author-fractional values. Each indexed work is counted once per involved group. Groups overlap and must not be summed. Government/facility uses an actual OR-union query; the adapter additionally checks its count lies between the maximum and sum of constituent buckets.

## API and CLI

```sh
# Reviewable fixed request plan: 11 queries, no request execution.
python3 scripts/publications/matched_baselines.py --plan --output /opt/data/tmp/baseline-plan.json

# Actual fresh envelopes, using the plan's filenames.
python3 scripts/publications/matched_baselines.py --input /path/to/receipts --output /opt/data/tmp/baselines.json

# Portable public test subset (not the production refresh source).
python3 scripts/publications/matched_baselines.py --input docs/publications/matched-baselines-fixtures.json

python3 -m unittest discover -s scripts/publications -p 'test_matched_baselines.py'
```

Python seams:

- `acquisition_plan()` returns stable IDs, `/works`, exact parameters, receipt filenames, and measurement contract.
- `acquire(request)` accepts the parent's `(path, params) -> (body, selected_quota_headers)` function. **The caller must raise on any non-200 response**, preserve parsed response bytes/body, and own HTTP, budget, retries, and credentials. The adapter retains only Date/rate-limit response headers. No helper is copied from the acquisition lane.
- `load_receipts(path)` accepts a directory or combined JSON `{"receipts": {"asia-n": envelope, ...}}`. Original receipt filename stems are also accepted as mapping keys.
- `derive(receipts, venue_numerator=None, numerators=None)` is pure: it validates the complete fixed receipt set and returns derived rows, method contract, evidence, and four-category venue denominator detail.
- Combined CLI input may also contain `venueNumerator` and `numerators`, passed to those pure-function arguments.

Receipt envelopes contain `retrieved_at` (timezone-aware ISO time), `url`, `request_parameters`, `http_status`, `response_headers`, and `response`. An optional `measurement` must equal exported `COUNTING`. Request/URL parameters must match the fixed plan exactly. The default **core** corpus is explicitly documented, with no expansion parameter; this preserves the verified receipt queries. Any corpus/filter change requires a reviewed method/query revision on both sides.

## Counting and numerical contract

Endpoint years are 2022/2025. Types are `article|review|conference-paper|book-chapter|preprint`. P2 is primary topics `T10429|T11601`. Affiliation filters are current OpenAlex continent/type involvement, not frozen country maps or fractional author affiliation choices. US+Canada is not geographic North America. Government/facility is not a registry of all national institutes.

Every matched pair uses the same five types, default core corpus, raw indexed-work identity, and **no extra normalized-title collapse**. No bioRxiv-only works are added to one side. Group counts are nonnegative integers, with duplicate/missing/unexpected years rejected. Top-level counts reconcile to `meta.count`. Selected institution buckets must exist; overlapping institution totals are deliberately not summed. Venue year/type/source leaves must reconcile at each mutually exclusive hierarchy level. A full 100-bucket page is rejected as potentially truncated.

The venue function is versioned here: **preprint work OR repository source → Preprint; otherwise conference work/source → Conference; otherwise book chapter work/book-series/ebook-platform source → Book chapter; everything else → Journal**. Missing/unknown sources deliberately fall back to Journal. This differs from a generic source-type grouping and from any derivation that emits Unknown instead. Keep Book chapter in reconciliation detail even though the three legacy venue dots omit it.

Counts are preserved unrounded. `Fraction` is used internally; JSON metrics are unrounded floating-point representations. `neuroGrowthPct` and `referenceGrowthPct` are percent changes. `shares` are **ratios 0–1**, not percentage values. `relativeShareGrowthPct = 100 * ((N25/D25)/(N22/D22) - 1)`. `growthGapPercentagePoints` is a separate subtraction, never a replacement for relative share growth. Zero starting N/D produces null undefined metrics rather than infinities. Missing N/D stays null. A supplied matched N must be a subset of D.

## Supplying the independently acquired venue numerator

Supply only endpoint-year normalized **raw indexed works**, before any title-based preprint collapse:

```json
{
  "measurement": "replace with the exported COUNTING object",
  "selection": "NT10-v1",
  "completeYears": ["2022", "2025"],
  "works": [{
    "id": "https://openalex.org/W123",
    "publication_year": 2022,
    "type": "article",
    "primary_source_type": null,
    "primary_topic_id": "T10429",
    "title": "Example title",
    "abstract": null
  }]
}
```

`completeYears` is the acquisition producer's completeness attestation, not something inferred from one work's existence. Duplicate/malformed IDs, nonendpoint years, disallowed types, changed identity/count contract, and works failing the source NT10 gate are rejected. The adapter independently checks three full topics plus the seven gated topics with the exact strong-modality AND neural-context gate. A partial corpus must never carry this attestation. Only venue rows are promoted when this input is supplied.

## Later primary-derived method/author N

`numerators` is a mapping from one of `invasive, high, eeg, no-technique, bci, not-bci, early, mid, late, top-1, top-1-10, top-10-50` to:

```json
{
  "counts": {"2022": 1.25, "2025": 2.75},
  "countUnit": "author-fractional works",
  "countingMethod": "owned-primary-derive-version",
  "numeratorUniverse": "P2 output in the historical author-cohort bin",
  "evidence": ["owned-primary-run-id"]
}
```

Method N requires `countUnit: "OpenAlex work ID"` and integer values. Author N accepts unrounded nonnegative fractional values, including exact rational strings such as `"5/4"`. Supplying N never manufactures D or upgrades the unavailable baseline status. Reference growth and relative shares remain null. It cannot replace the six matched pairs or bypass venue validation.

### Disposition of the remaining 12 references — November 6

**Six method/BCI references:** the defensible target is all-field core five-type works, classified locally by the **same** title/abstract regex, priority rules and BCI flag as the numerator. “Methods” is not a single equivalent OpenAlex field. The ungated ten-topic parent corpus was considered and rejected as the default comparator: its topic/keyword-gate inclusion overlaps the numerator by construction, so it answers narrow-versus-broad selection growth rather than the requested all-research technique comparison. An API search count is not substituted because its search semantics are not proven identical to the local classifier, especially for the complement groups.

The actual complete endpoint-year venue receipts reconcile to **7,424,576 works in 2022** and **9,578,890 in 2025**—**17,003,466** total. A complete local-classifier scan at 200 records/page needs at least **85,018 list pages**, before retries or other calls. This exceeds a single free daily acquisition budget and is not part of the installed weekly source run. It is technically feasible via a separately scoped bulk/snapshot or multi-day acquisition; that larger acquisition, source cost and refresh design remain to be approved and implemented. No new large job or paid access was started. The six references are **not yet established**, not declared infeasible.

**Six career/citation references:** choose all-field five-type **author-fractional output of the same historically P2-active author cohort**, using the same year-specific career/citation bins, full-byline denominator and quarterly coverage policy. This is a within-cohort comparison, not all early-career researchers worldwide. Successful author histories establish bins but do not contain type-filtered, full-byline fractional denominators. Work citation percentiles cannot replace author rank.

A private count-only audit of the acquired profiles found up to **94,137** IDs with works in either endpoint year and **1,212,917 all-type author/work occurrences**. These occurrences overlap and are not unique works or an exact five-type volume. Querying individually would require approximately **94,289** pages at 200 rows/page; grouping at up to 50 IDs starts with **1,883** batches and can sharply reduce duplication. A conservative occurrence-based grouped-page planning ceiling is **7,948** before byline repairs/retries, with historical active-cohort/type filters and overlap able to reduce it. A count-only sizing pass must establish the actual cost first; no claim is made that the exact filtered corpus has been acquired. This extra lane would compete with the existing primary/citation acquisitions under the shared free quota, so it is a separate bounded acquisition/PR rather than a silent expansion of the weekly job.

All 12 references retain null reference growth/share metrics and visible “Reference unavailable” states. The handoff must say **nine matched comparisons; 12 not yet established**. It must not claim a completed all-category baseline or invent reference marks to hide the gaps.

## Test provenance and RED/GREEN record

The checked-in fixture is a minimal **public anonymous primary-response subset**, not a private report or Artio export. It retains exact request parameters, timestamps, numeric groups, selected quota headers, and SHA-256 of each original acquisition envelope. API notices/query explanations and unrelated probes are omitted. The live local traceability test compares these hashes, request parameters, and complete group cells to original receipts when that acquisition directory exists; the portable tests work without it.

Observed RED/GREEN slices: missing adapter → real six-pair inventory; missing acquisition/venue seams → injected request replay and validated NT10 counts; impossible union accepted → rejected; missing optional N support → retained N with unavailable D; combined CLI dropped N → preserved; rational-string zero caused division by zero → null. Additional negative fixtures cover partial/duplicate cells, type/source hierarchy gaps, wrong units/filter/years, HTTP failure, negative counts, subset failure, and truncation metadata. No production source calls were made during implementation.
