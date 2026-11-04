# F2 / F4 local verification receipt

Scope: cumulative incremental follow-ups and early parking across partial publication. Local synthetic HTTP only; no production provider, GitHub, activation, push, merge, or deployment. Parent-owned F1 was cherry-picked unchanged as ac0d7a6 (source 57a7559); this change does not edit publisher/model/runtime/package/UI files.

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
