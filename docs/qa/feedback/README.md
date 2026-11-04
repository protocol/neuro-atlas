# Feedback native QA

Runtime source: `3011bbd8cc3e7e826117b478e18ebaf78cc1983c`.

Captures are from a **disposable loopback-only Next production build**, mounted at `/neuro-atlas`, with only its authentication proxy replaced by a private raw-Host/runtime-flag-guarded fixture. That fixture is not part of this PR and must never be pushed/deployed. The real source gate, scientific data, chart ordering and Next hosting configuration are unchanged.

## Native results

- `native-results.json`: three cases, 1440/390/320px. Actual native chart + feedback top layers, Alt+Shift+F, geometric chart selection, separated private/public inputs, unchecked consent, honest disabled submit, horizontal bounds and layer-by-layer Escape.
- `synthetic-ui-results.json`: three actual rendered-client cases with **explicitly synthetic transport, GitHub identity and popup completion**. No external provider navigation or write. Native click/type/tab verifies failed retry keeps the same UUID/draft, private text does not prefill public task, consent clears after edits, received does not imply started, no fake PR/preview link, same-ID versioned follow-up and focus wrapping. The 320px case uses a short 600px viewport and confirms the wrapped Close control scrolls back into view.
- Screenshots show both the normal disabled surface and clearly named `synthetic-owner` UI states. They do not prove hosted OAuth, private cloud persistence, a paid model call, a real feedback-created GitHub PR or deployment status.

## Replays

Run with an owned browser-harness window and the isolated fixture bound only to `127.0.0.1:35641`. Do not run these scripts against a hosted environment. The synthetic transport asserts the exact loopback origin and never navigates its popup to GitHub.

```sh
FEEDBACK_QA_ROOT="$PWD" FEEDBACK_QA_OUT=/opt/data/tmp/atlas-feedback-evidence BU_NAME=<owned-window> browser-harness < scripts/qa/feedback-browser.py
FEEDBACK_QA_ROOT="$PWD" FEEDBACK_QA_OUT=/opt/data/tmp/atlas-feedback-evidence BU_NAME=<owned-window> browser-harness < scripts/qa/feedback-synthetic-browser.py
```

The second replay installs an explicitly synthetic Page script only for that target, then removes the registration in `finally`. Reload/navigation clears its in-page fixture. It is not included in application bundles.

## Functional and security gates

Standard `npm test` includes real PostgreSQL/PGlite migrations and restart persistence, actual auth/intake handlers, selected-chart contract, body/auth/origin/replay guards, immutable public-only job snapshots, model/billing validation, real Git/parser/subprocess checks, signature/budget/kill/fence guards, crash/readback publication and cumulative follow-up regressions. `tests/feedback-integrated-pipeline.test.mjs` joins those actual components with explicitly synthetic external peers.

The independent candidate review identified F1–F4 (Git timestamp precision, cumulative follow-ups, documented usage metadata and partial-publication parking). Located regression coverage lives in `feedback-publish-http.test.mjs`, `feedback-followup.test.mjs`, `feedback-worker-model.test.mjs` and the integrated pipeline. The final exact-head test/build/lint/review receipts are summarized in the PR; live activation remains separate. `docs/feedback.md` is the short implementation-versus-proposal checklist and activation runbook.

## Evidence captions

- `composer-1440.png`: real composer above the original open chart, disabled backend.
- `selection-1440.png`: geometric selection retains the chart's native top layer.
- `public-review-320.png`: complete narrow public-task review with initially unchecked consent; disabled backend.
- `synthetic-retry-390.png`: synthetic failed write retains the draft for an idempotent retry.
- `synthetic-followup-320-bottom.png`: short-viewport form after local vertical scroll; consent and submit remain reachable. Keyboard wrap separately reveals Close.
- `synthetic-received-1440.png`: actual received UI using synthetic transport; no PR or preview is fabricated.
