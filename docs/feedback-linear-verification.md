# Linear-backed feedback: activation and verification

**Implementation is opt-in and activation is blocked. Merging this branch alone does not make Send or unattended preparation work.**

The workflow is: one-field feedback with an element reference → durable Linear intake → a private, tested candidate and genuine matched before/after images → a human decision in the designated private channel → a draft PR only after approval → manual merge. It uses no additional hosted database. Private host files are execution artifacts, locks, attempt reservations and publication receipts, not a second feedback catalogue.

## Independent enable gates

- Website: select the `linear` backend explicitly, configure the exact public PKCE app/callback, owner/workspace/project/team and server-side sealing key. Missing configuration stays unavailable; it never falls through to fake persistence or another backend.
- Preparation: configure the selected existing account, a positive output/time limit and a durable attempt-count policy. Account/model/policy changes invalidate prepared approval material. Failed or ambiguous calls retain their attempt slot. Subscription dollars without an authoritative price are `UNPRICED`/null, not zero.
- Private delivery/control: configure verified human/bot identities, source-isolation audit and separately held application-owned signing authorities. The native connector must supply the provenance required by the strict managed-record verifier.
- Publication: independently enable the publisher and supply its repo-scoped authority only after a fresh, complete, exact-thread human approval is revalidated. Reject, ambiguity, stale main/input/evidence, missing pages and partial writes park rather than retry. No automatic merge.
- Scheduling: a five-minute poll and five-attempt/day policy are intended operator settings, **not an installed scheduler**. Do not start a scheduler before the live prerequisites and acceptance run pass.

## Established versus unproven

The operator verified a real native Linear issue-created notification in the configured private Slack channel using an explicitly labeled synthetic QA issue. This establishes that notification path only. It does not establish website OAuth intake, a live model-generated proposal, paired-image delivery, human approval or a real feedback-created PR.

Local tests exercise the actual owner/PKCE/session/intake code against loopback OAuth/Linear peers, real filesystem/Git/check subprocesses, actual CSS validator and actual controller/publisher against synthetic source/model/GitHub peers. Browser replay uses the actual Atlas UI at desktop and narrow widths. Synthetic identity, upstream responses, approval attestations and publication peers are not live account acceptance.

Two live transport limits were positively observed during read-only/offline verification:

1. The current native Linear `list_comments` response omits explicit ordinary/non-synced provenance fields used by the managed-record verifier. The adapter refuses to invent them from a top-level-looking comment.
2. The installed native Codex completion adapter drops requested `max_tokens` and `max_output_tokens` before its Responses call, and the installed generic proxy has no Codex adapter. The existing-account model path remains blocked until a supported bounded broker route exists. No credential extraction, provider substitution or unbounded authentication call is used to work around this.

The public PKCE application also requires workspace-admin registration. Operator identity, key custody, retention/isolation and actual current paired-image/human-decision acceptance remain activation prerequisites.

## Verification commands

```sh
npm test
npm run typecheck
NEXT_TELEMETRY_DISABLED=1 npm run build
npm audit --omit=dev --audit-level=high
```

The standard test command bounds file-level parallelism and still runs the complete `tests/*.test.mjs` suite. Backend/controller signer compatibility is imported directly from this checkout, so it cannot silently skip because an out-of-tree environment variable is absent.

See [intake](feedback-linear-intake.md), [private review](feedback-linear-review.md), [HOST transports](feedback-linear-host.md) and [existing-account limits](feedback-linear-astra.md). A test or deployment receipt is never a substitute for the still-required real owner submission → unpublished candidate/images → exact channel decision → draft-PR acceptance.
