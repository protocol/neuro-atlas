# Weekly primary publication feed — staged data-only lane

## Scope and current gates

`refresh.py stage` is an **offline** receipt replay + derivation + production-parser staging lane, independent of acquisition and the citation refresh. It never acquires a shared lock, probes quota, calls OpenAlex, publishes, deploys, or schedules itself. `weekly-publications-feed.ts --publish` is a separate explicit operation. The lane has been exercised with synthetic failure cases/local Git CAS and the complete November 6 primary acquisition: all 180 topic-year slices / 403,266 candidate records were replayed offline, producing a production-validated anonymous snapshot. No production feed was published during initial implementation.

Initial implementation remains PR-reviewed. After that PR merges, weekly validated **data-only** updates may publish automatically. Code, classifier, cohort, coverage-policy, query, baseline-method, or parser changes remain reviewed changes. The source study is deliberately pinned to complete year **2025**, not silently advanced with the calendar.

Initial-installation state:

1. Finalized real primary, science and matched receipts passed the full offline replay and strict production staging. The bundled primary snapshot is schema v2 with `source.testOnly: false`; synthetic releases remain refused by production publication.
2. The source provider is wired into the actual four native charts and page; legacy imported schema-v1 aggregates are no longer a production fallback.
3. `acquire_baselines.py` reuses the shared safe transport, `Receipts`, `Budget`, and exclusive acquisition lock. Only the three exact reviewed `/works` groupings are admitted. All 16 baseline queries preserve the versioned counting contracts.
4. The scheduled run is held by the initial human PR-merge gate. It must not acquire/publish unattended before that gate, and it may never merge app/code or deploy it. Initial setup and ordinary weekly publication are distinct operations.
5. Changed accepted releases require the channel summary plus threaded screenshots described below. Unchanged successful refreshes remain quiet. Final delivery states which gates actually ran; these docs do not assert production deployment.

## Acquire separately; stage without network

Primary acquisition remains the existing resumable safe-curl command, with its shared OpenAlex lock and persisted precharged budget. Do not start a second source call while another lane holds it:

```sh
python3 scripts/publications/acquire.py acquire \
  --private-run-dir /private/weekly-primary \
  --workers 4 --cap-credits 7000 --reserve-credits 1000

# Offline request plan + explicit transport compatibility status; no lock/network.
python3 scripts/publications/refresh.py plan

# After all source acquisitions and receipt finalization complete:
python3 scripts/publications/refresh.py stage \
  --source /private/weekly-primary \
  --science /private/weekly-science \
  --matched /private/weekly-matched-receipts \
  --minimum-known-share 0.5 \
  --out .qa/publications-weekly-stage
```

The positive known-share threshold is explicit, **configurable policy**. `0.5` above is the parent's initial selection, not an owner-imposed constant. Inadequate coverage fails rather than silently reducing the threshold.

### Bounded baseline acquisition contract (v1)

`atlas.openalex-baseline-acquisition.v1` is pinned to the exact ordered eleven
`matched_baselines.acquisition_plan()` queries and five `refresh.science_plan()`
queries, with **no parameter/type/filter/corpus normalization**. Its canonical
contract SHA-256 is `2e6df1df88c090332684011a5c2746931078408ce16a95ac116ecbb4f9b3dbad`.
A changed source selection, method, query or contract version requires PR review.
Matched queries intentionally retain the reviewed default-core semantics; science
queries explicitly request `corpus=core`. Complete-through stays **2025-12-31**.

```sh
# Offline exact reviewed plan; no lock/network.
python3 scripts/publications/acquire_baselines.py plan

# One actual quota preflight, then exactly 16 source GETs; fresh PRIVATE output only.
python3 scripts/publications/acquire_baselines.py acquire \
  --private-run-dir /private/weekly-baselines

# Fully offline and source-read-only; creates a fresh self-contained receipt replay.
python3 scripts/publications/acquire_baselines.py replay \
  --source-run-dir /private/weekly-baselines \
  --private-run-dir /private/weekly-baselines-replay
```

The fixed cap is **50 free credits** with **1,000 reserved**, never paid spending.
The existing budget precharges attempts and enforces observed live free quota;
preflight must cover all sixteen queries before any output is created. No retries,
redirects, alternative auth, environment-value reads, authfile reads, header dumps,
query credentials, account mutations, stage/publish/deploy/cron or messaging exist
in this producer. Only curl's native environment-name credential handle is used.
Held shared lock, insufficient quota or incomplete data leaves no success manifest.

Output is `raw/` (immutable exact gzip bodies and original private metadata),
`science/` (five actual `.request.json`/`.response.json` pairs), `matched/` (eleven
compatible envelopes), `budget.json`, and the final `manifest.json`. Original body
SHA-256, metadata SHA-256, HTTP status and actual start/completion times are retained.
The science responses preserve **exact original bytes**, not reserialized JSON.
Cache replay uses original receipt timestamps, never a new acquisition timestamp.
Both existing consumers validate coverage/reconciliation before success. Offline
replay checks the exact output/raw inventory and hashes, copies verified receipts
into a fresh private root, and must reproduce the manifest byte-for-byte; it takes
no acquisition lock and instantiates no HTTP transport. Feed staging remains offline.
Unknown method/author matched denominators are not filled or inferred.

### Source adapter and history coverage

- Requires the exact reviewed acquisition method (including `author_history_first_year=2017`), all 180 topic/year slices and their counts, complete final manifest, original method/SQLite hashes, exact immutable raw receipt inventory, and successful author batches.
- Replays **all raw work pages, byline repairs, and eligible author batches offline** through `acquire.run_acquisition` with `Receipts(..., offline=True)`. No `acquire.py replay` CLI is invoked: that CLI takes the shared lock, while this offline function does not. Source/replay normalized rows are compared incrementally before the source rows are loaded for pure derivation.
- Converts only valid acquisition-contract short IDs into derivation-contract full OpenAlex IDs. Invalid identifiers are refused, not repaired. Expected/completed author IDs come from the **finalized SQLite authors table**, not every historical byline. All 2000–2025 works remain; required profiles are all P2 authors contributing any work in 2017–2025, the earliest displayed prior-five active window. Old inactive authors do not create a history requirement.
- The private `author_history_reconstructions` ledger must exactly match offline replay and stays private. Missing profiles may use the reviewed complete all-corpus/all-type author-work reconstruction, with every page/count and known selected work validated; this is derived evidence, not a fabricated API profile or zero-filled history. `/works` requests filtered by `author.id` are classified as **author-history** acquisition timestamps, never paper acquisition.
- Actual work and author receipt completion timestamps are retained **separately**. Neither a staging time nor the later author fetch is substituted for work acquisition. Original receipt interval/manifest/SQLite/method hashes are retained in the public anonymous source proof. Source update maxima remain the source's own values.
- The reviewed source contract at <https://help.openalex.org/data/common-attributes>, reconfirmed November 6, 2026, specifies every author publication year and citation counts from 2012. This resolves the stale search-snippet ten-year-window claim. Sparse absent bins mean zero only within that documented successful-response coverage, never for a failed/missing author fetch. A manifest-bound explicit `--history-coverage` JSON may supply stricter substantiated coverage instead.
- Normalized input hashes cover the exact canonical UTF-8 JSONL streams used by derivation. The separate original SQLite/receipt hashes are not replaced by these converted-stream hashes. No author IDs, work IDs, raw records, titles, abstracts, private paths or coverage-attestation prose are staged publicly.

### Science and matched contracts

Science input is the actual five pairs of `{all,life,social,physical,health}.request.json` and `.response.json` files. Request identity, core corpus, five types, four complete years, raw response SHA-256 and reconciled group totals are verified. An unattested `rows.json` export is not accepted as source proof. Each original response hash and acquisition time remains in the release manifest.

Matched input is the original 11-envelope directory or combined `receipts` object supported by `matched_baselines.load_receipts`. Output is attached at **top-level `matchedGrowth`**. The obsolete `derive.apply_matched_baseline()` all-21-parity interface is never called.

The result has exactly 21 inventory rows:

- Six independent geography/institution whole-indexed-work N/D pairs, with their actual source receipts.
- Three venue N/D pairs only after the complete local selected endpoint-year **NT10 indexed works** pass the owned-venue adapter. IDs are unique; distinct preprint/published IDs are not title-collapsed. Book chapters remain in denominator reconciliation detail.
- Six method/BCI integer local-work numerators and six career/citation **exact rational, quarterly-known-scaled author-fractional** numerators. Their reference denominators remain **unavailable/null**. Neither a global science band nor rounded author table counts is substituted. `completeMatchedInventory` stays false.

## Staged files and publication

A fresh `.qa` output contains exactly:

- `feed/openalex-publications/snapshot.json`
- `feed/openalex-publications/manifest.json`
- `vercel.json` with the fixed `git.deploymentEnabled: false` configuration

The snapshot is bounded to **2,000,000 bytes**; the manifest to **32,000 bytes**. The strict application parser validates the complete schema-v2 snapshot in production mode; parser stripping or transformations are refused. Exact normalized JSON bytes are required so duplicate keys cannot hide private material in a payload that appears valid after parsing. Fresh output only; no overwrite of a source, stage, or last-good snapshot.

For an **already reviewed/merged runtime**, publication is separate:

```sh
node --import tsx scripts/weekly-publications-feed.ts --publish \
  --staged .qa/publications-weekly-stage \
  --expected EXACT_40_CHARACTER_CURRENT_FEED_SHA \
  --approved-runtime EXACT_40_CHARACTER_CURRENT_MAIN_SHA
```

First installation additionally uses `--expected absent --allow-absent-bootstrap`. This is an explicit installation step, not a weekly default. A later reviewed method/runtime installation additionally needs `--allow-reviewed-method-change`; ordinary weekly refresh refuses method/runtime drift even if numeric output happens to match.

Publication is hard-bound to `protocol/neuro-atlas`, branch **`data/openalex-publications-feed`**. It verifies that staged/current runtime hashes match the specified **current remote main commit**, then verifies those exact reviewed source bytes via Git. Pinned runtime inputs include acquisition, transport, derivation, baseline/staging/publisher code, parser, API/server/provider, package/lock/config files. If the integrated parser gains local dependencies, add those dependency paths to this reviewed pin set as part of that PR.

Only the two data files and fixed deployment-suppression file are constructed in a fresh bare Git tree. No source working tree or `main` is pushed. Publication uses `--force-with-lease` against the exact expected data ref, then re-fetches and checks revision, tree, regular-file modes, parent, exact bytes and fixed public commit metadata. There is **no automatic CAS retry**. A main/ref race stops the operation for inspection.

Pre-publication source/schema/coverage/method/CAS failures leave the remote untouched. If a post-push readback fails, the outcome is uncertain: inspect the exact ref; do not blindly retry or roll back another writer's update. Consumers independently retain last-good on failed admission.

### Meaningful change versus evidence capture

The semantic fingerprint includes table values, counting/cohort/coverage methodology, meaningful audit values and matched numerator/reference/metric states. It ignores acquisition/capture/source-update dates, raw input/receipt hashes and evidence-only identifiers. **Full snapshot byte SHA-256 and release manifest still cover all those evidence fields.** A freshness-only replay does not push a new commit or advance the displayed last-good date.

New publication requires primary/science/matched acquisitions within 14 days and not over five minutes in the future. This is a bounded operational freshness guard, not a source-date substitution. Existing last-good data remains available if a later source acquisition fails.

## Live consumer and UI handoff

- `src/lib/publication-feed-server.ts` reuses `fetchLatestPublication`, full bounded byte/hash/schema validation and `retainingPublicationReader` from the publisher module **server-side only**. Initial bundled primary data is production-validated lazily; concurrent requests coalesce. An invalid, stale, future-dated, older, unavailable or malformed latest feed does not replace last-good or alter its dates.
- `src/app/api/publications/route.ts` is asynchronous Node runtime at `/api/publications`, with no-store responses and a normalized snapshot SHA-256. It returns a generic 503 if no valid primary fallback exists; no private exception details are exposed. The page remains synchronous.
- `src/components/publication-source-provider.tsx` imports only the pure application parser, React/Next navigation, the bundled snapshot, and browser-safe helpers. It does **not** import the Node publisher/server. It provides `PublicationSourceProvider` and `usePublicationSource(): PublicationSnapshot | undefined`. Parent wraps the current page and the UI worker consumes this optional snapshot with the bundled valid primary snapshot as fallback.
- The provider fetches the API once per active pathname/document (StrictMode/remount deduplicated; returning after a different pathname starts a new fetch). It streams a maximum 2.1 MB response, rejects redirects/HTTP/media-type/UTF-8/hash/schema/freshness failures and retains actual last-good. No refresh timer or passive background polling is installed.
- Complete-endpoint capability is monotonic within both server and client retention: once a valid bundled/accepted snapshot contains `nt_talent_endpoints` and its paired audit, an old-shape candidate cannot replace it, even with equal or newer acquisition timestamps and valid hashes. `assertPublicationEndpointCompatibility` supplies this narrow admission guard. A valid complete candidate replaces the **whole snapshot**, never a matrix spliced into a different acquisition. Legacy parsing still permits absence of both optional fields so an actually legacy-only source can be disclosed as unavailable; that is not permission to downgrade an already complete source. This is a consumer guard, not an automation/configuration change or a publication. A method/runtime upgrade still requires ordinary reviewed installation.

## Weekly completion and notification contract

After merge and baseline transport integration, the parent-owned weekly runner performs acquisition → offline stage → explicit expected-ref publish → exact-revision consumer/UI verification. A changed verified result returns a notification descriptor for **`C0CFPQGLVKJ`** with all four publication surfaces and `screenshotThreadRequired: true`. The runner posts a short update there and affected-surface screenshots in **that post's thread**. This script does not claim to have sent that notification. An unchanged verified result has `notification: null` and stays quiet. Acquisition failures retain last-good and must not claim a successful refresh.

## Verification commands

```sh
python3 -m unittest discover -s tests -p 'test_*publications*.py' -v
python3 -m unittest discover -s tests -p 'test_primary_history_scope.py' -v
python3 -m unittest discover -s scripts/publications -p 'test_matched_baselines.py' -v
node --import tsx --test tests/publications-feed.test.mjs tests/publications-source.test.mjs
npx eslint scripts/weekly-publications-feed.ts src/lib/publication-feed-server.ts \
  src/components/publication-source-provider.tsx src/app/api/publications/route.ts
npx next typegen && npx tsc --noEmit --pretty false
```

Tests use `testOnly: true` fixtures and injected validators/transports. A real local Git repository exercises bootstrap, changed commit, quiet no-op, exact-byte readback and stale-CAS refusal without any GitHub push. The actual existing science and 11 matched receipts were also read offline to verify adapter compatibility; that is **not** a full primary-source replay or proof of a published production refresh.
