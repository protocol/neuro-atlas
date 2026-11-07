# WITNESSED-INTAKE native/HOST route

Implementation only; production remains **OFF**. This distinct provenance authority does not establish current ordinary/non-synced privacy from omitted native fields. No production configuration, credentials, listeners, scheduler, model calls, deployment, external mutation or live acceptance is provided by this change.

## Trusted configuration and API

`InputPolicy.authority` defaults to the unchanged `ordinary-v1` contract. Explicit `authority:'witnessed-intake-v1'` additionally requires fixed `workspaceId` and `issueId`. Construct `PrivateHost` with the **concrete `FileIntakeWitness`** in `historyWitness`, fixed scope and existing HOST signing key. `HostWorkflow` requires its controller and HOST to use the same witness root/policy and input-policy authority. Flags or lookalike witness objects are not authority, including loopback fixtures.

The fixed private operator factories accept `inputAuthority:'witnessed-intake-v1'` only from the existing same-owner/private configuration files:

- Review config also requires `issueId`, `workspaceId`, and `historyWitnessRoot`.
- HOST config also requires `historyWitnessRoot`; exact issue/workspace come from existing `scope`.
- HOST/controller authority and witness root/policy must agree. Missing authority stays ordinary; existing jobs/receipts never migrate automatically. No journal is initialized by loading configuration.
- Existing enable/write/publish gates and selected account enforcement remain. The route is not enabled merely by implementing or testing it.

Use the existing `HostWorkflow.deliver`, `admitDecision(issueId, actualSlackMessageTimestamp)`, and `publish` APIs. `publish` still invokes the real `ReviewController`/CSS-only draft publisher, not an alternative publisher callback.

## What the authority proves

The HOST requires a fresh complete reconciled native enumeration in the fixed managed issue/workspace/project/team/creator scope. Every managed body must use the exact deterministic comment identity, exact backend rendering, valid record HMAC/request digest and complete consecutive predecessor chain. Current native author must equal the owner; `parentId:null` and `quotedText:null` must be explicitly observed. Missing either is rejection, not null normalization. Conflicting `user`/`author` identities reject.

The signed receipt has distinct schema/purpose `atlas-linear-witnessed-native-read-v1` and authority `witnessed-intake-v1`. `observations` preserves only actual optional native metadata members. Omitted `issue`, `parent`, `externalThread`, `syncedWith`, `archivedAt` remain **UNKNOWN**, not invented values. Known contradictory metadata, inline/rethreaded comments, wrong IDs, duplicates/extra managed comments, altered bytes, unknown author, incomplete enumeration and missing committed records reject. Non-null `onBehalfOf` also rejects if observed.

The full source chain must equal **every committed witness row**, with no reserved tail. An unavailable/uninitialized journal or deleted suffix blocks. Both HOST and controller compare the concrete journal freshly; checks occur before inference/delivery/decision and repeatedly at publication. After each full Slack/image publication read, source and witness are checked again before the HOST returns authorization. The candidate policy digest includes the witnessed authority, independent witness identity and policy digest; old ordinary candidates/approvals cannot become witnessed approvals.

## Zero redundant Linear review controls

Only this authority emits **zero Linear proposal/decision comments**. Website Linear intake and signed history are unchanged. No historical comment deletion is performed.

Private delivery receipt schema is `atlas-linear-witnessed-delivery-v2`, signed for purpose `atlas-linear-witnessed-review-delivery-v2`; decision schema is `atlas-linear-witnessed-decision-v2`, purpose `atlas-linear-witnessed-human-decision-v2`. Both are strict and have **no `linearCommentId`**. Existing ordinary schemas still require it and keep exact comment readbacks. No random placeholder identifier, optional global legacy field, missing-readback success or old-receipt fallback is used for witnessed receipts.

The existing private reservation/checkpoint journal and controller artifacts remain durable. Actual paired image bytes, full fresh Slack thread, verified human identity/exact proposal-digest decision, input/main/policy/artifact checks and every publication guard remain required. Rejection creates no GitHub write. Approval permits only a draft PR through the existing publisher.

## Privacy and concurrency limits — not activation evidence

Input provenance and current privacy are separate claims. Historical intake completion is **not** a fresh observation of mutable `externalThread`, `syncedWith` or `archivedAt`. Signed Linear plaintext remains readable to people with issue access, not encrypted owner-only storage. The existing `syncAuditReference` is an operator prerequisite/reference, **not an executable current privacy attestation**. This change neither supplies a fresh legitimate privacy reader nor claims the current managed comments are non-synced.

Live acceptance still requires authorized website OAuth/intake/witness transport, legitimate current integration/audience/linkback/privacy evidence, real exact-candidate image delivery and human approval, custody/isolation/retention review, and independent final review. Do not activate when current privacy evidence is unavailable.

There is no cross-provider transaction or witness reservation/publication fence in this change. Guards prove the last completed full read; a reservation or external edit after that read cannot recall an in-flight effect. Subsequent guards park on change. This is explicitly **not** a strict no-interleaving guarantee. Existing single trusted private-volume/rollback and orphan-lock boundaries remain.

## Scoped verification

Dedicated `tests/feedback-linear-witnessed-host*.test.mjs` exercise native-shaped omitted fields, real independent file journal, strict schemas/authority separation, complete delivery→reject with zero GitHub writes, and approval→actual controller draft publisher against a loopback GitHub peer with zero Linear control writes. Additional cases cover tamper, unknown observed fields, known contradictory metadata, deletion, reserved tails, stale source, mode changes, receipt migration refusal, split witness authority, and witness changes during long Slack reads/at publication guards.

All identities, approvals, delivery transports, signing keys and GitHub/Linear peers are **synthetic**. Existing browser PNG bytes are real files but are not evidence of this generated candidate's visual acceptance. Test fixtures seed an unpublished candidate with actual synthetic Git checkout/trusted-check receipts; no model inference or real source credentials are used. Full suite/build and live acceptance remain the parent integration responsibility.
