# Atlas feedback → tested draft PR

**Status: owner-only implementation, disabled by default.** This code neither activates live processing nor merges/deploys itself. The real owner/provider/database/GitHub App roundtrip has not been run. Local integrations below use explicitly synthetic external peers.

## Reader workflow

1. Open **Feedback** and move the cursor over the page to identify a specific visible element. Click to pin it, or leave the note attached to the page generally. Selection transmits structural identity, not page text or a screenshot.
2. Write **one private feedback field**. Send follows the disclosure: “Sent privately to the agent. Proposed code changes appear in a public draft PR.” There is no second public title/summary/acceptance field or consent checkbox in this mode.
3. After configured owner GitHub verification, Send durably saves one request. Retries retain the same request key and target; changing the request under that key returns a conflict. **Received does not mean the agent started.**
4. A private worker validates the immutable mode/instruction/context, checks trusted baseline, reserves bounded spending and requests a structured **CSS-only** presentation patch. It validates the actual changes and runs candidate tests/typecheck/build.
5. A separately credentialed publisher independently validates the signed mode, exact generic public envelope and CSS-only diff, then creates one **draft** PR in `protocol/neuro-atlas`. Raw feedback and structural element metadata never become PR prose. No automatic merge/deploy. Status links only to a verified actual PR.

Unsent drafts/auth remain in page memory, not cookies/localStorage/sessionStorage. Selection and composer controls preserve native chart interactions and layer-by-layer Escape. Native one-field UI acceptance is a separate parent integration gate; backend fixtures do not prove it.

## Intake and privacy boundary

The browser DTO in `contracts.ts` is additive:

```ts
{
  feedback: string, // 1..3000 characters
  processingConsent: {approved: true, policyVersion: 'atlas-feedback-simple-v1'},
  context: {
    // Existing bounded route, curated chart/target, viewport/theme and optional revision/scenario.
    element?: {selector: string, tagName: string, role?: string, classes?: string[]}
  }
}
```

The optional element is a private structural tag/`:nth-of-type()` locator, not a CSS query with IDs/attributes/classes/text. Limits: 1024 selector characters, 24 segments, positive nth index at most 10000, lowercase tag names up to 32 characters, optional lowercase role up to 32, and at most eight static class tokens of at most 64 characters. The final selector tag must match `tagName`. Unknown keys, HTML, input values, URLs, DOM text and screenshots are rejected. The same strict schema runs in intake and the worker/model boundary. Curated chart context is retained alongside arbitrary structural button/heading/SVG identity.

The server creates a **fixed generic public task** with immutable `origin: 'private-feedback-v1'`; the browser cannot choose its title, summary or acceptance. Public context is explicitly projected without `element`. Raw feedback and element reference are saved in private storage and in the version-bound immutable job's explicit `privateInstruction`, delivered only to the private model. They are not put into public metadata, signed publication bundles, publisher SQL projections, GitHub requests, receipts or status/error prose.

`publicApprovalHash` continues to bind the generic public task (including its marker), public context and existing publication policy. It does **not** turn raw feedback into approved public prose. A separate canonical whole-request hash handles retries, including note/element changes. Version, immutable SQL snapshot and current global/job fences bind private execution authority.

**Legacy v1 remains supported:** `{privateComment, publicTask, publicApproval, context}` still requires an explicitly approved public task. Legacy `privateComment` is never copied into a worker instruction or sent to a model. Mixed-mode or unknown instruction/marker shapes fail closed before inference or budget reservation.

## Deliberate boundaries

- **Private one-field automatic scope is CSS-only:** existing deterministic safe declaration values in the existing CSS allowlist. No TSX, className/label literal or other text edit is accepted, independently by engine and publisher. Broader requests park for human review.
- **Legacy explicitly public-approved tasks** retain the existing bounded navigation/tab literal lane. No new source paths, selectors, rules, declarations, data, scientific prose, auth, dependencies, commands or infrastructure become editable. See [feedback-worker.md](feedback-worker.md).
- **No screenshot/upload support, arbitrary DOM/text capture, general command-capable agent or public Actions workflow.** The private no-tools supervisor is operator-invoked, never started by browser intake.
- Fixed checks run tests, typecheck and build. Model-driven browser reproduction and automated before/after screenshots are not implemented.
- No deployment/merge status collector: `pr_ready` is the automatic terminal success state. Preview/Merged/Live are withheld without separately reviewed exact-project evidence.
- Versioned follow-ups preserve verified cumulative draft changes and reuse the same draft/branch. **A simple/private follow-up over prior TSX changes parks before inference or another reservation**; historical public approval cannot implicitly renew broader publication scope. CSS-only history can continue cumulatively across legacy/simple modes.
- Partial publication, stale/unverifiable history and merged/live follow-ups park before another model request. Prior receipt expiry is source evidence only, never new execution authority. Unknown billing retains the worst-case reservation. No fake PR, preview or successful fix is returned.

## Architecture and runbooks

- [API/auth/storage](../src/lib/feedback/README.md): exact origin and numeric owner, cookie-free S256 PKCE, ephemeral session header, bounded bodies, private PostgreSQL and operator grants/retention.
- [Frontend](../src/components/feedback/README.md): native top-layer selection, one-field composer, page-memory auth, retries/status and responsive behavior.
- [Worker/publisher](feedback-worker.md): deterministic patch policy, trusted subprocesses, atomic budgets/fences/kill switch, signed public-only bundles and separate publishing identity/crash reconciliation.
- [Local follow-up/private-mode verification](feedback-followup-verification.md).
- Apply existing `db/feedback/001-feedback.sql` and `002-worker.sql` explicitly as an operator. The new mode uses their existing private JSON columns and immutable-job trigger; **no new migration or service** is required.
- Private entrypoints: `node --import tsx scripts/feedback/runtime.ts worker` and `... publisher`. Without configuration each returns `{"state":"disabled"}`. Nothing schedules or starts them automatically.

## Activation is separate

Before enabling: approve/configure the owner OAuth/callback and real popup roundtrip through the unchanged mounted Basic gate; private managed PostgreSQL with least-privilege roles, backup/restore and retention; isolated worker/publisher and egress; selected model and verified strict billing/prices with positive hard limits and an emergency-stop drill; broker-held repo-only installation/signing identities; independent security review; and authorized real owner submission → tested draft PR → exact-SHA hosted preview acceptance. This implementation authorizes none of that setup or spending.

## Local verification

The standard `npm test` glob includes `tests/feedback*.test.mjs`. Tests exercise genuine HTTP auth/intake handlers, PGlite/PostgreSQL migrations and restart persistence, immutable private jobs, source hash mapping, strict model HTTP/billing decoding, Git application, fixed real npm subprocess checks, signed public-only SQL outbox, current budgets/fences/kill control and separate publisher readbacks.

`feedback-api` proves one-field structural association, idempotent retries, changed-target conflicts, mixed-mode version fencing and no private receipt/status leak. `feedback-integrated-pipeline` joins PKCE → intake → private model instruction → outbox/restart → generic draft publisher → actual status; canaries prove the note and element reach only their explicit private model field, never public envelopes/outbox/publisher SQL or HTTP. `feedback-followup` covers legacy CSS → simple CSS → legacy cumulative preservation and TSX-history pre-spend parking. Engine and publisher independently reject otherwise legacy-valid TSX patches in private mode, including signed bundles bypassing engine convention.

External OAuth/model/GitHub peers and the tiny fixture check projects are explicitly synthetic. These results are not real-provider repair, full-Atlas candidate validation or hosted/native acceptance. Parent owns full-app baseline/candidate, native element-selection evidence and independent exact-revision review before updating the existing PR.
