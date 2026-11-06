# Weekly Google Trends data feed

## Status and boundaries

This integration lets Atlas adopt validated data-only releases without an app rebuild or deployment. Initial code review, human merge, deployment and runtime acceptance must precede recurring publication. Code and methodology changes remain PR-reviewed. This code installs no schedule, browser job, notification sender or hosting settings.

The first data release was published October 30, 2026 at `df3af9f9e09230cdcee3c7a69a86b4f2ca41b6f0`. Its window is October 30, 2023–October 30, 2026. That publication did not update the previously bundled-only application. The initial reviewed implementation now uses the genuine November 6 capture as its verified bundled fallback, preserving the original October 15 captures, exports and exact download revision. See [bundled-source-proof.md](bundled-source-proof.md).

The producer uses Google's public Explore page through an owned browser. Visitors make no Google requests. Public widget endpoints may rate-limit or change; failed acquisition or validation retains accepted data. No paid provider, new account or service is needed.

## Atomic source contract

Fixed repository: `protocol/neuro-atlas`. Fixed ref: `refs/heads/data/google-trends-feed`. Its complete data-only tree contains two regular, nonexecutable files and only their parent directories:

- `feed/google-trends/feed.json`: version 1 bundle with both exact raw responses and both token-free request-metadata strings.
- Root `vercel.json`: fixed `git.deploymentEnabled: false` suppression.

The consumer reconstructs JSON and both CSVs from these original strings using the same strict validator/generator as `trends:refresh`. Derived values are never accepted independently. Both full 36-calendar-month windows agree. Literal `neurotechnology` + `brain-computer interface` share one request/scale; literal `Neuralink` uses a separate request/scale. Never append separately normalized windows.

Validation checks exact identities/order, geography/property/category, real dates, complete ordered weekly coverage, 0–100 integers, aligned display/availability arrays and partial flags. Missing observations remain null/gaps; available 0 and literal `<1` retain their meanings. Incomplete boundary weeks and Google-partial rows remain in tables/exports and are excluded from plots/latest readings without rescaling.

Metadata is recursively allowlisted. Unknown fields and credential/header fields fail closed before accepted capture files or publication staging are written; never strip fields to make a provider change pass. Optional extensions are restricted to `requestOptions.backend: "IZG"` and `widgetRequest.userConfig: { "userType": "USER_TYPE_SCRAPER" }`. Exact accepted raw/request bytes and their separate SHA-256 hashes are retained. Producer staging/publication requires both captures on the current UTC day and a rolling window ending that day. Calendar subtraction clamps a leap-day start to February 28 where necessary.

## Runtime and pinned downloads

`GET /api/google-trends/latest` resolves the public GitHub ref, then reads one fixed raw-GitHub path at its literal lowercase 40-character SHA. Upstream reads reject redirects, bad status/content type and invalid bundles, time out after 15 seconds, and stream at most 1.1 MB. No client secrets are involved.

Only successfully validated whole releases enter Next's durable Data Cache, revalidated hourly. An in-process retained source and independently verified bundle cover failures/cold starts. Cache eviction plus an outage can return the older bundled source; this is not a guarantee of retaining the newest historical release across every cold start.

One page provider serves both Trends selections, including hidden sizing lanes. It loads once per document across StrictMode and client-side route remounts, validates the API response and atomically adopts both groups. There is no focus polling or later background source switch. Current chart actions, preview axes, sizing lanes, rails, modal/history/focus behavior and PNG rendering are preserved. No public fallback banner is added; source capture dates remain visible in details and exports.

`GET /api/google-trends/<revision>/<file>` accepts only `google-trends.json`, `neurotech.csv` and `neuralink.csv`. Each chart links its displayed revision. An unavailable historical release returns 503 instead of substituting another window. The current special bundled token is `7574619a0ea64efbf482d31d57916857f97b966d`, the Git blob ID of the admitted November 6 feed bytes (not a published upstream commit). The prior token `c5a18cfb03746c0e048e425fac82259488d089a4` still reconstructs the unchanged October 15 archive. Legacy `/data/google-trends/*` files retain their original bytes.

All API/download routes retain Atlas's Basic gate, `/neuro-atlas` basePath and existing noindex policy. Latest responses are private/no-store; immutable downloads are private. Initial HTML uses the bundle, then hydration adopts the document's accepted release.

## Bounded producer

```sh
npm ci
npm run --silent trends:feed -- --window
# Exact UTC rolling start/end, with leap-day clamping.
```

Acquire both dates using `scripts/capture-google-trends.py`, an owned browser window/lock, explicit `TRENDS_CAPTURE_START`/`TRENDS_CAPTURE_END`, and a fresh checkout-local `TRENDS_CAPTURE_OUT`. The capture script validates both sources before writing either. It saves no cookies, headers or widget tokens. The scheduler/operator owns exclusive locking, browser target journaling/cleanup, bounded retries and exception reporting.

Default staging is local and makes no external writes:

```sh
npm run --silent trends:feed -- \
  --source .qa/<fresh-capture> --out .qa/<fresh-stage>
```

Only an explicit invocation publishes:

```sh
npm run --silent trends:feed -- \
  --source .qa/<fresh-capture> --out .qa/<another-fresh-stage> \
  --publish --expected <literal-current-data-branch-sha>
```

Read the current ref first. A missing or changed installed ref is an integrity hold; never recreate it or retry CAS blindly. The retained low-level `--expected absent` bootstrap is for a separately controlled first installation/local test fixture only. The installed weekly job always supplies its existing literal SHA.

The fixed-target publisher uses native `gh` Git credential brokerage without reading/storing credentials. It verifies the exact expected ref, fetches and validates the entire existing tree (including regular-file modes, no extra/empty directories and exact suppression), validates the prior source and rejects backward windows. Changed releases create only the approved data tree, parented to that exact expected commit, and push with exact `--force-with-lease`. It then rereads the ref, fetches it and compares both files byte-for-byte. It never writes main, app code, another ref or bundled captures.

Author AND committer are explicitly set to `Neuro Atlas data refresh <neuro-atlas-data@users.noreply.github.com>`, overriding ambient Git identity. Actual author, committer and full generated message are inspected before push. Refusal diagnostics do not echo unexpected private metadata.

App `vercel.json` suppresses only the exact Trends data branch; the data tree additionally disables all deployments within itself. Other app branches retain their default behavior. An operator must independently verify remote tree/parents/identity/bytes and the absence of app deployments after a real publication. A helper return alone does not satisfy that release gate.

## Semantic no-op and operator receipts

`trendsFingerprints(validatedBundle)` returns one SHA-256 per chart over fixed method/identity, scope, normalization window, ordered dates/values, literal bounds, missingness and partial flags. Capture timestamps, raw/request formatting and integrity hashes are excluded. Original-source hashes remain separate. A normalization-window shift is substantive even when the numeric arrays match.

After validating the existing source/tree, the publisher compares these fingerprints. A semantic no-op rechecks the current ref and returns the existing revision with `published: false`, `verified: true`, `changedCharts: []` and `fingerprints`; it creates no commit and makes no push. Changed receipts include `published: true` and the affected stable chart IDs. Dry-run receipts include fingerprints but make no claim of comparison with the remote release. The `files` hashes always describe the staged capture, which can differ from retained published bytes on a no-op.

The scheduler must persist successful checks separately from published-source dates, preserve last-good state, and stay quiet for unchanged semantics. For changed accepted releases, it must persist pending/delivered notification receipts, post a short summary in the owner-designated private channel and attach actual accepted-revision chart screenshots in that post's thread. Read back the delivery and attachments; recover pending publication/notification state without duplicate posts. These orchestration steps are not implemented or activated by the application/CLI.

## Verification

```sh
npm run trends:verify
node --import tsx --test tests/google-trends*.test.mjs
node --import tsx --test tests/auth-prefix.test.mjs tests/response-robots.test.mjs tests/subpath.test.mjs
npm run typecheck
npm run build
```

The weekly UI integration test can also read a real, unpublished staged feed using `TRENDS_TEST_FEED=/absolute/path/to/feed.json`. Its HTTP and revision identities remain local fixtures; it is not evidence of a live publication or hosted positive-auth acceptance. It exercises strict source → immutable reader → latest response → both rendered chart tables/points/pinned download links.

November 6, 2026: a fresh real capture for November 6, 2023–November 6, 2026 was validated, re-staged and replayed through this local integration. Feed SHA-256: `37daa50d680c8fa6706a69dd51eee3eb603f4f650f3fdb1b047864a17fccc862`. No publication, browser operation, scheduler or deployment was performed by this implementation task. Native/hosted layout, auth, cache and release checks remain the parent's review/installation gates.
