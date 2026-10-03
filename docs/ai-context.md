# AI context access

This is additive, read-only access to the Atlas's committed UI data. It is not a chatbot, a second catalog, an LLM dependency, a live feed, an MCP service, or permission to bypass authentication. The existing `src/proxy.ts` is unchanged and applies to every new route.

## Entry points

- `/ai/`: server-rendered human guide, starter prompt with copy/manual fallback, full and section downloads, query contract.
- `/llms.txt`: compact Markdown index served as `text/plain; charset=utf-8`.
- `/llms-full.txt`: all sections as readable Markdown, served as `text/plain; charset=utf-8`. `?download=1` attaches `neuro-atlas-full.md`.
- `/ai/sections/{section}.md`: topic Markdown, served as `text/markdown; charset=utf-8`; `?download=1` attaches the file.
- `/ai/records/{id}.md`: single-record Markdown with canonical UI path, source links, dates, units, evidence classification and coverage.
- `/api/ai/query`: bounded GET-only JSON query. Framework-managed HEAD/OPTIONS are read-only; unsupported mutation methods get 405 after authentication. Unauthenticated requests encounter the original 401 gate first.

The shared footer links to `/ai/`. Every HTML page advertises `<link rel="describedby" href="/llms.txt" type="text/plain">`. Machine responses also provide a Link header. llms.txt is a convention, not a guarantee of discovery, accuracy, licensing or permissions.

All Atlas paths are root-relative. No canonical public origin has been asserted. The starter prompt resolves `/llms.txt` against the deployment the user actually opened; it does not take an origin from request headers or preserve credentials/query strings. No historical deployment alias is used.

## Data boundary

`src/lib/ai/catalog.ts` directly imports the same JSON modules as the UI. `public-data.ts` uses explicit nested field allowlists, not recursive serialization of repository/provider content. Unknown fields, hidden/draft/unlisted/noindex/preview records and non-public provider locations are excluded. Hidden funding constituents suppress associated aggregate output rather than leaking it. IDs are deterministic from source identities, not array position or query order; identity changes may change an ID. A changed contract should bump `schemaVersion`.

Exported sections:

- `funding`: `src/data/funding-index.json` companies, sourced rounds, six regulatory marker classes, investor aggregates, review cutoff and methodology. Investor associated capital is the full value of rounds they participated in, not their own contribution. Round USD/native amounts and currency are preserved, including conversion/rounding notes. Sourced capital is amount raised, not valuation/market cap, and the index is screened BCI coverage, not a census or exhaustive funding-to-date.
- `milestones`: `src/data/milestones.json`, including both BCI and broader-neuro events. Clinical/commercial/partnership events extend beyond the funding screen. Timeline amounts can include acquisition enterprise values, conditional proceeds, public offerings or philanthropic commitments; the event note/stage remains attached. Do not sum them with funding rounds or infer completion from announcement.
- `memo-capital`: `src/data/capital.json`, with memo attribution. This comparison series is independent of sourced rounds and event amounts; 2026 is January–April only. No annualization, recalculation or blending.
- `performance`: the existing `parseFeed` and `selectPerformance` projection of the committed shared snapshot: simultaneously recorded neurons, selected tissue volumes and recording-hours datasets. Preserves every selected point, track definition, source, date precision/basis, unit and qualifier. Provider commit/hash/export time are included as packaging provenance, never a fake fresh observation date.
- `velocity`: the existing `selectPace` projection for Idea vintage and Latency compression, plus only the earlier Atlas `revealed_commitments` and `markets` extracts still used by the current component. Units and reliability flags remain intact. The earlier commitments text is classified `mixed`: its historical count and aspirational 10,000-by-2030 milestone are not one observation or fitted projection. The older source wording/cutoff is preserved, not silently corrected by this access layer. `upstreamTodo` and operational owner fields are excluded. Unwired/not-applicable readings suppress retained stale values, dates and series.
- `expectations`: Atlas-local inflection hypotheses and forecast question/proxy mappings, separately classified as hypotheses/forecast mappings. The local inflection source also supplies the UI count. No provider live-price snapshot, extra contribution/outcome fields or inferred achieved outcomes. No extrapolated series are introduced.
- `glossary`: the same acronym definitions used by UI tooltips. A designation or investigational exemption is not a commercial marketing approval.

Not exported:

- The removed Neurofounders directory or any replacement ecosystem crawl. Only the existing original-map link is advertised.
- The entire provider snapshot: its adoption/BCI-implant series, toolkit, provider-side hypotheses/contributions, market prices, preview source locations and internal/operational fields are outside this projection.
- Obsolete local performance/pace records superseded by the shared snapshot.
- The Channel count frontier placeholder as if it were a measured series.
- Raw CSV/repository contents through arbitrary file paths, environment data, credentials, internal URLs, CMS data, or private/draft content. Public source links into a source repository remain attributed links, not a repository export.

Attribution and uncertainty travel with the numbers. No new license is granted, and source-specific terms still apply. Checked/export timestamps are distinguished from observation and announcement dates. Missing dates remain missing.

## JSON contract (schemaVersion 1)

All parameters are optional. Duplicates and unknown parameters return JSON 400, as do invalid types, values and bounds. The encoded query string is capped at 2048 characters. Values are not coerced from scientific notation, negative values or leading-zero forms.

- `q`: literal, case-insensitive substring of title and public source data (including source URLs), at most 200 characters, no control characters. It is not exact-company matching or an LLM query.
- `section`: one of the section IDs above.
- `type`: one of the types enumerated in each response's `queryContract`.
- `scope`: an exact source scope value listed in `queryContract` (BCI/broader for timeline; original funding scope values for index rows). Scope does not silently join unrelated record types.
- `year`: integer 1000–9999. Matches source announcement/date/year or a series observation year, not review/export time. Returns whole records; it does not trim series to that year.
- `id`: exact record ID, used alone; unknown ID returns 404.
- `limit`: integer 1–50, default 20.
- `offset`: integer 0–10000, default 0.

Filters are ANDed. Results sort by ID using code-point order, with no relevance/random ordering. Responses include `schemaVersion`, `canonicalUrl`, `indexUrl`, `guideUrl`, filtered `total`, `returned`, `limit`, `offset`, `next`, `coverage`, `queryContract` and full `results`. Results include source URLs, source data, source-relative dates, units, evidence, canonical UI path and record Markdown link. Follow `next` until null. Empty matches/out-of-range offsets return 200 with no results. Unknown section/record Markdown resources return 404.

Examples:

- `/api/ai/query?type=round&q=neuralink&limit=10`
- `/api/ai/query?type=event&scope=broader&year=2026`
- `/api/ai/query?section=performance`

Queries never fetch arbitrary URLs, read paths, call a model, execute input, mutate data or load a live market. No CORS grant is added. Successful/error machine responses use `Cache-Control: private, no-store`, `Vary: Authorization` and `X-Content-Type-Options: nosniff`. The unchanged proxy controls its own unauthorized response headers.

## Verification and maintenance

Use the installed npm lockfile (`npm ci`). Behavioral tests run in the existing default `npm test` command, including source equality, synthetic hidden/private fields, stale unwired values, deterministic pagination, invalid input, HTTP handler status/content headers, index/section/record coverage, SSR guide, clipboard success/fallback and the original gate hash/matcher for every resource.

`npm run typecheck` and `npm run build` exercise Next's real route typing and production compiler. After building, run a loopback production server and `node --import tsx scripts/qa/ai-http.mjs http://127.0.0.1:3119` to probe every resource without credentials, additional methods and bypass hints, plus the built SSR discovery/guide. This probe intentionally does not bypass the gate. Authenticated HTTP success and visual browser QA are separate parent checks; successful handlers are directly exercised by the default tests.

Next 16.3.2's installed proxy docs name `unstable_doesProxyMatch`, but its installed testing package exports `unstable_doesMiddlewareMatch`. The test harness uses that actual export through CommonJS and supplies Next's expected `AsyncLocalStorage` global. No runtime gate change or new dependency is needed.

The base has three reproducible ESLint errors in untouched `milestone-timeline.tsx` and `theme-toggle.tsx`. They are not changed in this lane. Lint the changed paths separately as well as recording the repository-wide status. No screenshots or independent review are claimed here; the parent owns exact-revision visual/authenticated QA and review before any outward action.
