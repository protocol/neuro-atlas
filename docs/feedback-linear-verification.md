# Linear-backed feedback: implementation and activation

**The implementation is opt-in. Production intake, unattended runs and publication remain OFF. Merging this branch alone does not activate Send.**

One-field feedback + structural element reference → witnessed Linear intake → private tested CSS-only candidate + genuine matched before/after images → authenticated human approve/disapprove in the designated private Slack channel → draft PR only after approval → manual merge. No separate hosted database is introduced.

## What the resumed implementation adds

- An independent, durable private-volume intake journal records stable identity/version/hash reservations before Linear side effects. Pending, missing, deleted or rolled-back committed tails block subsequent work; HTTP retries preserve canonical record identity. It stores hashes/metadata, not raw feedback.
- The website service, authenticated HTTP witness client/server, fixed local witness runtime, controller and HOST now compose. The witness must be initialized deliberately; an enable flag cannot fabricate a valid journal or silently import pre-witness history.
- A distinct `witnessed-intake-v1` authority accepts only the exact signed managed records verified against that concrete journal and fixed owner/workspace/project/team/issue. It preserves missing native sync/archive metadata as UNKNOWN, rejects observed contradictions, and does not reinterpret the strict ordinary-comment route.
- Witnessed review uses disjoint versioned private receipts without Linear control comments. Exact image bytes, current complete source, witness and full authenticated Slack thread are rechecked before publication. Rejection makes no GitHub writes; stale/ambiguous work parks.
- A fixed existing-Hermes/Astra native helper and supervising TypeScript runner provide a direct no-tools completion path. The explicit native policy is durable **at most five attempted generations/day**, not a dollar or generation-token cap. Failed/ambiguous attempts retain their slots. Runtime defaults do not silently adopt this policy.

## Privacy and authority boundaries

The PL-R&D Linear team is public within its workspace. Managed intake comments are **signed, not encrypted from workspace members with issue access**. The website disclosure must remain truthful. Public GitHub metadata stays generic: no raw feedback, element selectors, Linear identifiers or incidental linkbacks. The witness is not a confidentiality wrapper for Linear.

Current native `list_comments` omits ordinary/non-synced provenance fields. The old ordinary lane stays fail-closed. The distinct witnessed lane proves historical intake identity and current journal agreement, **not current non-sync isolation**. Existing integration/audience/linkback settings and key custody still require actual operator review before activation. An audit-reference string is not executable privacy proof.

Checks authorize the state at each last read. An external edit arriving after a check while a network effect is already in flight is not made atomic by this design; subsequent guards park partial work rather than silently completing it.

## Existing-Astra count policy

The native completion fixes `openai-codex`, the default existing Hermes authentication route and requested `gpt-6-astra`, with no tools, retries, agent CLI, custom endpoint, alternate provider or new account. The runner uses isolated Python, strips signing/publishing environment, supervises an absolute process deadline and bounds received bytes. Account labels are local route evidence, not server identity attestation.

**No server-enforced output-token or dollar ceiling is claimed.** In explicit `nativePolicy:'attempt-count-v1'`, legacy `maxOutputTokens`/`maxTokens` values are admission estimates only; actual verified output usage is recorded without clamping. New attempt rows carry the distinct token policy. Legacy capped fixture rows keep their old validation. Subscription dollars remain `UNPRICED`/null.

Exactly one separately authorized public-text native diagnostic ran. It reported server model `gpt-6-astra`, completed status and actual usage 19 input / 5 output tokens; its first collector returned empty text. Delta recovery and JSON-CSS collection were subsequently tested against synthetic native SDK/HTTP peers, **not another real request**. Native proposal/JSON-CSS acceptance remains unverified. The diagnostic's separate once-only marker is not a workflow quota reservation.

## Still required before live use

1. Workspace-admin registration of the exact public PKCE app/callback and real owner OAuth roundtrip.
2. Persistent witness custody, separate website/host authority, authenticated HTTPS connectivity, signing-key custody and documented recovery/isolation. The shipped witness server listens only on loopback; no gateway/service was activated.
3. Actual current integration/audience/privacy review for the chosen source route and private Slack delivery.
4. A consented real owner submission → current witnessed intake → native generated CSS candidate → actual trusted Atlas baseline/candidate checks → genuine matched images → authenticated human decision → read-back draft PR/preview. No automatic merge.
5. Only after acceptance, explicitly install/enable the intended five-minute check. There is no scheduler merely because the config mentions five minutes.

## Verification classes

- Actual native issue-added notification was observed in the designated private channel using a labeled synthetic QA issue. This proves notification only.
- Tests execute actual HTTP/PKCE/session/service/witness/filesystem/Git/CSS-validator/controller/publisher code with external identity, Linear, model, approval and GitHub peers labeled synthetic.
- Native SDK tests use installed resolver/SDK/HTTP/SSE code with the token reader and network peer synthetic. No credentials are exposed.
- Real Atlas native browser and isolated baseline/candidate evidence is recorded separately by exact source revision. Old screenshots/checks do not validate later runtime changes.
- Typecheck, standard full suite, production build, changed-source lint, production audit and independent focused review must all be recorded at the final runtime revision before any completion claim. A passing local fixture is not live acceptance.

Run:

```sh
npm test
npm run typecheck
NEXT_TELEMETRY_DISABLED=1 npm run build
npm audit --omit=dev --audit-level=high
```

See [intake](feedback-linear-intake.md), [history](feedback-linear-history.md), [witness runtime](feedback-linear-history.md), [private review](feedback-linear-review.md), [HOST](feedback-linear-host.md), [witnessed authority](feedback-linear-witnessed-host.md) and [Astra](feedback-linear-astra.md). Private operator observations own detailed execution receipts; no private record bodies belong in public evidence.
