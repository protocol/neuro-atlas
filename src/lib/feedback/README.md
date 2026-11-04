# Private feedback API (disabled until configured)

This code implements intake/authentication only. It does **not** provision or activate OAuth, PostgreSQL, a worker, a GitHub App, paid inference, a PR, or a deployment. A local fixture is not a live end-to-end acceptance receipt.

## Server environment

All fields are server-only; never put secrets in `NEXT_PUBLIC_*`.

- `FEEDBACK_ENABLED=true` (otherwise no storage connection is constructed)
- `FEEDBACK_PUBLIC_ORIGIN=https://www.plneuro.xyz` (exact origin, no trailing slash)
- `FEEDBACK_GITHUB_CLIENT_ID`, `FEEDBACK_GITHUB_CLIENT_SECRET`
- `FEEDBACK_OWNER_GITHUB_ID=82394590` (required, not inferred from login/Basic auth)
- `FEEDBACK_DATABASE_URL=postgresql://…` (private PostgreSQL, production adapter is `pg`)
- `NEXT_PUBLIC_BASE_PATH=/neuro-atlas` (the existing non-secret build-time mount setting)

Register the exact OAuth callback `https://www.plneuro.xyz/neuro-atlas/api/feedback/auth/callback`; no repository/email scopes are requested. Requests never derive trust/redirects from Host or forwarded headers. Tests may set `FEEDBACK_TEST_MODE=true` **and** `NODE_ENV=test` with neither Vercel flag, selecting a loopback origin and injection-only loopback OAuth fixture URLs. There is no environment-variable provider URL override.

`getFeedbackRuntime()` in `runtime.ts` constructs the `pg` pool lazily, never during module import/build. Run `db/feedback/001-feedback.sql` explicitly as a migration operator; requests do not create tables or fall back to process memory/local files. Config health reports only safe booleans (intake availability/storage schema), not worker readiness or secret diagnostics.

## Request/security contract

Use `contracts.ts` for browser-safe DTOs. Send the ephemeral session only in `X-Atlas-Feedback-Session`, never Authorization (owned by the unchanged Basic gate). There are no feedback cookies or browser persistence. All responses are private/no-store, no-referrer, noindex/nofollow, nosniff; no CORS grant is emitted. OAuth start/finish accept at most 4 KiB JSON; intake/followup accept at most 16 KiB with a bounded streaming reader independent of Content-Length. Strict recursive Zod objects reject unknown fields, screenshots, DOM/selectors and user-supplied identity/repository/URLs. Curated target/chart/scenario allowlists are exported from contracts; the UI must use those exact IDs.

The client holds state and S256 verifier in memory. A five-minute DB transaction stores the state hash and challenge only; finish atomically consumes it **before** checking PKCE/exchanging the code. Failure consumes the transaction. Server calls the fixed GitHub token and `/user` endpoints with timeout, response-byte bounds and redirect refusal. Numeric owner ID—not client/display login—is verified. The provider token is never persisted or returned. Sessions are random 32-byte capabilities, hashed in DB, expire absolutely after 15 minutes, and revoke by DELETE. Callback HTML contains code/state only, encoded JSON, nonce CSP, and an exact-origin opener message; it has no external assets, session or polling endpoint.

Mutations require exact configured Origin; reads reject an incorrect Origin when present (same-origin GET fetch normally omits it). Cross-site fetch metadata is rejected, except callback navigation from GitHub. Identity is independently enforced on every sensitive handler. Durable fixed-minute global rate gates: start20/finish20/callback60; owner writes30 and reads120 per minute. These limits are intentionally conservative and are not per-client IP heuristics. Return safe generic provider/SQL failures; do not enable request-body/query-string/access-token logging on hosting, proxy or APM layers.

## Storage/worker seam

`database.ts` exports `QueryDatabase.query<Row>(sql,params?)` and `transaction(fn)` plus `createFeedbackDatabase(connectionString)` (also `close()`). Tests inject PGlite through this exact structural seam and execute the real PostgreSQL SQL/migration, transactions, triggers, constraints and restart persistence.

The dedicated `atlas_feedback` schema has auth_transactions, sessions, feedback, idempotency, jobs, append-only events, singleton control, publications, and shared rate_limits. `feedback.input_private` contains only `{privateComment}`; **never SELECT it into a worker, model, publisher, public receipt or status**. Jobs hold immutable public snapshots only:

```
{feedbackId,inputVersion,approvalHash,publicTask,publicContext}
```

`publicApprovalHash(input)` in `intake.ts` is SHA-256 hex over recursively key-sorted JSON `{policyVersion,publicTask,publicContext}`; all reviewed context is bound, arrays retain order, private comment is excluded. Use this function rather than a different serialization in the supervisor. The approval hash does not prove safe output: the worker's deterministic patch validator remains required.

Intake locks singleton control, commits the feedback, job, idempotency receipt and event together, then returns 202. Same owner/operation/UUID key + same canonical request returns the original receipt even after later followups; a changed request returns409. Followup operation is `followup:<lowercase-feedback-uuid>`; malformed uppercase ID variants are rejected rather than silently normalized. Followups additionally lock and check expectedVersion, cancel/fence old active jobs and matching global lease, increment input version and atomically save the new public snapshot. Merged/live records park for human review.

Control initializes `enabled=false`, missing positive hard limits remain NULL, and allowed_owner_id is unset. Without the complete enabled/owner/policy/finite-positive budget-limit set, intake saves `received` with `automation_disabled` and a pending job, never `working`. With complete admission config it may save `queued`, not working. Worker MUST separately validate limits/pricing, reserve spending atomically, check input/approval/version, acquire the global lease/fence, and honor kill switch at every sensitive boundary. Backend does not implement worker spending or publication.

Status selects explicit safe columns and constructs fixed-repository PR URLs only from DB number/head SHA. It does not expose arbitrary preview URLs: an exact-project deployment evidence reader/allowlist is not configured in this backend. A no-preview status is intentional, not fake success. The publisher/worker must independently verify merged/live SHA evidence before writing those fields.

## Activation/operator prerequisites

Private managed PostgreSQL access/network restrictions, encrypted storage/backups, role/column grants and a backup/restore drill are operator work, not implemented provisioning. The migration does not create roles; give the intake/worker/publisher separate least-privilege credentials, never the broad database URL to a model/test subprocess. Select and automate retention (target private input/candidates30 days after terminal; promptly remove expired auth and old minute rate buckets; retain idempotency/publication metadata to prevent duplicate work). No screenshot/upload support exists.

Before activation, verify the real GitHub popup/opener roundtrip through unchanged Basic auth and cookie-stripping mount, custom session-header forwarding, provider authorization, private DB durability and worker/publisher isolation. Separately configure and test hard budgets/kill switch, repo-scoped publisher permissions, signed receipts and exact deployment evidence. Parent integration/security/native review and an explicitly authorized real owner submission → one actual draft PR → exact SHA preview are still required.

## Local verification

`node --import tsx --test tests/feedback-api.test.mjs tests/feedback-storage.test.mjs` uses only genuine PGlite and loopback HTTP fixtures (synthetic GitHub identities/tokens), including durable filesystem restart, concurrent dedup/followup fencing, rollback, private-canary exclusion, replay/PKCE/expiry/nonowner/provider failure, unknown fields/origin/stream limits, shared rate limits and disabled configuration. No live credentials, paid provider calls, external resources or external writes are used.
