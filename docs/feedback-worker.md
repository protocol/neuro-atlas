# Private Atlas feedback worker (disabled by default)

This is a **narrow presentation/copy lane**, not an arbitrary UI-repair agent. No workflow, scheduler, live credentials, database, paid request, remote ref, PR, merge, or deployment is enabled by this code change. Local provider/GitHub HTTP servers in the tests are explicitly synthetic. Execution cost for this implementation: **UNPRICED**, not $0.

## Executable boundaries

- `runtime.ts worker` is a bounded private queue drain. It imports the backend's fixed `createFeedbackDatabase` factory, reads trusted public `main`, prepares disposable detached Git worktrees, and runs `runOne`. It refuses publisher credentials. Nothing invokes it automatically.
- `engine.ts` admits one immutable public job via `WorkStore`, checks approval/version/fencing/kill control, runs trusted baseline checks, calls direct Anthropic Messages HTTP without tools, validates/applies a structured patch, runs candidate checks, checks the actual working tree again, then signs and durably hands off an Ed25519 receipt/bundle. No model-written command, CLI, package, test, or executable is run.
- `runtime.ts publisher` is a **separate process/identity**. It refuses provider/private-signing credentials, reads a persisted bundle and trusted source files, verifies signature/digests/policy first, and only then lazily loads its installation token. It never executes repository/model code or test commands (Git is used only to materialize/read a trusted base snapshot).
- `publisher.ts` uses the fixed `protocol/neuro-atlas` repository, `main`, `atlas-feedback/<feedback UUID>`, fixed commit identity/message, and `draft:true`. Public body contains exact approved task values as escaped JSON plus neutral validation text/digest; no private comment, model rationale, logs, screenshot, or context dump. There is no merge, deployment, or general write endpoint.

Run either CLI with no flags/config to obtain `{"state":"disabled"}`. Enabling requires **both** `FEEDBACK_ENABLED=true` and the role-specific `FEEDBACK_WORKER_ENABLED=true` / `FEEDBACK_PUBLISHER_ENABLED=true`, plus all configuration and DB control limits. This document is not authorization to set those values.

## Deterministic edit policy

Only existing regular, non-executable Git blobs at these exact paths:

- CSS: `src/components/{landing,draft-chart-panel,draft-chart-plot,google-trends,performance-curves}.css`.
- TSX: `src/components/site-nav.tsx`, `src/components/sections/velocity-tabs.tsx`.

CSS uses PostCSS. Existing node order, selector, property, at-rule, comments, and every byte outside approved declaration values stay identical. Only declaration values in existing rules (including existing `@media`) may change: bounded nonnegative spacing/radius (`0..96px`, `0..6rem`), font size (`12..48px`, `0.75..3rem`), unitless line-height (`1..2`), hex colors/transparent/currentColor, and a small enumerated set of alignment/weight/style values. No new rules/declarations, URL, variable/function, import, content, escape, or important changes.

TypeScript AST identifies **existing `label: "..."` properties and literal `className="..."` attributes only**. All other bytes must be exact, so no new expression/import/href/URL/numeric/scientific-data edit. Labels are short alphabetic navigation/tab labels, not general scientific prose. Class changes are simple existing tokens plus a bounded spacing/radius utility grammar; template expressions and arbitrary Tailwind values are not editable. JSX text nodes are not an automatic copy lane.

Strict patch JSON is `{baseSha, files:[{path,beforeSha256,content}]}`. No extra keys; 1..5 files, at most 32 KiB serialized JSON, conservative 200 changed-line limit. Files must already exist in a clean exact-base checkout. New/deleted/renamed/binary/symlink/executable-mode/untracked/staged/stale changes park. Trusted `git apply` uses fixed argv, stdin data, no shell. Actual bytes, modes, HEAD, and changed file set are rechecked after candidate commands and again independently by the publisher.

## Durable integration

Apply backend-owned `db/feedback/001-feedback.sql`, then additive `002-worker.sql`, explicitly with a migration role. No runtime migration or memory fallback exists.

`ports.ts` defines `WorkStore`, `Capability`, `Bundle`, and signed receipt types; `publisher.ts` defines `PublicationStore`. `PgWorkStore` implements both against the backend's structural `QueryDatabase` interface. The CLI imports the actual backend factory from a fixed file URL after integration. No backend schema edits are required.

The singleton control lock serializes intake/worker operations; one global hard-deadline lease has monotonically increasing fencing. Missing/invalid owner, policy, finite budgets, tokens, turns, wall limit, or max attempts blocks dispatch. Job version/approval and job/global fencing are rechecked before inference, on a 100 ms cancellation heartbeat, and before each publishing write. Expired jobs park for review rather than silently spending again. Maximum two reservations/attempts is an upper bound, **not** a promise of an automatic retry: unknown provider outcomes, bad patches, baseline failures, stale bases, and human conflicts do not auto-retry.

`worker_reservations` records the worst-case USD/token reservation **atomically before HTTP**, bounded by charged+reserved job/day totals, turns and tokens. Known uncached usage settles idempotently; unknown usage/network outcomes retain the full reservation. Outstanding money carries across midnight and prevents a misleading daily reset. An operator must reconcile ambiguous spending; no automatic refund. The strict provider usage decoder deliberately fails closed on unrecognized billing categories/cached usage instead of assuming their price.

`worker_bundles` persists immutable private signed bundles; `jobs.candidate_ref` is their content digest, not a public URL. Publication rows bind receipt/version/digest, expected head and commit. Deterministic tree/commit requests plus branch/commit/tree/PR readback reconcile crashes after each HTTP write. Candidate trees are compared against **every base-tree leaf**, not just allowed blobs. Unexpected heads, closed/non-draft/cross-repo PRs, changed main, and stale versions stop. Explicit newly approved follow-ups reuse the same draft/branch, use a non-force fast-forward update from the recorded head, and update approved prose. Merged/live follow-ups remain the backend's human-review lane.

A separate per-job publisher claim prevents concurrent publishers. Claims renew for at most 30 seconds; takeover waits an additional full 15-second HTTP timeout after expiry so an old write cannot remain in flight. Receipt/global hard expiry still wins; a late crash can therefore require human review rather than automatic recovery. GitHub's externally initiated writes cannot be recalled once in flight; kill control stops every subsequent write. Production must supervise a single reviewed publisher service and never reuse one instance UUID across concurrent processes.

## Fixed checks and required host isolation

Checks are fixed `/usr/local/bin/npm --ignore-scripts test`, `... run typecheck`, `... run build`, in baseline and candidate. Existing reviewed package scripts are unchanged by the patch policy. Test/typecheck use `NODE_ENV=test`; build uses `NODE_ENV=production`. Each process group has a hard timeout, cancellation kill, bounded output, no shell, and an explicit minimal environment: no storage/provider/publishing/OAuth/Basic tokens, broker/home, or credential helpers. Only neutral hashes of command output are retained. Baseline failure blocks publication; there are no implicit baseline exceptions. The **whole job** wall clock includes baseline + inference + candidate checks + handoff, and is bounded by the earlier configured worker maximum/global lease (at most 600 seconds); per-command timeouts are at most 300 seconds. An overlong real Atlas suite can therefore leave insufficient time for candidate checks and must cancel/park, never claim success or extend its lease. The local complete suite took about 120 seconds once; slower hosts (e.g. four-minute baseline and candidate suites) need explicitly chosen limits that still fit this ceiling, or must remain disabled pending a separately reviewed limit change.

**Host isolation remains an activation prerequisite, not an OS sandbox claimed by these Node functions.** Run unprivileged processes with restricted filesystem/network, read-only reviewed dependencies, no host/broker sockets, only the needed DB columns, fixed executable paths and reviewed supervisor code. `node_modules` in candidate worktrees is a symlink to the host's trusted dependency tree; mount it read-only. These tests exercise real subprocess stripping/timeouts, not a deployed container/network policy.

## Explicit runtime configuration (operator-only, no values checked in)

Shared role config: `FEEDBACK_DATABASE_URL` (different least-privilege role per process), `FEEDBACK_TRUSTED_REPOSITORY`, `FEEDBACK_DRAIN_MAX_JOBS` (1..10). Backend `control` must explicitly approve the owner, policy, job/day USD caps, token/turn/wall caps and max attempts (1..2).

Worker-only: `FEEDBACK_RECEIPT_PRIVATE_KEY` (Ed25519 PEM), `FEEDBACK_ANTHROPIC_API_KEY`, exact pinned `FEEDBACK_MODEL`, `FEEDBACK_MODEL_INPUT_USD_PER_MILLION`, `FEEDBACK_MODEL_OUTPUT_USD_PER_MILLION`, `FEEDBACK_MODEL_MAX_INPUT_TOKENS`, `FEEDBACK_MODEL_MAX_OUTPUT_TOKENS` (<=8192), `FEEDBACK_MODEL_MAX_BODY_BYTES` (<=131072), `FEEDBACK_MODEL_MAX_RESPONSE_BYTES` (<=262144), `FEEDBACK_MODEL_TIMEOUT_MS` (<=120000), `FEEDBACK_WORKER_MAX_WALL_MS` (<=600000). Prices must be operator-verified for that exact uncached model/billing mode; no default price/model exists. UTF-8 bytes plus a protocol allowance provide a conservative input-token bound before reserving.

Publisher-only: `FEEDBACK_RECEIPT_PUBLIC_KEY` (Ed25519 PEM) and broker-injected short-lived `FEEDBACK_GITHUB_INSTALLATION_TOKEN`, contents+pull_requests for this repo only. Never pass this environment to the worker/check subprocess. The provider and GitHub production origins are fixed; loopback HTTP injection is test-only and denied under production/Vercel.

The migrations create no accounts/grants. Before activation, provision reviewed column-limited DB roles: intake owns private input/auth; worker reads immutable public payload/control and mutates its jobs/accounting/bundles; publisher reads signed bundles/control and updates publication/claim/status fields. `SELECT j.*` currently requires all **job** columns, never `feedback.input_private`. Separate credentials alone do not implement those deployment grants.

## Verification and remaining activation gates

Local commands (no package installation):

```sh
# In the integrated tree, 001 exists at its normal path:
node --import tsx --test tests/feedback-worker*.test.mjs tests/feedback-publish*.test.mjs
npm run typecheck
# In the worker-only worktree, point at the actual backend-owned migration:
FEEDBACK_TEST_MIGRATION=/path/to/001-feedback.sql FEEDBACK_TEST_INTAKE_MODULE=/path/to/src/lib/feedback/intake.ts node --import tsx --test tests/feedback-worker*.test.mjs tests/feedback-publish*.test.mjs
```

Latest local verification: worker/publisher tests **31/31**; complete existing `npm test` suite **513/513**; `npm run typecheck` and `npm run build` passed. Approval-hash compatibility (absent, populated, and explicitly undefined optional context fields) is checked against the actual backend `publicApprovalHash` export, not a fabricated substitute. The worker-only verification supplies the backend migration/intake module through the two explicit test-only paths above.

Tests use real temporary Git repositories, actual PostCSS/TypeScript parsing, real npm child processes, disk-backed PostgreSQL-WASM/PGlite transactions/restarts using both real migrations, synthetic Anthropic/GitHub HTTP fixtures, signed immutable SQL outbox, budgets/unknown spend/fences, kill during inference, follow-up reuse, and crash-boundary reconciliation. Fixture success is **not** a real provider/App/preview acceptance run.

Before any live flow: owner approval for spending/activation; private PostgreSQL + grants/backups/retention; isolated worker/publisher services and egress policy; provider pricing/billing verification; broker-held App credentials and exact scopes; signing-key custody; emergency-stop drill; independent security review; real owner OAuth/intake → one actual draft PR → exact-SHA preview verification. No preview, merge, or live status is synthesized by this worker.
