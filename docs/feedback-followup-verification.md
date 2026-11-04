# Feedback pipeline local verification

## One-field private feedback / element delta

Scope: bounded backend/worker/publisher/docs only, based on `610ee5a82bcac5e0d16fb4a1562cda31d23297b4`. The frozen browser DTO is unchanged. No UI/client/scientific/auth-proxy/package/dependency or migration changes; no live access, service, provider spend, push, activation, merge or deployment.

### Vertical RED → GREEN receipts

- `--test-name-pattern='one-field HTTP intake' tests/feedback-api.test.mjs`: real owner HTTP submission returned 400 instead of required 202 before one-field normalization existed. Green after strict additive intake/private association; changed target under the same key returns409, source jobs reject SQL payload mutation, simple → legacy → simple versions fence correctly, and receipts/status exclude canaries.
- `--test-name-pattern='one-field private element' tests/feedback-integrated-pipeline.test.mjs`: new durable job was rejected by the legacy-only worker envelope. Green after explicit private-instruction binding; actual loopback model JSON contains the note/reference only in `privateInstruction`, with exact original CSS bytes/hashes. The public envelope, persisted signed outbox, restarted publisher and synthetic GitHub requests remain generic.
- `--test-name-pattern='private instruction mode rejects|publisher independently denies' tests/feedback-worker-engine.test.mjs tests/feedback-publish-http.test.mjs`: engine incorrectly reached `publishing` for a legacy-valid navigation literal edit, and the separately re-signed publisher test observed no rejection. Green after independent CSS-only validation based on the bound marker. Denial occurs before candidate checks/outbox and, independently, before publisher credential loading/HTTP writes.
- `--test-name-pattern='previously public-approved TSX history' tests/feedback-followup.test.mjs`: simple follow-up made a second provider call (2, expected1) before cumulative scope rejection. Green after checking full historical scope before baseline/inference/reservation. CSS-only legacy → simple → legacy history still preserves the cumulative draft and original-main hashes, with exactly one synthetic remote PR.
- `--test-name-pattern='malformed/mixed private envelopes' tests/feedback-worker-model.test.mjs`: a malformed legacy envelope carrying a private key did not reject. Green after model preflight shares strict public-envelope validation and exact marker/instruction validation before budget/credential/provider access.
- `--test-name-pattern='private instruction capability|one-field private element' tests/feedback-worker-pg.test.mjs tests/feedback-integrated-pipeline.test.mjs`: modified private capability incorrectly reserved money, and publisher SQL selected the private job payload. Green after current-capability/private-snapshot comparison and explicit public-only publisher SQL projections.

Additional regressions cover malformed immutable job inserts (no acquired attempt/reservation), unknown/re-signed markers and public element injection, noncanonical selectors/classes, button/heading/nested SVG association, 3000-character bounds, legacy canary exclusion, and simple/legacy partial-publication parking across every phase.

### Final backend GREEN

```sh
node --import tsx --test tests/feedback-api.test.mjs tests/feedback-storage.test.mjs tests/feedback-context-contract.test.mjs tests/feedback-worker*.test.mjs tests/feedback-publish-http.test.mjs tests/feedback-followup.test.mjs tests/feedback-integrated-pipeline.test.mjs
# 109 runner tests passed; 0 failed, cancelled or skipped; 57799.868707 ms.
npm run typecheck
# next typegen && tsc --noEmit: exit 0.
./node_modules/.bin/eslint src/lib/feedback/intake.ts src/lib/feedback/schema.ts scripts/feedback/engine.ts scripts/feedback/model.ts scripts/feedback/pg-store.ts scripts/feedback/ports.ts scripts/feedback/publisher.ts scripts/feedback/validator.ts
# exit 0.
git diff --check
# exit 0.
```

An initial direct `tsc --noEmit` lacked generated Next `LayoutProps`; the repository's canonical `npm run typecheck` generated those route types and passed. No package install or dependency mutation was used. Test peers/identities/model outputs and tiny fixture check scripts are explicitly synthetic; actual local HTTP, SQL transactions/triggers/restart, source Git hashes/application, subprocesses, signatures/outbox and publisher readbacks are real. This is not a real paid model/App/hosted acceptance run.

Integration gates remain with the parent: frontend/client union submission and native target/retry/layer tests, full real-Atlas baseline/candidate, full suite/build, independent exact-revision review and existing PR79 update. Publisher deployment roles must not read `jobs.payload` now that this JSON column carries an explicitly private instruction; no live grants were changed. All runtime controls remain disabled by default.

## Prior F2 / F4 local verification receipt

Historical scope: cumulative incremental follow-ups and early parking across partial publication. Local synthetic HTTP only; no production provider, GitHub, activation, push, merge, or deployment. Parent-owned F1 was cherry-picked unchanged as ac0d7a6 (source 57a7559); this change does not edit publisher/model/runtime/package/UI files.

## Expected RED observed

- `node --import tsx --test tests/feedback-followup.test.mjs`: intake partial-publication regression failed with `reserved`: actual `queued`, expected `needs_human_review`.
- Same command after the intake fix: direct pending successor regression failed with an acquired version-2 capability, expected `null`.
- `node --import tsx --test --test-name-pattern='two-file incremental' tests/feedback-followup.test.mjs`: second worker run failed rather than publishing because its input omitted the previously approved draft change.
- Same-file regression was additionally run against the restored pre-fix engine (then the cumulative engine was restored): `--test-name-pattern='same-file incremental'` failed at the second run, actual `failed`, expected `publishing`.
- `--test-name-pattern='missing_publication'`: missing publication evidence admitted a worker/model run (`failed`) instead of parking before acquisition (`idle`). Fixed by rejecting missing publication when feedback retains a PR/head.

## GREEN observed

```
node --import tsx --test tests/feedback-followup.test.mjs tests/feedback-worker*.test.mjs tests/feedback-publish-http.test.mjs tests/feedback-integrated-pipeline.test.mjs tests/feedback-api.test.mjs
# 82 tests passed, 0 failed; 55052.834446 ms
npm run typecheck
# next typegen && tsc --noEmit: exit 0
git diff --check
# exit 0
```

After strengthening the new cumulative fixtures from a model-port stand-in to actual `AnthropicModel` loopback HTTP, reran:

```
node --import tsx --test tests/feedback-followup.test.mjs
# 20 tests passed, 0 failed; 52475.558615 ms
```

The final follow-up suite exercises real intake and both PostgreSQL migrations, durable PGlite transactions, actual Anthropic request/usage decoding and reservations against synthetic HTTP, real Git application, fixed real npm baseline/candidate checks, signed immutable bundles, and the separate publisher with Git-second HTTP readbacks. Both two-file and same-file follow-ups verify the resulting cumulative remote tree, original-main before hashes, old head parent, one draft PR and a fresh approval/signature. Negative history cases prove no second provider request/reservation on changed main, missing bundle/publication, or signature mismatch. An expired signed historical bundle is accepted only as source evidence under a new current lease/fence/approval/receipt. Each partial phase is tested through intake and direct pending acquisition; old writer fencing and unchanged publication evidence are asserted.

Limits: synthetic remote systems and tiny trusted fixture projects are not production acceptance or a full real-Atlas build. Parent owns real-Atlas dependency transport, independent final review, UI wording, and activation gates. Partial publications intentionally require human reconciliation, including untouched reservations. Changed main and signing-key rotation park instead of rebasing or trusting unverifiable history. Empty cumulative diffs and patches beyond unchanged policy/size bounds park.
