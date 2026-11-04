# Opt-in Linear feedback intake

**Implemented, OFF by default; synthetic-provider verification only.** No database, new app, worker, paid inference, deployment, push, PR, merge, or live OAuth configuration is activated here. Existing PostgreSQL/GitHub mode is retained when `FEEDBACK_BACKEND` is unset or `postgres`. Selecting `linear` never falls back to PostgreSQL, memory persistence, or a credentialed CLI.

## Website configuration

Use server-only environment references; never put values in source, client bundles, logs, or this document:

- `FEEDBACK_ENABLED=true`, `FEEDBACK_BACKEND=linear`.
- `FEEDBACK_PUBLIC_ORIGIN`: the fixed production origin already used by Atlas. A preview origin is accepted **only** when `VERCEL_ENV=preview` and it is exactly `https://${VERCEL_BRANCH_URL}` using Vercel's trusted system environment. The branch value must be a literal lowercase DNS hostname with no scheme, port, wildcard, credentials, path, query, or fragment. Request Host/forwarded headers are never consulted. Production remains fixed; an arbitrary deployment URL is not authorized.
- `NEXT_PUBLIC_BASE_PATH` retains the mounted Atlas path. Callback: `${FEEDBACK_PUBLIC_ORIGIN}${NEXT_PUBLIC_BASE_PATH}/api/feedback/auth/callback`. An operator must verify the actual deployed preview and exact callback before registering it; this code does not establish a deployment or registration.
- `FEEDBACK_LINEAR_CLIENT_ID`: a dedicated public PKCE application; `FEEDBACK_LINEAR_CLIENT_SECRET` is optional. The existing operator/MCP connection is not a website credential.
- Exact operator-owned allowlists: `FEEDBACK_LINEAR_OWNER_ID`, `FEEDBACK_LINEAR_WORKSPACE_ID`, `FEEDBACK_LINEAR_WORKSPACE_KEY`, `FEEDBACK_LINEAR_PROJECT_ID`, `FEEDBACK_LINEAR_TEAM_ID`. UUIDs must be lowercase; no normalization or caller-supplied identities.
- `FEEDBACK_LINEAR_SESSION_KEY`: a broker-managed 32-byte key encoded as canonical base64url. It seals short sessions and derives a domain-separated private-record signing key. Rotating it invalidates sessions **and** historical record verification; plan an explicit verified migration/key-retention design before rotation. Do not simply replace it for an active catalogue.
- `FEEDBACK_LINEAR_SYNC_AUDIT=ordinary-comments-isolated-v1`: an operator attestation after auditing actual GitHub sync/linkbacks, notifications, and ordinary comment visibility. This is a required gate, **not** an automated proof. Never enable two-way issue sync. Keep outward-safe descriptions even when no repositories are linked. Public-team GitHub linkbacks may copy descriptions and images.

Tests alone may use `FEEDBACK_TEST_MODE=true` with `NODE_ENV=test`, no Vercel environment, and an exact loopback origin. Provider HTTP overrides are test-only, restricted to loopback (the authorize URL may remain the fixed public Linear authorize URL, without navigating there). There are no environment-configurable production provider endpoints.

`GET /config` exposes only availability, provider, and policy. `connected` means configuration was admitted, not that a live owner/provider roundtrip or Slack delivery succeeded.

## Identity and transport

The browser opens a popup synchronously from the sign-in gesture and keeps state, S256 verifier, opaque transaction proof, and sealed session in page memory only. It validates popup origin/source/state, consumes the callback once, validates fixed provider URL/scopes, and preserves the popup-close versus in-flight finish race. No feedback cookies or browser storage. Existing mounted Basic Auth owns `Authorization`; feedback uses only `X-Atlas-Feedback-Session`. Basic Auth and noindex rules are unchanged.

Linear endpoints are fixed: `https://linear.app/oauth/authorize`, `https://api.linear.app/oauth/token`, `/oauth/revoke`, and `/graphql`. Requested and granted scopes must be exactly `read,issues:create,comments:create`, with `actor=user`; broader grants fail closed. Public PKCE is supported without a secret. The server's AES-256-GCM transaction proof binds original state, challenge, canonical origin, and five-minute expiry; the upstream consumes each authorization code once. Unlike legacy database transactions, invalid attempts do not consume a stateless proof, but they cannot exchange a code without its bound verifier.

The access token is sealed with actor/workspace/issued/expiry data for at most 15 minutes or the shorter upstream lifetime. Raw access/refresh tokens never reach browser responses; refresh tokens are discarded. Every protected request freshly verifies viewer, active/non-guest owner, workspace ID/key, project/team access, and team workspace. Logout revokes upstream and verifies subsequent authentication refusal before 204. Disposal and late finish attempt best-effort revocation without restoring memory; transport loss/unload cannot guarantee delivery of that request. Expired sealed sessions cannot authorize intake even if the upstream token outlives the page session.

Requests enforce exact origin/fetch metadata, strict JSON schemas, streaming byte limits (4 KiB auth; 16 KiB intake), no redirects, bounded upstream bytes/time, generic errors, no CORS grants, no-store/no-referrer/noindex/nosniff. This lane does **not** reproduce the legacy database's durable global minute-rate counters; provider/hosting rate enforcement remains an activation prerequisite, not an in-memory persistence substitute.

## One field, structural context, and privacy

The picker and compact composer are unchanged. Linear mode changes only sign-in labeling, processing disclosure, and `atlas-feedback-linear-v1`. The older PostgreSQL/model schemas reject that policy; the Linear lane rejects legacy policies, public-task fields, unknown keys, screenshots, page text capture, arbitrary DOM attributes/IDs, and malformed structural selectors. Existing structural limits remain shared with the old validator.

The disclosure names Linear members with issue access and the designated private review channel. Ordinary comments are **not encrypted or private from Linear workspace members who can read the issue**. “Private” below distinguishes them from outward/public GitHub metadata, not a narrower Linear ACL.

- Issue ID is the caller's exact lowercase UUIDv4 operation key, passed to actual `IssueCreateInput.id`.
- Issue title and description are fixed server-owned prose plus a marker binding only random issue ID/project/team. No private note, element metadata, input hash, signature, image, asset URL, or arbitrary user prose enters the public envelope. Default team templates are explicitly disabled.
- Input exists only in HMAC-signed JSON in a **top-level ordinary non-synced comment**. Creation explicitly sets `createOnSyncedSlackThread:false`; reads reject external threads, synced entities, replies, another author, archival, malformed records, and invalid signatures.
- Read back the exact managed issue and full signed comment chain before 202. Duplicate/ambiguous writes reconcile by reading the exact identities, not by trusting a successful mutation response. Receipts/status/list contain only ID, received/version, fixed reason, and signed dates—never private content or unverified PR/preview/progress.
- Follow-up comment UUID is SHA-256 of `atlas-linear-private-v1:comment:<root>:<nextVersion>`, truncated to 16 bytes with UUIDv4 variant/version bits. Native uniqueness arbitrates concurrent next-version creation without a local lock/database. Identical operation/input retries succeed, including after later versions; changed input/operation, stale version, reused operation, gaps, or unverifiable history fail closed.

### Private controller seam

`src/lib/feedback-linear/contracts.ts` remains unchanged. Server helpers in `server/records.ts` export `linearInputSchema`, `verifyPrivateRecord`, `parsePrivateComment`, `privateRecordHash`, `requestHash`, `managedCommentId`, and canonical serialization. Reuse them rather than inventing another wire format.

The ordinary comment body is exactly:

````text
atlas-linear-private-v1
```json
<canonical signed LinearFeedbackPrivateRecord JSON>
```
````

Canonical JSON recursively sorts object keys, omits undefined optional members, and retains array order. `requestHash` is SHA-256 of canonical `{feedbackId,version,operationId,input}`. `previousRecordHash` is SHA-256 of the preceding complete signed record. HMAC-SHA256 signs all strict record fields except `signature`, using a key derived by HMAC-SHA256 of the 32-byte session key over purpose `atlas-linear-private-v1`. Signatures are lowercase hex. Unknown record fields/policies and noncontiguous/hash-mismatched chains are rejected. Reading is bounded to 1,000 comments/versions; overflow, malformed cursors, duplicate IDs, and incomplete pagination fail closed.

The website does not interpret human approval, model prose, arbitrary Linear status, or a frontend boolean as authority to prepare/publish. The separate private controller owns candidate preparation, matched actual images, channel approval, and draft-only publication. Intake never starts it and reports only `received`.

## Exact unresolved architecture/activation boundaries

1. **Deleted-tail detection is not provable from a stateless surviving comment chain.** If the final signed record disappears entirely, the remaining valid prefix is indistinguishable from an earlier legitimate state. Interior/root gaps and observed archived/tampered records are rejected; a complete lost suffix cannot be discovered without an independent monotonic head/tombstone witness. Native unique-row CAS also requires proof that deleted UUIDs cannot be reused. The synthetic peer reserves IDs after deletion, but that is **not evidence** of live Linear deletion semantics. Do not claim full deleted-history protection or activate until the operator/controller supplies a verified monotonic witness or the architecture is revised. Parent review must resolve this contract gap.
2. If an issue exists after a partial create but **no initial private comment has ever been saved**, there is deliberately no private request digest in the public issue. The first successfully saved initial private comment becomes canonical. The client freezes uncertain retry bytes; after any saved private record, a changed body conflicts. Binding a lost, never-saved private body would require another private durable witness. No 202 is returned for issue-only persistence.
3. Live dedicated OAuth client/admin configuration, exact deployed preview callback/owner roundtrip, scope/native UUID/CAS/deletion behavior, private comment visibility and linkback audit, and actual private-channel delivery remain operator acceptance gates. The code/config attestation does not prove them.
4. No durable distributed app rate counter, separate approval/status protocol, model/account/cap configuration, unattended execution, native worker, paid service, or end-to-end public draft PR is supplied or activated by this intake change.

## Executable verification

```sh
node --import tsx --test tests/feedback-linear-*.test.mjs
npm test
npm run typecheck
npm run build
./node_modules/.bin/eslint src/lib/feedback-linear/server src/lib/feedback-client.ts src/lib/feedback/contracts.ts src/lib/feedback/runtime.ts src/components/feedback/feedback.tsx tests/feedback-linear-*.test.mjs
npm audit --omit=dev
```

New tests run actual HTTP handlers and synthetic persisted-in-peer GraphQL/OAuth operations: PKCE, code replay, exact identity/scope allowlists, sealed expiry, upstream revocation/readback, custom header/Basic namespace, partial writes, exact retries, concurrent follow-up CAS, tampering/sync/gaps, safe public envelopes, policy/structural rejection, request byte limits, actual Next factory selection, strict preview-origin matching, the browser disposal race, and the one-field React label/disclosure/policy. Provider fixtures are synthetic; React/JSDOM is not native desktop/mobile or a real signed-in popup acceptance. Full Atlas native viewport/hosted/owner acceptance and independent exact-head review belong to parent integration.

References read during implementation: [Linear OAuth/PKCE](https://linear.app/developers/oauth-2-0-authentication), [GraphQL API](https://linear.app/developers/graphql), and the [public Linear schema](https://github.com/linear/linear/blob/master/packages/sdk/src/schema.graphql). These references and executable synthetic peers do not replace live acceptance.
