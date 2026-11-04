# Atlas feedback frontend

Fresh **Feedback** / **Alt+Shift+F** starts cursor picking. Hover outlines the actual DOM hit; clicking pins it and opens one compact field beside it (top aligned on small screens). **General page** skips the attachment. A retained draft/target/history or a curated chart open event can reopen directly. **Select element**, **Clear**, **Back**, Close and Escape preserve the draft. Drafts and owner sessions exist only in page memory; reload loses them.

## Native layers and selection

The composer is a content-sized native `dialog.showModal()`, not a full-viewport form. The picker closes that dialog and uses a pointer-pass-through manual popover. It is portaled into the original native chart dialog when one exists, so the real chart remains active for hit-testing and the picker controls are not made inert. Capture-phase pointerdown/up, mousedown/up and click suppression prevents picking from activating the underlying control, moving a range, checking a checkbox or closing a chart. Pinning happens at click, not pointerup. The picker toolbar traps Tab without replacing the page with an inert modal. Escape exits selection, then feedback, then leaves the chart's existing Escape behavior alone.

An accessible button/link/input ancestor wins over a nested decorative icon/span. Outside a control, headings and actual SVG elements remain selectable. Hidden/inert/feedback/tooltip content is excluded. `selection.ts` emits a bounded structural tag/nth-of-type selector (no IDs/attributes/text), lowercase tag, optional bounded role and up to eight safe static CSS class tokens. Deep/oversized locators fail closed. The nearest curated chart identity is retained independently. The short accessible/visible chip name is computed locally, bounded to 80 characters, and is **never submitted**. No live input values, DOM/HTML snapshot, href/URL, screenshot, query or fragment is captured into the payload.

Only `reference`, never the DOM handle or local `label`, goes into `context.element`. The frontend sends `SimpleFeedbackInput`: one private `feedback` field, explicit `processingConsent` on Send and bounded context. It never fabricates `publicTask` prose from the note. The backend owns both the union DTO and all private-instruction/publication enforcement.

## Sending and history

Enter sends, Shift+Enter inserts a newline, and composition/IME Enter does not send. The short textarea grows to a bounded height. Disclosure: “Sent privately to the agent. Proposed code changes appear in a public draft PR.” No public title, summary, acceptance fields, approval checkbox or extra review step.

The existing `FeedbackClient` retains mounted API routing, no-store/same-origin credentials, the custom session header (not Authorization), direct-gesture OAuth popup creation and exact origin/source/state/PKCE checks. Its submit/followup methods accept the legacy/simple `FeedbackSubmission` union. No cookie or browser persistence was added.

Only a valid durable 202 receipt clears the draft. Failed/disabled/disconnected/unconfirmed requests never claim success. An uncertain retry retains the **same UUID and complete input snapshot**, including element and original context, across viewport/theme/DOM movement or session renewal. An intentional note/target/followup edit starts a new fingerprint. Busy writes disable editing/reselection/history. A confirmed receipt closes the composer and shows “Feedback saved” in a real manual popover portaled into any retained chart dialog; it does not claim an agent started. History remains reachable without extra editing fields; followups use the existing ID, expectedVersion, one new private field and attached target. PR/preview links still require actual validated status DTOs.

## Verification / replay

```sh
node --import tsx --test tests/feedback-ui*.test.mjs
npm run typecheck
./node_modules/.bin/eslint src/components/feedback/*.tsx src/components/feedback/*.ts src/lib/feedback-client.ts
git diff --check
```

Regression-first slices were observed RED before implementation: one-field/direct send; exact DOM picker; nested actionable icon; non-inert picker/full pointer sequence; compact CSS; Enter/IME; unchanged retry after resize/DOM mutation; meaningful local-only chip/safe classes; fresh hover-first entry; native-chart top-layer saved toast; textarea growth; picker Tab wrapping; decorative aria-hidden button icons; and opaque/clamped mobile composer styling.

Native replays require an owned browser-harness window. Defaults target the parent's **isolated** loopback Atlas fixture at `127.0.0.1:35641`; never use these against a hosted site. `FEEDBACK_QA_BASE` and `FEEDBACK_QA_CHART` can instead select the additive **native component fixture** at `127.0.0.1:35642`, which bundles the actual Feedback/client/ChartModal components with synthetic page content and minimal chart styles. It has no auth bypass, real identity, database or paid provider. Stop it after QA.

```sh
node scripts/qa/feedback-ui-fixture.mjs
# Separate shell; after HTTP readiness and acquiring the named browser window:
export FEEDBACK_QA_ROOT="$PWD" FEEDBACK_QA_OUT=/opt/data/tmp/atlas-simple-ui-native
export FEEDBACK_QA_BASE=http://127.0.0.1:35642/neuro-atlas/field-velocity FEEDBACK_QA_CHART=tissue-mapped
BU_NAME=<owned-window> browser-harness < scripts/qa/feedback-browser.py
BU_NAME=<owned-window> browser-harness < scripts/qa/feedback-synthetic-browser.py
```

The synthetic replay injects only an exact-loopback, target-owned transport/identity/popup fixture and removes its Page registration in `finally`. It exercises actual native client interactions, failed retry, same-element payload, chart Close-button interception, top-layer saved toast, history/versioned followup and Tab wrapping at 1440/390/320 (320 × 600 short viewport). Component tests cover IME; desktop pointer emulation is not physical-phone touch evidence.

Parent integration owns the complete production app baseline/candidate, actual chart styling/data, backend new-mode acceptance, full suite/build/audit, independent exact-revision review, source screenshots and PR handoff. No live owner OAuth/model/GitHub publication or deployment acceptance is claimed here.
