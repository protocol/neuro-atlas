# Visitor feedback → Linear (logging only)

Every visitor who can access Atlas can send feedback **without a Linear or GitHub account/sign-in**. Existing site Basic Auth/noindex remains unchanged. The mounted UI is the existing single-field anchored composer and structural hover/click picker; there is no public feedback list, history, owner identity, model, proposal automation, PR or deployment promise.

## Operator configuration

- `FEEDBACK_PUBLIC_INTAKE_ENABLED=true` — dedicated server-only switch; unset/anything else disables this intake.
- `FEEDBACK_LINEAR_API_KEY` — server-only environment secret. Never `NEXT_PUBLIC_*`, a browser value, a response, a log or a repository file. Use a dedicated restricted personal key with Read + Create/update issues and only the PL-R&D team. No visitor credential is requested.
- Keep legacy `FEEDBACK_ENABLED`, `FEEDBACK_WORKER_ENABLED` and `FEEDBACK_PUBLISHER_ENABLED` unset/false. This public intake does not use their OAuth/database/worker/publisher machinery or remove human review controls.
- Preserve the existing nonsecret `NEXT_PUBLIC_BASE_PATH=/neuro-atlas` mount setting.

No backend key or dedicated switch means no Linear request; config exposes only `{enabled, connected}` booleans. `connected` means the required server configuration is present, not that a health check or save succeeded. Failures never clear the draft or claim a save. Environment changes require the host's normal redeploy/restart; there is no configuration endpoint.

Fixed, parent-verified Nov. 10, 2026 target (not visitor/env-selectable):

| Field | Value |
| --- | --- |
| Team | PL-R&D — `4e2891ec-4382-46ca-8f2d-bfb3a1c00304` |
| Project | Neuro Atlas — `18f2619a-8795-4767-9806-e171a02fd1ca` |
| State | Backlog — `75d31d77-99fb-46dd-99d4-4bf68392bb53` |
| Priority / assignee | `0` / `null` |
| Default template / labels / subscribers | `false` / `[]` / `[]` |

Backlog logs the note for later human queueing; it is not active work or approval to process it. PL-R&D remains workspace-visible, not project-private. The composer omits the helper paragraph at the owner's request; this copy-only change does not alter storage, visibility or processing behavior.

## API and privacy contract

- `GET /neuro-atlas/api/feedback/public/config`: booleans only. `POST /neuro-atlas/api/feedback/public`: create/reconcile exactly one issue. No public read/list/history, arbitrary ID lookup, provider URL, GraphQL proxy or update endpoint. Legacy authenticated paths remain separate and unchanged.
- POST requires the exact production `Origin: https://www.plneuro.xyz`; wrong/missing/null origins and cross-/same-site fetch metadata are rejected. GET rejects a wrong Origin when supplied. No CORS grant or feedback cookies. The browser preserves same-origin credentials for the existing site Basic gate; this does not add visitor identity.
- Strict JSON `{feedback, context}`; unknown fields rejected recursively. Feedback is 1–3000 characters with existing control-character restrictions; request body max 16 KiB, enforced while streaming regardless of Content-Length. Context uses existing route/chart/scenario allowlists, bounded viewport/theme/revision and optional bounded structural element selector/tag/role/classes. No DOM text/HTML/input values, local chip label, screenshot/upload, query/fragment or arbitrary URL is captured.
- Title is fixed. Note and structural context are separate literal fenced blocks, with a fence longer than every backtick run in the value. Arbitrary instructions, mentions and URLs stay inert text, not commands, author identity or public GitHub metadata. A real native MCP storage probe (PLR-108, parent-run) established Linear's blank line before each fence; formatter emits that canonical shape. Full description comparison remains exact, including interior bytes.
- Fixed `POST https://api.linear.app/graphql`, personal-key `Authorization: <API_KEY>` (no Bearer), `redirect: error`, no-store, a 12-second whole-operation deadline and 48 KiB streamed provider-response limit. HTTP errors, GraphQL errors even on HTTP 200, malformed results and transport errors are not raw response/error prose. All app responses use private/no-store, no-referrer, noindex/nofollow and nosniff.
- Per-instance best-effort protection: burst 30, one token replenished per 2 seconds, at most four in-flight submissions, bounded scalars rather than unbounded IP/client maps; `429` supplies a 2-second Retry-After. This is **not distributed/global abuse prevention** or a user identity guarantee. Hosting must not log request bodies, API keys or raw upstream responses.

Only explicit local test mode may replace the origin: `NODE_ENV=test`, `FEEDBACK_PUBLIC_INTAKE_TEST_MODE=true`, `FEEDBACK_PUBLIC_INTAKE_TEST_ORIGIN=http://127.0.0.1:<port>` (or IPv6 loopback), with neither Vercel flag. No environment variable can change the provider endpoint or target. Fetch injection is an in-process test seam, not runtime configuration.

## Retry identity and confirmation

The client generates a random UUID v4 and retains it with the complete input snapshot while a save is uncertain. Closing/reopening, viewport/theme/DOM movement and connection retry do not mutate it. An intentional note/target edit starts a new operation. No automatic retry loop exists; duplicate click/Enter is fenced while busy.

A domain-separated SHA-256 digest of that random request key produces a deterministic UUID with Linear's required v4 bits. The backend queries that exact ID in the fixed team/project before any create. Absent records get at most one create attempt, with explicit fields. Success is returned **only after independent exact source readback** of ID, title, entire description, team/project/Backlog, priority and assignee. Lost/duplicate/error mutation responses reconcile once with the same ID, never a fresh create identity. Same key with a different payload returns conflict, never overwrites or confirms the other note. A server restart/another instance still finds the same issue; existing records manually changed or moved fail closed rather than being overwritten.

The browser receives only `202 {saved:true}`, no issue body, ID, URL or other visitor's history. Only that exact receipt clears the note/selection and shows “Logged in Linear.” Draft and retry identity are page-memory only; reload/navigation that unmounts the page loses them. No sensitive browser persistence or new hosted database was added.

Official schema verification: [`@linear/sdk` 101.1.0](https://registry.npmjs.org/@linear/sdk/101.1.0) `IssueCreateInput.id` explicitly accepts a UUID v4 string; `IssueFilter.id` uses `IssueIdComparator.eq: ID`. [Official GraphQL docs](https://linear.app/developers/graphql) specify personal-key transport and HTTP-200 GraphQL errors. The implementation does not add the SDK dependency.

## Local verification and release boundary

```sh
node --import tsx --test tests/feedback-public-*.test.mjs tests/feedback-ui-*.test.mjs tests/feedback-simple-contract.test.mjs tests/feedback-context-contract.test.mjs
npm run typecheck
npx --no-install eslint src/lib/feedback-public src/lib/feedback-public-client.ts src/components/feedback/feedback.tsx src/app/api/feedback/public tests/feedback-public-*.test.mjs tests/feedback-ui-overlay.test.mjs tests/feedback-ui-followup-context.test.mjs scripts/qa/feedback-synthetic-transport.js scripts/qa/feedback-ui-fixture.mjs
git diff --check
```

Tests use explicitly synthetic Linear peers (including real loopback HTTP), component DOM and transport fixtures; no actual credential/provider call is required. An actual browser bundle is compiled in memory and checked for secret/backend-scope/legacy-OAuth exclusion. Existing picker/focus/Escape/IME/retry/viewport/mobile contracts remain covered. Native replay helpers now use public transport only; their actual browser execution, full standard suite/build/audit, independent review, native Linear acceptance and exact-head release are parent integration gates. This implementation itself neither pushes, deploys nor enables a flag/key/service.
