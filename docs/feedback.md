# Atlas feedback → tested draft PR (v1 implementation)

**Status: code for an owner-only workflow, disabled by default.** This PR neither enables live processing nor merges/deploys itself. The real owner/provider/database/GitHub App roundtrip has not been run. Local synthetic integrations are labeled below.

## Reader workflow

1. Open **Feedback** at the lower right, or **Alt+Shift+F** outside a text field. The shortcut also works over an open chart.
2. Write a private comment. Optionally **Select area** and click a chart; its stable ID is attached without capturing page text. The chart remains open underneath.
3. Review a separately written **Public PR task**: title, summary, acceptance criteria and bounded route/chart/viewport/theme context. The private comment never prefills that task and is never sent to the model. Explicit unchecked consent covers the public task/context and resulting code diff.
4. After configured owner GitHub verification, Submit durably saves one request. An idempotency key makes retries safe. Received is not a claim that the worker started.
5. A private worker validates the approved task, reserves bounded spending, checks trusted baseline, requests a structured presentation patch, validates it, and runs candidate tests/typecheck/build.
6. A separately credentialed publisher verifies a signed receipt and the exact diff, then creates one **draft** PR in `protocol/neuro-atlas`. No automatic merge/deploy. Status links only to a verified actual PR.

Closing preserves the draft in page memory; reloading loses an unsent draft and requires sign-in again. No cookie/localStorage/sessionStorage stores feedback identity. Escape returns one layer: selection → composer → original chart.

## Deliberate v1 boundaries

- **Automatic edit scope is narrow:** bounded values in existing presentation CSS rules and existing label/className literals in two navigation/tab files. Structural UI changes, general copy/scientific prose, data, sources, auth, permissions, dependencies, workflows and infrastructure park for human review. See the exact deterministic policy in [feedback-worker.md](feedback-worker.md).
- **No screenshot/upload support** and no arbitrary DOM/text capture. No selected dataset/scenario or deployed revision is inferred in this version. Review displays the context actually attached.
- **No arbitrary command-capable agent or public Actions workflow.** The implementation uses a private no-tools model supervisor and separate publisher instead of the proposal's Claude Code Action. This keeps credentials and private intake out of public workflow runs; the worker is invoked by an operator, not by browser requests.
- Fixed automated validation runs tests, typecheck and build. **Model-driven browser reproduction and automated before/after screenshots are not implemented.** Native browser evidence in this PR was produced by the implementation owner, not by the feedback worker.
- **No deployment/merge status collector yet.** `pr_ready` is the automatic terminal success state. Vercel may attach its ordinary preview to the PR, but this code does not claim a verified preview, Merged or Live. Those DTO fields are withheld without a separately reviewed exact-project evidence collector.
- New approved follow-ups reuse the same draft/branch and fence older work; merged/live follow-ups park for human review. They are new task versions generated from current main, not an unconstrained conversation with a running agent. Include the complete desired change in the replacement public task.
- Failed/ambiguous requests remain saved with a safe status. Unknown model billing retains the worst-case reservation. No invented PR, preview or successful fix is returned.

These are explicit differences from the broader proposal, not a claim that unrestricted artifact-style repair or live activation is finished.

## Architecture and operational runbooks

- [API/auth/storage](../src/lib/feedback/README.md): exact origin and numeric GitHub owner; cookie-free S256 PKCE; opaque expiring session header; bounded bodies; private PostgreSQL migrations and grants/retention requirements.
- [Frontend](../src/components/feedback/README.md): native top-layer selection, private/public review, page-memory auth, retries/status and responsive behavior.
- [Worker/publisher](feedback-worker.md): parser-validated edits, trusted subprocesses, atomic budgets/fences/kill switch, signed durable bundles, separate publishing identity and crash reconciliation.
- Apply `db/feedback/001-feedback.sql` and `002-worker.sql` explicitly with the migration operator. Requests never create schema or fall back to memory.
- Private entrypoints: `node --import tsx scripts/feedback/runtime.ts worker` and `... publisher`. With absent configuration each returns `{"state":"disabled"}`. Nothing schedules or starts them automatically.

## Activation remains a separate owner decision

Before enabling, configure and review:

1. Owner GitHub OAuth application/callback and the real popup/opener flow through the existing mounted Basic gate and cookie-stripping proxy.
2. Private managed PostgreSQL, separate least-privilege intake/worker/publisher roles and grants, backup/restore, retention and deletion operations.
3. Isolated private worker and publisher services; read-only reviewed dependencies, restricted filesystem/egress, no host/broker sockets or credential paths accessible to check subprocesses.
4. Selected model, independently verified billing/prices and explicit positive job/day/token/turn/time caps. Test a real emergency stop. No default paid model or budget is selected here.
5. Broker-held signing identity and repo-only, short-lived GitHub installation credential. No secret belongs in browser code, Git or PRs.
6. Authorized real acceptance: owner submission → one actual tested draft PR → exact-SHA hosted preview, with duplicate/failure/follow-up/kill/privacy paths verified. Until that happens, describe the flow as locally tested, not live.

## Local verification (synthetic boundaries)

The standard `npm test` glob includes all `tests/feedback*.test.mjs` files. They exercise actual auth handlers, PGlite/PostgreSQL transactions/restart durability, intake validation, job snapshots, model HTTP parsing, Git snapshots/patches, fixed subprocesses, budgets/fences and separate publisher HTTP readbacks. External OAuth/model/GitHub peers are synthetic loopback services; trusted test commands in the small end-to-end Git fixture are synthetic commands, not evidence of a real model repair to Atlas.

`tests/feedback-integrated-pipeline.test.mjs` joins owner PKCE → real strict selected-chart intake → durable job/retry → worker/model/checks → signed SQL outbox/restart → separate draft publisher → actual status DTO. Private canaries must stay out of model/public output. Parent full-repository tests/typecheck/build and native desktop/390/320 evidence supplement that integration test.
