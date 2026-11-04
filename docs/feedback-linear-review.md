# Private Linear feedback preparation → human review → draft PR

**Implementation only; off by default.** No account, key, paid plan, model request, scheduler, webhook, push, PR, merge, deployment, or live capture is enabled by these files. Linear remains the feedback/review record. The private host stores only execution artifacts, receipts, claims and spending; it is not a replacement feedback catalogue or a new hosted database.

## Executable path

`ReviewController` in `scripts/feedback-linear/controller.ts` implements:

1. `prepare()` verifies the website's HMAC-signed private record chain **and** a fresh HOST-attested native read. It checks configured owner/workspace/project/team, issue ID, exact Linear origin/workspace/identifier URL, contiguous versions, previous-record hashes, operation/request hashes, consent policy and bounded structural input.
2. In a detached private checkout of current remote `protocol/neuro-atlas` `main`, it calls the existing `loadSnapshot`, `runTrustedChecks`, `AnthropicModel`, `validatePatch(..., 'css-only')`, `applyValidatedPatch` and `verifyAppliedPatch`. It runs real trusted baseline and candidate test/typecheck/build subprocesses. There is no general command-capable patch producer, model tool, new dependency, fallback database, or public execution route.
3. It reserves worst-case spending durably **before** provider HTTP. Known billing settles once; unknown billing retains the full reservation. A failed/unknown preparation parks and cannot spend again automatically. Job/day dollar limits and per-request token/wall limits must be explicit positive operator configuration. Outstanding reservations count across midnight.
4. The checked candidate is persisted privately, content-addressed, with exact input record hash/version, base, patch, source/check digests, revision and expiry. It is not pushed and has no PR. `capturePlan(id)` returns `{candidate,candidateDigest}` only while `awaiting_capture`, under the same host lock and fresh input/main/source validation.
5. `attachCapture(id, signedReceipt, beforePng, afterPng)` requires the separately trusted parent browser capture adapter. It checks the exact candidate/base/patch/checks/revision, route/theme/viewport, PNG dimensions and both actual byte digests. Identical before/after PNG byte digests are rejected; genuine visual/pixel differences must also be checked by the trusted capture adapter. Both images and the signed receipt are copied into private content-addressed files. Only then does it create the exact channel-bound proposal digest.
6. `delivered(id, signedReceipt)` accepts only a HOST receipt for genuine paired-image delivery/readback in the configured private thread plus a private Linear proposal-comment readback. `decide(id, signedReceipt)` accepts only a fresh, HOST-authenticated human action from an allowlisted reviewer, exact channel, delivered thread and proposal digest, with a Linear decision-comment readback. A bot, note/model text, unsigned boolean, Linear status, old reaction, wrong revision/channel/thread, replay, or outsider cannot approve. A second distinct decision makes the proposal conflicted; a rejection/conflict is terminal for automatic publication.
7. `publish(id, options)` is a **real callable implementation**, not a planned hook. It requires the independent approval above and a live trusted full-thread reader described below. It freshly validates exact native input/main/source/candidate/proposal/capture/image/control/approval artifacts, signs a public-only legacy bundle, durably fences publication, and calls the existing `publishBundle`. The legacy publisher independently verifies the CSS-only generic envelope and checks current main before each remote write. Its store guard repeats local artifact and current-thread validation. No GitHub token callback, remote tree/commit/ref or PR write occurs before this gate.
8. Success requires the legacy publisher's actual branch/commit/tree/draft-PR readbacks and durable `pr_ready` state. The PR is draft, main-based, generic public prose only; raw feedback, element selectors, private proposal IDs, screenshots and private receipts are not copied to GitHub. There is no merge/deploy endpoint.

## Privileged HOST adapters: required, not supplied by website/model data

There is **no signing command, generic signing API, approval HTTP endpoint or new public hook** in this implementation. The qualified existing operator/Henry handler supplies native MCP reads and trusted router speaker/channel evidence. It must not extract or copy a Linear MCP OAuth token. A person typing identity fields or `approved:true` into a file is not trusted evidence.

Three distinct authorities must be provisioned through reviewed host/broker custody, outside repository/model/check access:

- **Website record key:** the 32-byte derived verification key, not the website session key. Exact backend codec: `HMAC-SHA256(base64url_decode(sessionKey), 'atlas-linear-private-v1')`; record signature is HMAC of backend byte-order canonical unsigned record, **no extra prefix**. Request hash is SHA256 of canonical `{feedbackId,version,operationId,input}`; full signed record hash chains versions. Initial operation ID equals feedback ID; versions are 1..1000. The compatibility test imports the actual backend signer rather than only signing its own fixtures.
- **HOST Ed25519 signer:** used only by qualified native-read/router/delivery/current-thread adapters, with domain-separated purposes below. This signer attests original trusted metadata, complete native reads and verified same-thread/Linear readbacks. Do not give it to a model, browser feedback endpoint, arbitrary colleague request or publisher. Scope the configured reviewer identities and private channel in operator config.
- **Capture Ed25519 signer:** separately held by the real trusted browser capture adapter. It signs only after reproducing the checked baseline/candidate and checking actual rendered pixels. The controller checks bytes/provenance bindings, not whether a picture visually represents an app; that last assertion depends on this trusted adapter and the parent's independent browser QA.

Publisher bundle signing and a repo-only GitHub installation token are separate from these HOST/capture signing authorities and from provider credentials. Preparation CLI refuses publisher credentials. Checks inherit the old stripped minimal environment; actual host filesystem/network/process isolation, read-only reviewed dependencies, signer custody and ACLs remain activation prerequisites, not an OS sandbox claimed by Node code.

### Exact signed HOST envelopes

All HOST/capture envelopes are `{payload,signature}`, strict keys; Ed25519 base64 signature over UTF-8 `canonical({purpose,payload})` using the existing `scripts/feedback/engine.ts` canonical function. Website records use the exact independent backend canonicalization in `input.ts`. IDs/digests and byte values must not be normalized or invented.

Schemas are exported in `evidence.ts` and defined in `input.ts`:

- `atlas-linear-native-read-v1`: `{readAt,workspace,issue:{id,identifier,url,projectId,teamId},records:[...full signed private history]}`. Native reader must exhaust comment pagination, verify the managed ordinary **non-synced** comment lane and report the latest full history for the exact configured issue. Do not attest a subset, an issue description, quoted JSON or a GitHub-synced thread. Refresh this read during long work; stale native receipts stop execution after five minutes.
- `atlas-linear-capture-v1`: `{captureId,at,candidateDigest,revision:1,baseSha,patchDigest,checksDigest,route,theme,browser:'trusted-parent-browser',before:{digest,width,height},after:{digest,width,height}}`. The exact PNG bytes are separate arguments, not public URLs. Receipt must be fresh and captured after preparation. Use `capturePlan(id)`; render the baseline and the validated candidate in real private checkouts, same viewport/theme/route, preserve the gate, verify exact source revision and call `verifyAppliedPatch` again after capture. The parent's `scripts/qa/feedback-linear-*` integration owns the actual browser implementation. No fake renderer/images are supplied here.
- `atlas-linear-review-delivery-v1`: `{eventId,at,channelId,threadId,proposalDigest,beforeDigest,afterDigest,messageIds:[beforeMessageId,afterMessageId],linearCommentId}`. Before signing, the handler must actually deliver **both** images to the configured private thread, inspect Slack pixels/file readbacks, write the proposal to an ordinary private Linear comment and read back its exact content. Native unfurl configuration or a successful upload call alone is not proof. Capture receipt values are not a substitute for delivery proof.
- `atlas-linear-human-decision-v1`: `{eventId,at,channelId,threadId,messageId,proposalDigest,decision:'approve'|'reject',speakerId,speakerType:'human',linearCommentId}`. Sign only the fresh original routed human event, not quoted history or a bot relaying a name. The exact decision/proposal must also be recorded/read back in its ordinary private Linear comment. Approval is to this proposal, never a field supplied by feedback/model/issue status. Decisions must arrive within five minutes; proposal expiry still applies later.

### Current full-thread read: mandatory immediately before publication

An earlier approval is **not** a current no-conflict check. `ReviewConfig.readReviewThread(request)` must call the qualified HOST reader to re-read the **full exact thread including all pages, edits and deletions**, after each request. The reader must compare exact current pixels/assets/Linear review records as appropriate before signing. It must not return a cached earlier thread or merely repeat an approval record.

The controller creates a fresh random `request = {nonce,requestedAt,channelId,threadId,proposalDigest}`. Return a HOST-signed `atlas-linear-review-thread-v1` receipt with:

```
{request, readAt, messages:[{messageId,speakerId,speakerType:'human'|'bot',text}],
 messageCount, nextCursor:null}
```

The nonce/exact request must match; `readAt >= requestedAt` and at most 15 seconds old; the count must match unique enumerated messages. The original thread, both delivered-image message IDs and the exact human approval message must still exist. Current human messages must all be from configured reviewers and exactly `approve <proposalDigest>`; **any other human text, rejection, question, unresolved disagreement, unknown reviewer, missing page or missing approval stops publication**. The root/image delivery messages therefore normally come from the qualified bot. This conservative first version has no ambiguity resolver: resolve discussion through a separately reviewed fresh proposal, not by relabeling or suppressing messages. Bots never supply approval.

The signed current-thread receipt is persisted before credentials and repeated inside publisher guards immediately before remote writes. Uncoordinated edits arriving after the last remote read/in-flight write cannot be atomically recalled across Slack and GitHub. The single-host fence stops subsequent writes; this is not a distributed transaction guarantee.

## Concrete local operator interface

Without `ATLAS_LINEAR_REVIEW_ENABLED=true`, the CLI returns `{"state":"disabled"}` before reading config. It creates no listener/service/job. A qualified handler may call the exported API instead.

```
node --import tsx scripts/feedback-linear/runtime.ts prepare
node --import tsx scripts/feedback-linear/runtime.ts status <feedback-UUIDv4>
node --import tsx scripts/feedback-linear/runtime.ts capture <id> /private/capture-receipt.json /private/before.png /private/after.png
node --import tsx scripts/feedback-linear/runtime.ts delivered <id> /private/delivery-receipt.json
node --import tsx scripts/feedback-linear/runtime.ts decide <id> /private/human-decision-receipt.json
```

Config/receipt/key/image files must be regular non-symlink, same-owner, private-mode files. Root must be a canonical private `0700` directory; state/artifacts are `0600`. `ATLAS_LINEAR_REVIEW_CONFIG` is an absolute path to strict private JSON containing:

- `root`, `repo`, `nativeReadPath`, `hostPublicKeyPath`, `capturePublicKeyPath` (absolute paths).
- `ownerId`, `workspace` (native workspace URL key), `projectId`, `teamId`, `channelId`, `reviewerIds` (real allowlists, no checked-in defaults).
- Positive `maxJobUsd`, `maxDayUsd`, integer `maxTokens`, `maxWallMs <= 600000`, `proposalTtlMs <= 86400000`.
- Explicit `provider:'anthropic'` (the only implemented adapter; other providers fail closed), and `model:{model,inputUsdPerMillion,outputUsdPerMillion,maxInputTokens,maxOutputTokens,maxBodyBytes,maxResponseBytes,timeoutMs}` under existing model bounds. No model or price is chosen for the operator.

`ATLAS_LINEAR_REVIEW_RECORD_KEY` is the broker-injected derived 32-byte key in canonical base64url, not a new token extracted from MCP or the website session key. Preparation additionally needs broker-injected `FEEDBACK_ANTHROPIC_API_KEY`. Production origins are fixed; CLI has no fixture/provider-origin override.

**The standalone `publish` CLI is intentionally blocked**, even if its enable flags are set: a static receipt file cannot prove a fresh complete thread read. It refuses before loading publication config/secrets. The qualified HOST handler invokes the working API with its live MCP/router reader:

```
const controller = new ReviewController({
  ...reviewedOperatorConfig,
  enabled: true,
  readNative: qualifiedNativeReader,
  readReviewThread: qualifiedLiveCompleteThreadReader,
});
await controller.publish(feedbackId, {
  enabled: true,
  signingKey: publisherOnlyBundleSigningKey,
  github: {origin:'https://api.github.com', token:brokerOnlyInstallationTokenCallback},
});
```

These names describe **required real adapters**, not bundled implementations or activation. There is no arbitrary module/command loader to substitute a model or signing handler. No live adapter/key/provider/account was configured or invoked in this implementation. Public native intake, private preparation, capture, delivery, HOST decision and publication must each be accepted independently before any separately authorized live flow.

## Durability, bounds and failure policy

Atomic local-file replacement uses `fsync` on file and containing directory. An atomic global directory lock serializes preparation, artifact admission, decisions and the entire publication. Fence and in-progress state are persisted before external effects. There is no timeout takeover, background retry or process-memory fallback. A SIGKILL leaves an orphan lock and persisted state; another process cannot proceed. Loss of an initialized manifest or malformed/unpriced accounting fails closed rather than resetting limits.

Keep one stable private root per configured owner/workflow. This is **single-host local-filesystem** coordination, not shared/NFS/multi-host locking or protection from a malicious process with the same host/file/signing authority. Operator backups/restore, storage durability, encrypted retention and access controls are required. Do not wipe/change the root to refund spending or replay a proposal.

- One checked revision (`1`) and one attempt per feedback artifact lineage in this first version. Identical `prepare` retry while awaiting capture returns the persisted candidate without inference. Changed input/main/policy, stale candidate, rejected/conflicted decisions or post-publication follow-ups do not silently generate a replacement; they require a separately reviewed new preparation/revision implementation/operator reconciliation.
- Partial publication or lost responses at **any** write boundary parks, retaining reservation, bundle and recorded phase. Even if the remote accepted a draft, the controller does not claim success without readback. It does **not** automatically reuse the old publisher's crash-reconciliation behavior. Successful publication retries also refuse new side effects; `status` is a stored local receipt, not a new remote-status assertion.
- Do not delete an orphan lock and restart blindly. Confirm the exact process/process group is dead and no request remains in flight; inspect native input, spending and remote publication phase/readbacks. A persisted `preparing`/`publishing` attempt remains ineligible. Ambiguous money, lost state, partial PR/ref, or broken approval/control writes require human reconciliation, never editing state back to `approved` or releasing a reservation speculatively.
- Stop by disabling the operator entrypoint and terminating its exact private process; leave lock/state intact if a request might be in flight. There is no service activated by these files. Native private record sync/linkback audit, model/account/positive limits, full capture+Slack-pixel acceptance, signer/broker setup, operator thread reader, independent review and real acceptance are still setup gates.

## Verification (no live peers)

```
FEEDBACK_LINEAR_RECORDS_MODULE=file:///absolute/integrated/src/lib/feedback-linear/server/records.ts \
  node --import tsx --test tests/feedback-linear-review.test.mjs
npm test
npm run typecheck
NEXT_TELEMETRY_DISABLED=1 npm run build
./node_modules/.bin/eslint scripts/feedback-linear/*.ts tests/feedback-linear-review.test.mjs
```

The optional cross-lane signer probe is skipped only when that explicit backend module path is absent in the isolated controller branch. Run it against the actual integrated backend before handoff.

Tests execute the actual legacy no-tools model/validator/checks/publisher, real temporary Git checkouts and npm subprocesses, filesystem persistence/restarts, SIGKILL/orphan locking, spend ambiguity, strict scoped human decisions, a nonce-bound complete-thread conflict, exact-artifact/main changes and lost replies after every publication write. All external provider/GitHub/native/router/capture signers are **explicitly synthetic loopback peers**. Capture-gate tests reuse genuine committed browser PNG bytes with synthetic capture attestations; they are **not** a rendered before/after acceptance for the generated candidate. The parent owns actual full-Atlas checks, real paired captures/delivery and independent exact-head review. No real provider request, GitHub write, PR, push, deployment or scheduled run occurred.
