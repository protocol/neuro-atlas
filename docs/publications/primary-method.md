# Primary publication and researcher derivation — v1

**Method ID:** `atlas-primary-publications-v1`
**Status:** independent primary acquisition and full offline receipt replay completed November 6, 2026. The bundled schema-v2 production snapshot contains 140,627 selected wider-corpus works and a separately scoped two-topic researcher corpus of 111,345 works / 168,577 identified authors. Initial publication remains gated on human review/merge; see the final verification receipt for release QA.

The implementation in `scripts/publications/derive.py` reads normalized primary OpenAlex work records and author annual histories. It does not read an Artio table, website, OSO dataset, existing snapshot, or compiled report at runtime. Existing imported tables are comparison fixtures only. Output contains anonymous aggregates and source/method receipts; no work/author/institution identifiers, titles, abstracts, names, or profiles are emitted.

## Run

Python 3.11+ standard library only; no network or credentials.

```sh
python3 -m unittest discover -s tests -p 'test_primary_publications.py' -v
python3 scripts/publications/derive.py \
  --works /private/run/works.jsonl \
  --author-histories /private/run/author_histories.jsonl \
  --manifest /private/run/manifest.json \
  --out /private/run/anonymous-aggregates.json
```

Optional, separately acquired primary input: `--science-baseline science.json`. The obsolete direct `--matched-baseline` inlet deliberately rejects input; use the reviewed `refresh.py stage --matched` adapter for the 21-row matched-growth inventory. Synthetic runs require `--allow-test-fixture`; the output always retains `source.testOnly`. Output replacement is atomic and happens only after every validation/calculation succeeds. A failed run preserves the previous output. This script does not publish, refresh a UI, or schedule anything.

## Exact normalized input contract

All object keys below are required unless explicitly optional. Unexpected work/history/authorship/institution keys fail, preventing silent use of precomputed fractions or accidental name/raw-profile inclusion. UTF-8 JSONL has one object per nonblank line; duplicate JSON keys and nonfinite JSON numbers fail.

### `works.jsonl`

```json
{
  "id": "https://openalex.org/W123",
  "doi": null,
  "title": "Example title",
  "abstract": null,
  "publication_date": "2022-02-01",
  "publication_year": 2022,
  "type": "article",
  "primary_topic_id": "T10429",
  "primary_source_type": "journal",
  "locations": [],
  "authors_count": 1,
  "is_authors_truncated": false,
  "updated_date": "2026-11-01",
  "authorships": [{
    "author_id": "https://openalex.org/A123",
    "author_position": "first",
    "author_order": 1,
    "institutions": [{"id": "https://openalex.org/I123", "type": "education", "country_code": "US"}],
    "countries": ["US"]
  }]
}
```

- Work, author, and institution IDs use canonical full `https://openalex.org/` IDs; topic IDs use the short `T…` form. No normalization/repair of malformed IDs. Nullable author/institution IDs remain null; null author slots still count in the true byline denominator. The provider-documented NULL and deleted author IDs are mapped to unknown slots during normalization, never counted as researchers.
- `title`, `abstract`, `doi`, `primary_source_type`, institution `type`, and institution `country_code` may be null. `author_position` is first/middle/last/null. `author_order` is the complete contiguous **1-based** sequence. Lists are explicit, including empty lists.
- `authors_count` is the verified full byline, not the capped works-list length. `is_authors_truncated` must be false; length mismatch or repeated byline order fails. Repeated identified IDs at distinct source positions retain their slot fractions; they never create extra unique people. Source singleton repairs must precede derivation. No supplied `frac` is accepted.
- Allowed institution types: education/company/government/facility/healthcare/nonprofit/archive/funder/other/null. A newly introduced source type needs a reviewed method change, not an inferred category.
- `locations` is retained for acquisition-contract compatibility but unused by these four outputs; `primary_source_type` controls venue. An adapter must not replace a missing primary source with any repository mirror.
- `updated_date` is an actual OpenAlex date or ISO datetime, never a render time. Publication dates must be exact valid dates matching publication year and not beyond `observed_through`.
- Input includes **un-gated** records for every required topic/year slice. Keyword gating is performed here. Slice row counts describe normalized rows before local gate/dedup, not API totals after exclusions. The acquisition receipt must separately prove paging totals and successful full-bylines repair.

### `author_histories.jsonl`

```json
{"author_id":"https://openalex.org/A123","counts_by_year":[{"year":2008,"works_count":1,"cited_by_count":0}],"updated_date":"2026-11-02"}
```

One successful history record per requested ID, no duplicates. Required histories cover every two-topic author with any selected work in 2017–2025 (the earliest 2022 ranking window begins in 2017). This also covers the displayed 2025 entrants and 2022 three-year-return cohort. The full 2000–2025 selected-work corpus is retained for first/latest affiliations and first selected-topic year. Authors whose selected output ends before 2017 cannot affect these displayed career/rank/entrant outputs, so their external histories are not required; missing profiles for a required author still fail closed. This avoids making an irrelevant dangling 2005 author profile a prerequisite for every chart. Annual `works_count` and `cited_by_count` are nonnegative integers, with no duplicate years. Sparse absent bins mean zero **only within manifest-attested complete coverage**, never because a fetch failed. Publication histories cover all indexed publication years exposed by the successful source. For an ID omitted from a successful author batch, reconstruct its history from a completely paginated all-corpus, all-type `author.id` works query: count publications per year and sum each work's citations-received bins. Every known selected-topic work for the ID must appear. The original author response is preserved unchanged; reconstruction is separately attested in the private acquisition manifest. A failed query, missing citation metadata, missing known work, count drift or incomplete page remains a failed acquisition, never a zero-filled history. The fallback's observation year comes from its original response receipt, so later offline replay does not advance it. Citation coverage must include 2017–2024 for the displayed 2022–2025 growth profile; older citation bins are not required or fabricated. Author ID merges/missing IDs are acquisition reconciliation work, not a reason to turn failures into zeros.

### `manifest.json`

```json
{
  "schema_version": 1,
  "source_url": "https://api.openalex.org",
  "corpus": "core",
  "test_only": false,
  "complete_years": [2000, "… every integer through 2025 …"],
  "observed_through": "2025-12-31",
  "works": {
    "sha256": "EXACT_WORKS_JSONL_BYTE_SHA256",
    "complete": true,
    "acquired_at": "ACTUAL_SUCCESSFUL_ACQUISITION_UTC_TIMESTAMP",
    "full_bylines": true,
    "slices": [{"topic_id":"T10429","year":2000,"row_count":0,"complete":true}]
  },
  "author_histories": {
    "sha256": "EXACT_HISTORY_JSONL_BYTE_SHA256",
    "complete": true,
    "acquired_at": "ACTUAL_SUCCESSFUL_ACQUISITION_UTC_TIMESTAMP",
    "expected_author_ids": ["https://openalex.org/A123"],
    "completed_author_ids": ["https://openalex.org/A123"],
    "publication_history_complete": true,
    "citation_years_complete": [2017,2018,2019,2020,2021,2022,2023,2024]
  },
  "coverage_policy": {"minimum_known_share": {
    "region": 0.5, "institution_type": 0.5, "career_stage": 0.5, "pedigree": 0.5
  }}
}
```

The ellipsis/placeholders above are documentation only, not valid input. The checked-in **test-only** manifest is a fully concrete example. Coverage thresholds shown are illustrative, **not approved production thresholds**. Production must choose positive thresholds explicitly; the method does not silently select permissive defaults. Every populated quarter in 2022–2025 must pass each dimension's threshold. An entirely unknown populated quarter fails.

Required slice keys are exactly: the two author topics for 2000–2025, and the other eight topics for 2010–2025, including successful zero-row slices. Missing/duplicate/incomplete slices, row-count disagreement, incomplete years, missing histories/batches, incomplete citations, bad bylines, invalid dates/types/IDs, nonfinite values, and inadequate known-share coverage fail closed. All expected/completed/history ID sets must match and cover selected authors; source may include extra successfully retrieved author histories. `sha256` is required by CLI; the in-memory function additionally computes a canonical content hash. Acquired timestamps use UTC ISO-8601 with Z or +00:00. Source dates may precede one another in either order; acquisition order does not establish observation order.

Manifests are assertions made by the acquisition lane, not proof created by derivation. Keep raw paging/batch/repair receipts and the complete acquisition manifest privately. Do not put raw author records or receipt URLs with credentials in the repository.

## Versioned counting rules

### Cohorts and deduplication

- Five types only: article, preprint, review, book-chapter, conference-paper; `core` corpus, explicitly attested by acquisition. No all-corpus fallback.
- **Wider paper cohort (2010–2025):** full topics T10429/T11601/T10614; gated topics T10958/T12015/T11993/T10094/T10581/T10241/T10919. Gated works require both the strong-modality expression and the neural-context expression. The exact versioned expressions are constants in the implementation; acronyms are case-sensitive (ECoG is distinct from oncology ECOG). Plain EEG alone does not admit a gated-topic paper.
- **Author cohort (2000–2025):** only T10429 and T11601, with the same five types and own dedup. Annual paper totals therefore do not share the author-cut denominator. Entry is first **observed selected-topic** publication since 2000, not guaranteed lifetime neurotech entry.
- Merge work IDs by newest source `updated_date`. Identical repeated versions count once; conflicting versions at the same update date fail. Duplicate raw rows must still reconcile to slice receipts. DOI is retained but is **not** an additional dedup key in v1.
- Count one reconciled OpenAlex work ID. Keep distinct preprint and publication IDs: the independently queried global and group baselines use the same indexed-work unit. Applying a title-collapse heuristic only to neurotech would invalidate denominator parity. `collapse()` is retained only for reconciliation experiments and is not invoked by production derivation.

### Paper groups

- Technique first match: invasive → ultrasound/TMS/MEG → EEG → no technique named. BCI is an independent title/abstract flag, never the residual technique bucket.
- Venue: preprint type or primary repository → Preprint; conference-paper type or primary conference → Conference; book-chapter type or book-series/ebook-platform source → Book chapter; otherwise Journal, including absent/other source metadata. This exhaustive conditional rule is shared exactly with the primary venue baseline adapter; Book chapter remains in reconciliation detail outside the three plotted venue rows.
- Annual output counts each selected deduped wider work once, with explicit 2010–2025 zeros only after complete acquisition validation. No partial-year estimate is generated.

### Fractions, affiliations, and coverage

- A work with a verified empty byline still counts as one paper and contributes one Unknown fractional work per dimension; it never creates a researcher. Every nonempty byline slot contributes exact rational `1 / full authors_count`. Never multiply by institution count. Unidentified author IDs retain their fraction and any known work affiliation; career/rank stay unknown and unique-person counts exclude these unidentified slots.
- **Versioned multi-affiliation choice:** choose the most frequently represented known institution type, breaking equal frequencies by lexicographically smallest `(known institution type, institution ID or empty, country code or empty)`. This transparent tie rule is not a claim about primary employment. An education/company tie chooses company under this rule. Country uses that chosen institution's known code, otherwise the lexicographically smallest known code from all institutions and authorship countries. A known mixed affiliation is not relabeled Unknown.
- Geographic map: static ISO alpha-2 map following [UN M49 geographic regions](https://unstats.un.org/unsd/methodology/m49/overview/), with US/CA as North America, Europe and Asia preserved, every other recognized mapped territory as Rest of world. Turkey/Cyprus/Armenia/Azerbaijan/Georgia are Asia; Russia is Europe. Taiwan is geographically assigned to Asia. Unrecognized/missing codes remain Unknown. No live countries/OSO dependency.
- Institution groups: education → Universities; company → Companies; government/facility → National institutes; all other known types → Other institutions. The known Other/Rest-of-world/Bottom-50% groups participate in known-share scaling even when omitted from plotted groups.
- For each dimension-quarter: total fractional output `T`, Unknown fraction `U`, known `K=T−U`; multiply each known segment by `T/K`. Keep raw Unknown and exact raw/scaled rational fractions in anonymous audit rows. Rational numerator/denominator components are decimal strings, so JSON/browser parsing cannot round large integers. Sum scaled quarters to a year, round annual counts **ties-to-even**, then compute growth from those rounded endpoint counts, rounded to one decimal. A zero base yields null, never fabricated zero growth. Coverage rescaling is an assumption, not recovered missing affiliations.

### Career and citation profile

- First publication is the earlier of first selected-topic year and the first positive all-field `works_count` year. A first-seen-in-observation-year author has unknown career stage **and** citation tier. Stage ages 1–5, 6–15, 16+ are distinct.
- For each displayed year y, rank among authors with selected-topic output in `[y−5,y]`. Sum citations **received** in `[y−5,y−1]`; not lifetime citations and not citations to papers published in that interval.
- Partition ranking by whether first publication is before y. SQL-compatible descending `percent_rank = (rank−1)/(partition size−1)`; singleton rank is 0; equal citations receive the first tied rank, leaving gaps. Zero citations always Bottom 50%. Positive tiers use strict `<.01`, `<.10`, `<.50`; the remaining group is Bottom 50%. New researchers remain Unknown regardless of their rank.

### People, entrants, retention, observed sector changes

- One identified author-year. Each selected paper contributes at most one sector vote per identified author. Repeated source-ID slots within that work are consolidated by their most frequent known sector (lexical sector-label tie), then that one work-level vote enters the author-year count. A work-level vote is one of: Academic (education), Industry (company), Other institutions (other known), or No listed affiliation. Any known votes beat missing votes. Choose the most frequent known **sector**; equal totals break by lexicographic sector label. Sector aggregation precedes the tie; it is not most frequent raw institution ID/type.
- Count every active identified author exactly once in that year. All four sectors are emitted, including No listed affiliation. It is missing source metadata, not an independent-researcher classification.
- Entrants are first observed selected-topic authors from 2010 onward. Other-field origin requires an earlier positive all-field publication year; empty successful histories leave origin unknown. Retention means another selected-topic active year within the following three years. The latest reported cohort is 2022 with complete follow-up through 2025. Undefined proportions stay null.
- Transition cohort: first selected-topic year ≥2016, latest selected-topic year >first, first/latest assigned sectors differ. Retain the full four-origin/four-destination matrix; diagonal null and verified complete off-diagonal zeros. This is first/latest observed **publication-affiliation** change, not verified employment or number of job changes.

## Independent baseline interfaces

### Global science context (optional, never a matched group baseline)

JSON object keys: `schema_version:1`, `source_url:"https://api.openalex.org"`, `corpus:"core"`, `types:[the five types in the order above]`, `acquired_at`, `observed_through`, `complete:true`, `method_id:"openalex-primary-domain-work-count-v1"`, and `rows:[{group,year,papers}]`.

New acquisitions require all 2010–2025 × Life sciences/Social sciences/Physical sciences/Health sciences/All science rows exactly once; the pure derivation/parser also retain complete legacy 2022–2025 inputs. They require nonnegative integer counts, and positive 2022 anchors. Domain IDs for acquisition are 1/2/3/4 respectively. All science is separately acquired, not assumed to equal a sum excluding unclassified works. Annual low/high are min/max domain growth ratios, scaled to the neurotech 2022 annual count; All research is scaled from All science. Values are growth-equivalent counts, not raw worldwide science totals. The raw baseline input hash/method/acquisition time are retained. This interface does not implement primary title-dedup worldwide; that scope difference is explicit.

### Independently established matched growth

The former generic `--matched-baseline` inlet is disabled. A global parity declaration and a complete array of counts cannot establish 21 category-specific comparison populations.

Use `scripts/publications/matched_baselines.py` through the owned refresh wrapper. `matchedGrowth` inventories all 21 groups with exact measurement units, numerator and denominator universes, source evidence and explicit availability. Six geography/institution involvement pairs use independently queried two-topic and all-research **whole indexed works**; three venue pairs additionally require complete owned wider-corpus endpoint works under the identical exhaustive classifier. These involvement counts are distinct from the native author-fractional descriptive rows. Methods and career/citation groups retain their independently computed numerator while unavailable denominators remain null. No universal science band is substituted and no paper denominator is attached to a researcher-growth numerator.


## Output contract: deliberate schema v2 migration

The ten table names/columns match the useful shape of the initial UI, including the full seven-column `nt_talent_table`. New/other-field/three-year-return fields are genuinely derived, not placeholder zeros. The integrated parser/UI implements the following contract:

1. Accept `schemaVersion:2`, OpenAlex source URL, source/method SHA-256 and actual acquisition/observation dates; remove Artio model/revision identity requirements and the `authorAsOf <= paperAsOf` acquisition-order assumption.
2. Accept null growth and undefined percentage cells. Empty cohorts are undefined, not 0%. Missing benchmark `place` is null. Current v1 enums/numeric-only percentages cannot honestly represent these cases.
3. Accept `audit` and optional `matchedGrowth`, and distinguish global-context benchmark from group-matched comparisons. Without a science input `nt_yearly` has only the 16 observed annual rows; do not fabricate baseline rows. Current full-history context adds 48 reference/band rows; legacy four-year context has 12.
4. Keep omitted-but-known segments and raw Unknown fractions available in method/audit disclosure. Preserve separate wider-paper and two-topic author cohorts and the full four-origin transition matrix.
5. Relabel all source freshness to actual successful acquisition time; source `updated_date` maxima and observation cutoff are separately named. Re-running identical source files does not advance any evidence date. Code hash changes imply method review even with the same method ID.

## Method reference and unresolved acceptance

The private methodology/design reference was inspected on November 6, 2026. It is not a production data source. The independent producer never executes its code, queries its warehouse or imports its compiled data. The full private report and its internal model identities are not part of this repository.

Legacy static extraction did not expose dedup, full-byline construction, or multiple-affiliation/tie rules. V1 therefore versions its own explicit rules and **does not claim legacy numeric parity**. Exhaustive shared venue categorization, rational tie-even rounding, deterministic affiliation ties, and indexed-work counting parity are intentional documented method choices. The acquisition adapter, positive coverage policy, complete real-source replay, matched adapter and schema-v2 UI migration are implemented and exercised. Remaining release gates are exact-revision review, human initial PR approval/merge, deployment verification and first data-feed installation. Historical synthetic tests are distinct from the complete real-source replay; neither test completion nor an opened PR means a production deployment.
