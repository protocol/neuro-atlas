# Independent intake history witness (disabled until deployment acceptance)

This implementation closes **source-only signed-prefix rollback**, not compromise of its own trusted host. No public route, listener, credentials, hosted database, production environment, service, or scheduler is installed by these modules. The legacy PostgreSQL lane is unchanged. Existing controller/HOST admission wiring belongs to the integrating controller change.

## Trust and data

The witness runs on an existing private persistent host volume, outside Linear's deletion authority and outside the website's ephemeral filesystem. Its dedicated service UID and root/ancestors must be trusted against replacement, journal deletion, backup rollback, and other same-UID writers. File hash links catch corrupt/interior/missing events, but **cannot prove that a privileged operator did not delete its own valid journal suffix or restore an old whole-volume snapshot**. Do not claim hardware monotonicity, OS sandboxing, or adversarial-host protection. Backups/recovery must preserve witnessed identities; never reset the store to make an old prefix pass.

Only fixed scope IDs, random feedback/operation IDs, version, canonical signed-record time, request digest, previous-record digest, full signed-record digest, and irreversible reservation/effect/commit events are stored. There is no raw feedback, element context, signed comment body, signing/sealing key, OAuth token, or HTTP bearer in journal files. The digests are private metadata, not public issue fields.

## Exact host API

```ts
import {FileIntakeWitness} from '../scripts/feedback-linear/witness-store';

const witness = new FileIntakeWitness({root: acceptedAbsolutePrivatePath, scope: {
  workspaceId, projectId, teamId, ownerId,
}});
await witness.assertAvailable(); // NEVER initializes a missing store
await witness.assertLatest(fullCryptographicallyValidatedRecords);
```

The concrete instance exposes frozen `readonly scope`, `identity === 'atlas-intake-witness-v1'`, and `policyDigest`, which is SHA-256 of canonical `{protocol:'atlas-intake-witness-v1',scope}`. Parent must match all four configured scope IDs, require this actual class rather than a boolean/caller-input attestation, validate native source provenance/signatures/full-chain first, and compare **the whole validated chain** at every current-input revalidation. `assertLatest` requires exactly the same number of rows, matching every version, operation, request digest, previous digest, timestamp, full canonical record hash and owner, with every row committed. Unknown identities, reserved tails, deletion, altered bytes, corrupt/missing state and locks all block. A valid old prefix never suffices. `assertAvailable` validates store format/scope/permissions, not whether a particular feedback's pending operation is resolved; `assertLatest` supplies that gate.

`initialize()` is a separate, explicit new-store operation for accepted setup/tests. It accepts only an empty private root, with an existing non-symlink parent, and cannot reset an initialized store. Neither constructor nor HTTP requests initialize. Additional host methods:

- `read(feedbackId): Promise<WitnessRow[]>`: immutable canonical operation metadata and `state: 'reserved' | 'committed'`, plus optional `effects: ('issue'|'comment')[]`.
- `identities(): Promise<string[]>`: sorted full identity inventory, including unresolved reservations and identities whose source issue was deleted. Website list reconciles every identity before applying its requested result limit.
- `reserve(operation)`: CAS append after exactly the committed predecessor. Operation binds `feedbackId`, `operationId`, `version`, `requestHash`, optional `previousRecordHash`, `createdAt`, `recordHash`. Duplicate same immutable request identity returns its **original** canonical operation/time/hash; it never updates them. Server-generated alternative retry timestamps are discarded, and website re-signs from the returned original time and checks the full hash. Changed request/operation/predecessor or stale/reused version conflicts.
- `claimEffect(operation, 'issue'|'comment'): Promise<boolean>`: persists intent **before** the corresponding Linear mutation. Exactly one first claim returns true. Later claims return false; a lost claim response therefore parks, never authorizes an uncertain replay.
- `complete(operation)`: exact full metadata CAS, called by the trusted website intake only after actual managed issue and full validated record readback, including exact full signed-record hash. Exact repeat completion is idempotent. No cancel, forget, delete, unreserve or attestation endpoint exists.

## Website behavior

Production create/followup/status/list requires an available independent witness. Missing/unreachable/mis-scoped/corrupt/locked witness blocks; there is no in-memory fallback. Only the existing **explicit isolated loopback** test-mode configuration can retain the old unwitnessed fixture behavior. A configured witness failing in a fixture is not ignored.

Initial submission generates its canonical signed-record timestamp before Linear issue creation and reserves its digest before **any** Linear mutation. It never depends on the unknown provider issue timestamp. Followup checks the full committed prefix and reserves the next exact operation before its comment mutation. Both mutations have their own one-shot durable effect claim. Comments retain the existing managed deterministic identity and strict ordinary/non-synced provenance check; all public issue prose and status remain generic.

- Exact committed retries freshly read/validate the whole source and witness, then return the original receipt with no mutation, including an older identical operation after later committed versions.
- A reservation with no effect claim may resume the same frozen canonical request after restart. A partial initial issue whose exact issue is present may advance to a **never-attempted** comment effect.
- Once an effect was claimed, absence of its exact source readback is **unknown**, not proof it failed. The operation remains reserved and blocks worker/status/list. Retrying may re-read and complete an exact now-visible record but **never repeats the uncertain mutation**. Even an apparent provider error is not authority to undo a claim. This intentionally favors a durable human-recovery hold over automatic retries.
- A committed issue deleted wholesale is never recreated on UUID reuse. A committed deleted tail is never recreated. A correction created and deleted between worker polls still left an independent reservation/commit and blocks the older prefix.
- Success/202 is returned only after exact actual record readback and durable completion. A successful mutation response alone, a matching request hash with different signed time/bytes, or a later source prefix is insufficient.
- Status validates its entire chain. List verifies all bounded source pages and **all witnessed IDs**, including missing issues and unresolved initial reservations, before returning a limited list. Unknown source identities are not silently imported. Existing pagination bounds remain fail-closed.

## Bounded authenticated HTTP seam (no listener installed)

`createWitnessHttpHandler({witness, readToken, writeToken})` in `scripts/feedback-linear/witness-http.ts` returns a Node `IncomingMessage`/`ServerResponse` handler. Tests attach it only to a task-owned `127.0.0.1:0` server. Production still needs an accepted private authenticated HTTPS ingress and service/isolation configuration. The handler is **not** a Next public route and does not call `listen()`.

The server-only website `createHttpIntakeWitness({url, token, scope, testMode?})` uses exact `POST /v1/intake-witness`, bearer authorization, strict JSON, no caching, no redirects, no cookies and no CORS grants. The token must be opaque base64url-shaped 43–128 characters. Two distinct broker-held tokens are supplied to the handler: read can call available/read/inventory only; write can also reserve/claim/complete. HTTP request schemas always include the fixed `policyDigest` and reject unknown keys.

Actions: `available`, `read` (+ feedbackId), `inventory`, `reserve`/`complete` (+ operation), `claim` (+ operation + effect). Success: `{identity,policyDigest,rows,...(claim?{claimed}:{}),...(inventory?{identities}:{})}`. Responses never echo bearer tokens or raw feedback. Request bytes max 4 KiB; response max 512 KiB (including streaming); client total request/body deadline and server request-body deadline 3 seconds. No compression is accepted. Mutation conflict is 409; authentication/scope/role refusal is 403; malformed input is 400; oversize/wrong body transport is 413; missing/locked/corrupt/unknown durability is 503. Transient lock contention returns unavailable, not success; callers may retry reads/exact submissions. Connections close after response, including early refusal. An embedding server/ingress must additionally bound pre-handler headers/connections and supply TLS, rate limits and accepted identity/key custody.

Environment **names only**: `FEEDBACK_LINEAR_WITNESS_URL` and `FEEDBACK_LINEAR_WITNESS_TOKEN`. They are optional as a pair at config parsing for backward config discovery compatibility; missing means the four production data operations are blocked. Invalid/half-paired settings reject configuration. URL must be canonical HTTPS, exact path, no embedded credential/query/fragment. HTTP is allowed only in explicitly isolated loopback fixtures. Nothing here configures those variables or provisions an ingress. The `/config` connected field retains its existing configuration-admission meaning, not a source/witness roundtrip attestation.

## Filesystem durability

Each event is appended as a never-overwritten numbered JSON file, linked by sequence/previous digest. Under one exclusive `mkdir('.lock')` across **reads and writes**, replay verifies full scope, contiguous history, state transitions and bounds. No timed stale-lock takeover exists. Mutation locks are directory-fsynced before state changes; a new event uses `O_CREAT|O_EXCL|O_NOFOLLOW`, mode 0600, full file write/fsync/close, atomic rename, then directory fsync before return. A write/fsync uncertainty retains the stop lock. Temporary crash debris, unexpected names, gaps or an orphan lock block reads and writes pending explicit trusted recovery. Reads have no implicit reset behavior. Limits are 1,000 versions per identity, 10,000 journal events total, 8 KiB per file; capacity exhaustion blocks new writes, never truncates history.

Root is a realpath-equal, non-symlink, service-UID-owned 0700 directory; files are opened no-follow and fstat-checked as service-UID-owned regular 0600 files with one link and bounded size. Initialization checks the parent before creating a root, rejecting ancestor symlinks without writing through them. A dedicated trusted filesystem supporting atomic same-directory rename and real file/directory fsync is required; do not put this on an unverified distributed/object filesystem.

## Verification and remaining activation work

Witness tests run actual filesystem journals/restarts, independent Node processes for CAS, real loopback HTTP/OAuth/Linear peers, source deletion/partial/timestamp-stable exact retries, no resurrection, scope/permissions/symlink/hardlink/lock/partial/corrupt/gap failures, instrumented real filesystem interleaving and post-rename fsync failure, authenticated role isolation, redirect refusal, streamed overflow, and stalled-body timeout. Provider identities/effects are synthetic; this is not a live-account acceptance.

```sh
node --import tsx --test --test-concurrency=1 tests/feedback-linear-witness-*.test.mjs tests/feedback-linear-server.test.mjs tests/feedback-linear-auth.test.mjs
npm run typecheck
./node_modules/.bin/eslint src/lib/feedback-linear/server/witness*.ts src/lib/feedback-linear/server/config.ts src/lib/feedback-linear/server/intake.ts scripts/feedback-linear/witness*.ts tests/feedback-linear-witness*.test.mjs
```

Parent serializes final whole-suite/build and independent review. Still unconfigured/unaccepted: trusted durable root/service UID/backup recovery, isolation/egress guarantees, host HTTPS ingress, broker-managed website write/read key custody, fixed deployed scope/URL, owner PKCE/admin registration, native provenance support, real owner submission/correction/deletion/recovery/approval acceptance, and other model/publisher/scheduler gates. Existing source-only histories cannot be silently seeded or declared complete; an explicit separately accepted migration is required. Route stays OFF until accepted.
