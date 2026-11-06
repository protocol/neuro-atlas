# Weekly citation-latency feed (version 1)

This is the **median age of references in new Neurotech work** (`#idea_vintage`). The initial code/schema integration needs human PR approval, merge and deployed runtime verification. No data branch, scheduler, live source acquisition or deployment is installed by this change. Translation evidence (`latency_compression`), all other records, and the original snapshot/provenance remain untouched.

## Frozen method and source identity

Pinned upstream `protocol/plrd.org@0d91734795f7a62394d2047a8f95384bbeae41f4`:

- `scripts/vendor/field_velocity_openalex.py` is an unchanged copy of Git blob `87a4e15fa4f957ca980a056d949b72cfc353b615`.
- `scripts/vendor/vintage-direction.mjs` is an unchanged copy of Git blob `a63c91f2a196f8a542e9341f30eefcaeefe2ccec`.
- Search: `brain-computer interface|connectome|neural implant|whole brain emulation`.
- Full 2000–UTC acquisition-year coverage; 80 sampled works/year, seed 42, first 50 references/work, deduplication within each work, 50-ID batches. Reference publication years must lie between 1900 and the citing year.
- Pooled reference-age median, cluster bootstrap over works, 500 iterations, seed 42; upstream rounding unchanged. `first_time_authors` stays empty.
- Reliable iff `year < acquisition-year - 2`. In 2026, 2024–2026 stay under-indexed, while headline and recent-segment direction use only reliable observations through 2023.
- Source-compatible mapping is a narrow adaptation of upstream `velocity-openalex.ts` and `withOpenAlex` in `velocity-instruments.ts`; source links pin the actual generator revision. Patent-vintage metadata is carried from the original record without modification.

Code, method, schema and target changes require PR review. They never ride on the data branch.

## Acquisition and private replay

Entrypoint: `scripts/openalex-citation-latency.py`. Default operation is offline replay. `--acquire` is explicit and the parent owns the full run. Sanctioned curl-native `/rate-limit` preflight was exercised November 6 and verified 10,000 separate free credits; no works acquisition or credential-value inspection was performed by this lane.

The adapter delegates credential transport to curl >=8.3: `curl -q --variable '%OPENALEX_API_KEY' --expand-header 'Authorization: Bearer {{OPENALEX_API_KEY}}'`. There is no shell interpolation or Python credential-environment read; the pinned generator's environment is also isolated. Curl keeps TLS verification on, limits the initial protocol to HTTPS, never follows redirects, caps connect/total time and body size, disables curlrc, and captures stdout/stderr privately. Only reviewed numeric quota headers remain in memory; provider exceptions/headers are never logged. `/rate-limit` immediately selects the observed nested `rate_limit.daily_budget_usd`, `daily_used_usd`, `daily_remaining_usd` and `prepaid_remaining_usd`, never retaining its separate credential field. Preflight requires a consistent separately identified daily free balance at most $1/10,000 credits and zero prepaid remaining. Unknown/changed schemas fail closed.

Every attempted works request, including timeouts/5xx retries, is reserved at worst-case cost *before* transport: search-filter calls cost 10 credits; count/reference batches cost 1. Permanent/quota/429 refusals stop immediately. At most three attempts per call; no retry across UTC day rollover. Maximum runtime is two hours by default. The conservative no-retry bound is 101 credits/year (2,727 for 2000–2026). A default 3,000-credit run cap and 1,000-credit free reserve are configurable downward/upward by the parent; no paid usage is authorized.

All OpenAlex producers using this key must honor the **same exclusive lock** (`/opt/data/automations/openalex-acquisition.lock`) and the parent's reserved shared allowance. A separate uncoordinated client can consume account allowance between checks; this adapter does not assert an account-level prepaid-disable switch. Do not enable unattended acquisition without settling that coordination/access boundary.

Example **future, parent-controlled** live command (not executed here):

```sh
python3 scripts/openalex-citation-latency.py --acquire \
  --run /private/fresh-run --out /private/fresh-run/neurotech.csv \
  --max-credits 3500 --reserve-credits 6500
```

Each fresh private run retains full successful response receipts, exact public request parameters, receipt SHA-256s, a request-attempt cost journal, completion status, CSV hash, source pins and true acquisition/generation timestamps. No receipt directory is copied into the public tree. Failed/partial runs cannot stage. No old receipt cache is relabeled as a fresh run.

```sh
python3 scripts/openalex-citation-latency.py \
  --run /private/complete-run --out .qa/citation-replayed.csv
```

Replay verifies every private receipt hash and ordered request identity, invokes the unchanged generator/statistics with the original generation time, and requires byte-identical complete CSV output. Focused Python tests use explicitly synthetic provider responses, never fabricated live evidence.

## Strict public contract and transport

A bundle is `{version:1,csv,provenance}`. CSV is the exact generated string. Strict provenance contains only the version/method, frozen settings, pinned source revision/blobs, true source timestamps, manifest/CSV SHA-256s, receipt count and `complete:true`. Unknown/private fields fail admission. Every column and ordered year is required. Counts, sample caps, empty-reference semantics, interval completeness/order, corpus-share rounding, real dates and exact reliability are checked. A separately supplied record/headline is never trusted.

Destination is fixed to `protocol/neuro-atlas`, `refs/heads/data/openalex-citation-latency-feed`. The complete tree is exactly:

```
feed/openalex-citation-latency/feed.json  # regular 100644 blob
vercel.json                            # regular 100644 blob; git.deploymentEnabled=false
```

The consumer resolves the GitHub ref and reads a single immutable 40-character-SHA raw source. Redirects, bad status/type/schema, over-1.1MB bodies and 15-second timeouts fail closed. Only complete validated success enters Next's hourly durable latest cache and immutable revision cache. Process last-good retention survives later failures; cold cache plus outage uses the separately bundled genuine November 6 anonymous feed. Initial rendering and client transport failure use that same bundle; older responses cannot replace it. There is no public fallback warning. The archived August 4 CSV remains hash-checked and independently matched to the original snapshot series; its exact revision stays downloadable and the existing snapshot/provenance files are not rewritten. See [bundled-source-proof.md](../google-trends/bundled-source-proof.md).

The page's provider loads/adopts once per actual document, including StrictMode and route remounts, with no polling/focus refresh. Only `idea_vintage` is projected. Original cards, source table, intervals, hollow under-indexed marks, share fragments/actions, PNG plot data, rails and authentication remain in place.

Authenticated/private APIs (existing Basic/noindex/basePath policy remains in force):

- `/api/citation-latency/latest`
- `/api/citation-latency/<displayed-sha>/citation-latency.csv`
- `/api/citation-latency/<displayed-sha>/citation-latency.json`

Downloads pin the displayed revision, retain original CSV bytes and use private immutable caching. An unavailable historical revision returns 503, never another release. The archived JSON download is explicitly a record plus original archive provenance; it does not invent missing historical receipt provenance.

## First source must be staged separately

```sh
npm run citation:feed -- --source /private/complete-run --out .qa/citation-first-stage
```

Stage validates the full feed, verifies its private manifest hash, independently replays receipts in a key-free subprocess, and writes only a new `.qa` two-file directory. There is **no implicit publish**. Historical staging requires explicit `--allow-historical-stage`, preserves the true historical date and never qualifies as a current publication. The real October 28 CSV under `tests/fixtures/citation-latency/` is a historical contract fixture with its original SHA/date; its test-only synthetic provenance must never be published. The parent's genuine November 6 source passed complete offline replay and staging; only its bounded anonymous bundle is included as the initial fallback. No raw receipts, work-ID request manifest or public feed publication is included.

## Publisher (not invoked here)

Later publications require an explicit staged directory and literal expected ref SHA. Absent is an integrity hold by default. One-time initial creation additionally requires the parent's explicit `--allow-absent-bootstrap`; the scheduler must never set that flag.

```sh
npm run citation:feed -- --publish --staged .qa/citation-first-stage \
  --expected <literal-40-character-SHA>
# Parent-controlled installation only, after initial code approval:
# ... --expected absent --allow-absent-bootstrap
```

The fixed-target publisher validates current-day source proof, the entire previous tree/modes/suppression, exact expected ref, public author/committer/message, and source age. It builds a data-only commit and performs one exact `--force-with-lease=<fixed-ref>:<expected>` CAS push, then rereads the ref, fetched object, complete tree, parent, public identity and both file bytes. It never writes main, merges code, retries a race or silently recreates a missing branch. The parent must independently verify immutable raw HTTP and deployment suppression/no matching app deployments at actual first publication.

The semantic fingerprint covers fixed method/settings and every citation year/median/interval/missingness/reliability flag, excluding capture/check timestamps and unplotted count context. Identical chart semantics skip commit/publication; the parent retains the successful check/receipts privately and stays quiet. Changed refresh reporting/screenshots and notification recovery are parent-owned, not implemented as a scheduler here.

## Verification

```sh
python3 tests/citation-acquisition.test.py
node --import tsx --test tests/citation-*.test.mjs
npm run typecheck
```

Local bare-Git tests exercise only disposable remotes, including bootstrap refusal, CAS races, public identities and semantic no-ops. Browser/hosted runtime and real source acquisition acceptance remain separate parent gates.
