# Private HOST transport for Linear feedback review

Implementation only, **OFF without `ATLAS_LINEAR_HOST_ENABLED=true`**. This is a private, one-shot operator entrypoint, not a website route, generic signer, public approval API, plugin loader, service or scheduled job. Owner setup now specifies the existing Henry/Astra account (no new Anthropic service or paid plan), at most five automatic proposal attempts/day, and a five-minute Linear check. This HOST lane installs no schedule and makes no model call; the separate account/quota lane supplies and enforces that policy. UNPRICED dollars stay null, never fabricated USD. Atlas's explicit Send starts private preparation; channel human approval gates the branch/PR. Ambient channel chatter is not work. Nothing here activates inference or publishing by itself. The original standalone `runtime.ts publish` remains intentionally blocked; the concrete entrypoint is `host-runtime.ts`.

## Concrete path

- `host_mcp.py` uses **Hermes's own `MCPServerTask`**, native config loader, SDK session and OAuth manager. It connects only the enabled existing `linear` OAuth server at Linear's fixed MCP endpoint, honors its native include/exclude tool filters, checks advertised tool availability and refuses untrusted-server calls rather than bypassing the native approval gate. No token is read, copied, returned, exported into another HTTP client or used as a website credential. Sampling and elicitation are disabled in the ephemeral client configuration; saved Hermes configuration is not changed.
- A scoped read checks the connected workspace ID and URL **before** looking up the configured issue UUID. Native `get_issue` returns a display identifier in `id` and the stable UUID in `uuid`; the adapter keeps that distinction. It requests project/team/creator/managed-envelope fields explicitly. It exhausts `list_comments` with `limit:250`, `orderBy:'createdAt'`, unique cursor and comment identities, explicit `hasNextPage:false`, and any declared `totalCount`. Two complete enumerations and a second scoped issue/workspace read must agree. Caps are 50 pages / 10,000 comments; exceeding them blocks, not partial success.
- `host.ts` requires the exact backend managed title/description, owner/workspace/project/team/issue scope, deterministic managed comment identities, **explicit ordinary non-synced lane metadata**, exact backend comment rendering/canonicalization, signed private history, contiguous versions and previous-record/request hashes. It imports the actual backend codec helpers and validates the resulting chain with the controller's strict verifier before returning a fresh HOST Ed25519 snapshot. It never treats a description, quoted JSON, arbitrary comment or missing provenance as input.
- Native comment source `author.id` is supported, as documented by Linear's MCP, alongside backend-style `user.id`. If both are present they must agree. The adapter does **not** invent `issue`, `parent`, `externalThread`, `syncedWith`, `archivedAt` or `quotedText` when the native server omits them. Missing ordinary-lane proof is a setup/transport blocker, not `null` by assumption.
- `host-transport.ts` invokes only fixed installed executables, without a shell: Hermes's Python environment + the adjacent helper, `henry-slack-search`, and `henry-out`. Broker credentials remain in their existing clients; there is no Slack token in this repository. Raw subprocess stderr is never surfaced as application output. There is no configurable executable, module, provider URL or command hook.
- `host-slack.ts` calls the **actual `henry-slack-search` CLI**, with empty query, no sender filter and tight numeric **root-time** bounds. The existing broker/CLI pages the selected threads. Returned truncation/partial/continuation flags, notes, total matched count, channel scope, thread coverage, unique messages and root `reply_count` must all reconcile. A budget, timeout, short/stopped thread, repeated message, missing root or extra continuation blocks. It does not hide disagreement with a keyword search for `approve`.
- Both image messages must remain in the exact thread, from a configured bot, with exact revision/digest captions and one correctly named PNG each. `--fetch-file` binds channel, message, thread and file ID. The adapter checks the broker's exact returned file ID, canonical regular file location under `/opt/data/inbound-files/`, byte count, both SHA256 values and PNG dimensions. Unfurl setup, upload success or an image URL is not delivery proof.
- `HostWorkflow.deliver()` sends one root and the two private image files through `henry-out`, verifies the exact broker channel/thread/message receipts and live source/file readbacks, then writes the structured proposal in a **top-level ordinary Linear comment** and reads its exact ID/body/lane back before signing `controller.delivered()`. No raw feedback note or selector is copied into review control comments.
- `HostWorkflow.admitDecision(issueId, sourceMessageId)` accepts **only a Slack timestamp**, not actor fields, a receipt supplied by a caller, `approved:true`, a reaction or a quoted name. It freshly fetches the actual source message from the complete bound thread, checks its source user ID against the configured **previously verified human** reviewer IDs (separate from bot IDs), and requires exactly `approve <proposalDigest>` or `reject <proposalDigest>`. The source timestamp must be fresh and after the verified delivery. It writes and exactly reads back a private decision comment before signing `controller.decide()`. A deterministic source event ID plus durable reservation prevents re-admission/repeated writes.
- `HostWorkflow.publish()` calls the **current real `ReviewController.publish()`**, wired in its constructor to the concrete live thread reader—not a planned callback. Every controller nonce triggers a new full Slack/file/native-comment read. The original proposal comment, original decision comment and exact source approval must still exist and match. Every current human message must be an exact approval from a verified reviewer; any rejection, discussion, outsider, edit, deletion, ambiguity or missing page blocks before publisher credentials and repeatedly at publication guards. The whole read must finish within the existing 15-second freshness window. It fails closed rather than extending that controller contract.

There is no distributed Slack/Linear/GitHub transaction: an edit after the last completed read cannot recall an in-flight request. Fresh guards stop subsequent writes. Only a draft PR can be published; merge remains manual.

## Identity and custody prerequisites

The private `0600`, same-owner configuration is an **operator trust root**, not public feedback/model input. The owner must verify each configured reviewer is the actual human Slack account, and record the verification reference; neither a claimed name in a message nor a config boolean verifies a human. Configure the real bot user/app IDs separately—some bot messages have `U…` IDs. Unknown `U…` sources are treated as human disagreement, never trusted bots.

Keep these authorities separate and outside model/check access:

1. Backend-derived, 32-byte record verification key, canonical base64url. This is the existing `atlas-linear-private-v1` derived key, **not** the website session key and never a Linear MCP OAuth token.
2. App-owned HOST Ed25519 signer and matching pinned public key, provisioned through approved host/broker custody. This implementation generates no production key. The configured environment name references broker-injected PEM material; never put its value in source, CLI arguments, chat or a packet.
3. Separately held capture signer. The parent's trusted browser adapter owns real baseline/candidate rendering and visual/pixel acceptance. This worker supplies no production renderer or fake capture proof.
4. Separate publisher-only bundle signer and repo-scoped installation credential. The GitHub credential is loaded by callback only after the controller's independent approval gate. Preparation refuses configured publisher credential values.

Private file modes and stripped subprocess environments are not a host security sandbox. Same-user filesystem/process isolation, signer access controls, retention, backups and broker custody must be reviewed before activation. Audit real Linear comment/GitHub/Slack synchronization and linkback privacy before any live private control write; store that audit's reference. The native `save_comment` surface has no explicit `createOnSyncedSlackThread:false` parameter: the adapter uses only a new top-level `issueId` comment, never an arbitrary existing ID or inherited parent thread, then requires explicit ordinary/non-synced source readback. Missing readback proof parks the operation; do not weaken it to get a green run.

## Private one-shot CLI and constructed-controller integration

`HostWorkflow({host, slack, controller, writesEnabled, publishEnabled})` accepts an **already-constructed real `ReviewController`**. It preserves the full account/model/quota config and replaces only its two transport readers with the concrete HOST implementations. `hostRuntimeMain(args, env, controller)` accepts that same trusted code-level instance. This is not a serialized module hook. The fixed parent runner can construct the owner-selected Henry/Astra controller and call it directly. With no such instance, standalone lifecycle commands report `host_setup_missing:OWNER_ACCOUNT_CONTROLLER`; they do not silently use Anthropic or invent USD limits. Standalone `native` transport verification needs no model/controller.

```ts
const workflow = new HostWorkflow({
  host: configuredHostTrust,
  slack: configuredVerifiedReviewAudience,
  controller: alreadyConstructedOwnerAccountController,
  writesEnabled: explicitlyEnabledWrites,
  publishEnabled: explicitlyEnabledPublication,
});
await workflow.controller.prepare(); // only the supplied controller selects/enforces inference
await workflow.deliver(configuredIssueId);
await workflow.admitDecision(configuredIssueId, actualSlackSourceMessageId);
await workflow.publish(configuredIssueId, publisherOnlyOptions);
```

The adapters above are implemented and exercised with actual controller fixtures. The account-controller constructor belongs to the disjoint model/quota lane, not an arbitrary runtime loader. The calls below show the one-shot argument shape; lifecycle execution requires that fixed runner to supply the controller.

```sh
node --import tsx scripts/feedback-linear/host-runtime.ts native
node --import tsx scripts/feedback-linear/host-runtime.ts prepare
node --import tsx scripts/feedback-linear/host-runtime.ts status <configured-issue-UUIDv4>
node --import tsx scripts/feedback-linear/host-runtime.ts capture <issue> /private/capture-receipt.json /private/before.png /private/after.png
node --import tsx scripts/feedback-linear/host-runtime.ts deliver <issue>
node --import tsx scripts/feedback-linear/host-runtime.ts decide <issue> <actual-Slack-message-timestamp>
node --import tsx scripts/feedback-linear/host-runtime.ts publish <issue>
```

No config/enable flag returns `{"state":"disabled"}` without reading configuration or credentials. Delivery and decisions additionally require `ATLAS_LINEAR_HOST_WRITES_ENABLED=true`. Publish additionally requires `ATLAS_LINEAR_HOST_PUBLISH_ENABLED=true`. These are deliberate operator activation gates, not substitutes for human proposal approval. A missing key/client/file/model setup raises a blocker, never success. There is no command accepting an arbitrary actor/signature/payload to approve or sign.

`ATLAS_LINEAR_HOST_CONFIG` is the absolute path to strict private JSON with:

- Absolute `root`, `repo`, `hostPublicKeyPath`, `capturePublicKeyPath`.
- `scope:{issueId,ownerId,projectId,teamId,workspaceId,workspace}`. IDs have no checked-in production defaults. `workspace` is the native Linear URL key, not its display name.
- `slack:{channelId,verifiedHumanReviewerIds:[...],botIds:[...]}` with unique disjoint identities; `reviewerVerificationReferences:{"<each-human-user-id>":"<owner-verified identity evidence reference>"}`; `syncAuditReference`.
- `hostSigningKeyEnv`, `recordKeyEnv`, `publisherSigningKeyEnv`, `githubTokenEnv`: **names only**, never values. These refer only to app-owned credentials for their stated purpose, never MCP token storage or a borrowed service credential.
- **No provider/model/dollar-cap schema in the HOST config.** The account/quota lane owns the complete discriminated `ReviewController.config`, including count limits and null/unpriced accounting; HOST neither interprets nor substitutes it. Model/account credentials are not HOST config references.

Public keys/config/capture files must be regular, non-symlink, same-owner, private-mode files. Root remains canonical `0700`; receipts/state/artifacts are `0600`. HOST side effects get their own durable journal under `root/host-operations`: reservation is saved **before** sends/comments, checkpoints preserve source receipts, and partial/lost responses stop repeat attempts. Never delete a journal/orphan lock or retry after an unknown write without manual source reconciliation. The original controller manifest still owns candidate, approval, spend and publication state. This is execution evidence, not a second feedback catalogue/database.

For a deliberate **read-only** native transport smoke (no signer/model or enable necessary), pipe a private JSON scope object with exactly the six `scope` fields to:

```sh
/opt/hermes/.venv/bin/python3 scripts/feedback-linear/host_mcp.py read-smoke < /private/scope.json
```

This only verifies the existing native transport/workspace/scoped issue/comment pagination. An unmanaged QA issue is intentionally **not** a usable input/candidate/review/approval.

### Bounded provenance diagnostic (read-only)

```sh
/opt/hermes/.venv/bin/python3 -B scripts/feedback-linear/host_mcp.py provenance-smoke < /private/scope.json
```

This explicit smoke needs neither activation nor signing keys. It uses the same exact six-field scope, existing broker-native OAuth connection, tool filters, bounded pagination, two complete comment reads and scoped issue recheck. It calls only `get_workspace`, `get_issue` and `list_comments`. Unlike `read-smoke`, its output contains only fixed diagnostic labels and aggregate counts—not bodies, comment/actor identifiers, URLs, signatures, records or raw provider errors. The output schema is `atlas-linear-native-provenance-diagnostic-v1`:

- `sourceReadComplete:true` means those bounded, stable source reads completed. It is **not** an independent history witness or deletion-resistant proof.
- `ordinaryCount` counts comments matching the existing explicit lane predicate; `unknownCount` counts comments missing any required field; `nonOrdinaryCount` counts comments with all required fields that fail that predicate. `missingFieldCounts` names only missing members of `issue`, `parent`, `externalThread`, `syncedWith`, `archivedAt`, `quotedText`. Nothing is added to source comments.
- `state` is **always `blocked`**, including a fully explicit ordinary fixture. `native_comment_lane_unobserved` distinguishes an empty list from positive evidence; unavailable/contradictory source fields report `native_comment_lane_unavailable` / `native_comment_not_ordinary`; a fully matching source reports `native_provenance_diagnostic_only`. No diagnostic output is a HOST receipt, managed-record verification, write permission or production-readiness claim.
- A completed diagnostic exits zero even when it reports a source limitation. Inspect its `state`/`reason`; zero means the diagnostic ran, not that provenance passed. Incomplete/unstable reads and setup/transport errors exit nonzero with a fixed sanitized blocker.

### Supported native surface: verified limit

Fresh discovery of the configured Linear OAuth server on November 4, 2026 advertised 78 tools. Its actual supported schema exposes:

1. `list_comments`: parent selection, `limit`, `cursor`, `orderBy` and `statusUpdateType`; **no `fields` selector** and `additionalProperties:false`. No output schema promises the missing provenance.
2. `get_issue`: explicit issue-field selection with a fixed enum; **neither `comments` nor nested comment selections are in it**. Requested absent **issue** values returning null does not establish anything about a comment's sync/archive/thread lane.
3. `get_attachment`: only issue attachment `id` and `format` (`content`/`url`). It is not a comment lookup; comment uploads explicitly have no issue attachment ID. The existing synthetic QA issue had an empty attachment list, so there was no supported attachment target to read.
4. No `get_comment`, arbitrary query or GraphQL execution tool in that catalog. No undocumented argument or alternate credential transport was attempted.

The existing synthetic QA issue's one real native comment had `parentId:null`, `quotedText:null`, `author` and `onBehalfOf`, but omitted **`issue`, `parent`, `externalThread`, `syncedWith` and `archivedAt`**. The actual `provenance-smoke` returned one unknown comment, zero ordinary comments, and each missing field counted once. The currently configured supported surface therefore cannot establish the verifier's required positive ordinary/non-synced provenance. This is a verified native-source limitation—not an OAuth-scope diagnosis and not proof the underlying comment is synced. Resolution requires a supported native comment response/lookup that supplies authoritative explicit evidence, followed by a reviewed mapping and fresh acceptance. This lane does not request an app, obtain another credential, export broker tokens into raw GraphQL, synthesize nulls, or weaken `PrivateHost`.

## Verification and actual coverage

Authoritative docs/source were read before using the API: [Hermes MCP documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp), its [config reference](https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference), and installed `/opt/hermes/tools/mcp_tool.py` (`MCPServerTask.start/shutdown`, `_load_mcp_config`, `session.call_tool`, `mcp_field`) plus its native OAuth manager/guarded transport. These are runtime-version-sensitive APIs; missing native APIs block explicitly, not an excuse to extract a token.

```sh
node --import tsx --test tests/feedback-linear-host*.test.mjs tests/feedback-linear-native-provenance*.test.mjs
npm test
npm run typecheck
NEXT_TELEMETRY_DISABLED=1 npm run build
./node_modules/.bin/eslint --max-warnings=0 scripts/feedback-linear/host*.ts tests/feedback-linear-host*.test.mjs tests/feedback-linear-native-provenance*.test.mjs
python3 -B -c "from pathlib import Path; p=Path('scripts/feedback-linear/host_mcp.py'); compile(p.read_bytes(),str(p),'exec')"
npm audit --omit=dev --audit-level=high
```

Tests use the actual backend signer/codec, actual Hermes MCP SDK with a local stdio peer, actual `henry-out`/`henry-slack-search` against a loopback broker, actual private filesystem/Git checkouts/check subprocesses, and the actual controller/publisher with a loopback GitHub peer. **All writes, signatures, approvals, control comments and PRs in these tests are SYNTHETIC.** Existing committed PNGs are real browser bytes, but their fixture capture attestations are synthetic and are not visual acceptance of a generated candidate. No model inference is used by the new HOST tests. The two installed-HOST executable integration tests explicitly skip with a reason on machines without those private executables; they were actually executed, not skipped, in this worker.

Actual read-only acceptance in this worker was deliberately limited to the configured workspace, synthetic QA issue and private review channel: the native client read the real issue and exhausted its comment list (initially empty; one QA-evidence comment existed on the final refresh); the concrete Slack search read the real native issue-created notification, and the complete-thread reader correctly refused it as not a managed review/no paired files/no human approval. **No real Linear comment write, Slack send/upload, source-file fetch, genuine human approval, HOST signing, model inference, GitHub write or deployment occurred.** **The final actual MCP comment response positively omitted `issue`, `externalThread`, `syncedWith` and `archivedAt` (it returned `parentId`, `quotedText`, `author`, `onBehalfOf`, timestamps, attachments and body). It therefore cannot currently prove the required ordinary/non-synced lane.** Managed input/control attestation is blocked until a reviewed native transport supplies those fields; they must not be synthesized from `parentId:null`. Real paired-image/human-review acceptance is also unproven. Never replace absence with a made-up successful read or a direct HTTP copy of its OAuth token.
