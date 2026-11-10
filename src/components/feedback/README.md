# Atlas feedback frontend

The mounted flow is now [visitor feedback → Linear logging](../../../docs/feedback-public-linear.md): **no visitor account/sign-in**, one note, structural picker, no history/status/account/PR UI. The prior owner OAuth client/API still exists for its separate disabled legacy lane; this component does not import it.

## Native layers and selection

Fresh **Feedback** / **Alt+Shift+F** starts hover picking. Clicking pins the exact structural element and opens the compact native `dialog.showModal()` beside it. **General page** skips attachment; an unsaved retained draft/target or curated chart event can reopen directly. The composer flips/clamps to the available visual viewport, including narrow/short mobile and resize. No chart ordering/actions/IDs or selector/privacy behavior changed.

The picker uses a pointer-pass-through manual popover, portaled into an existing chart dialog when present. Capture-phase pointerdown/up, mousedown/up and click suppression prevent activation of the underlying controls; pinning occurs at click, not pointerup. Toolbar Tab stays local. Escape exits selection, then feedback, leaving the native chart's own Escape behavior intact. Close returns focus.

`selection.ts` sends only bounded tag/nth-of-type selector, tag, optional role/static classes and allowlisted chart context. The chip's short local accessible name never travels. No live input value, DOM/HTML/text snapshot, href/URL, screenshot, query or fragment is submitted. The selector and picker are unchanged in this change.

## Send and retry

`PublicFeedbackClient` sends `{feedback, context}` to the mounted `/api/feedback/public`. Enter sends; Shift+Enter and IME/composition Enter do not. The disclosure identifies Linear, structural context and workspace/team members, with no automatic code changes. Only exact `202 {saved:true}` clears the note/target and shows a top-layer “Logged in Linear” toast above the retained native modal.

Failure keeps the draft and complete input snapshot with the same random request UUID. Reopening, viewport/theme changes, DOM movement or connection retry do not change an uncertain submission. Intentional note/target edits start a new operation. Busy requests disable editing/reselection and fence duplicate Send gestures. Requests have a 15-second client deadline and are aborted on unmount; there is no automatic retry or polling. A confirmed new note starts with fresh selection instead of inheriting the last saved note's pin.

Drafts/keys live only in page memory; reload loses them. Same-origin fetch credentials preserve the existing site Basic gate, not a feedback session/cookie. No Authorization or custom session header is set by the client. The Linear secret/server target cannot enter its import graph; the test suite compiles the actual browser bundle and asserts this boundary.

## Verification

Run the commands in the logging runbook above. Component tests preserve picker hit-testing/full activation suppression, single-field growth, IME, exact failed retry, top-layer toast, focus/Tab/Escape, route/remount/fresh context and viewport clamps. Authenticated legacy client tests remain unchanged. Historical A/H1 + B/H2 context regressions now prove separate public saves and no history or stale target, not a removed historical-followup UI.

`feedback-ui-fixture.mjs` and the synthetic transport/replay use exact task-owned loopback hosts only, with no real identity/provider or writes. Updated browser replay code is for parent execution; component/in-memory bundle verification is not a claim of native browser acceptance. Parent owns full app production checks, exact-revision review, real Linear readback and release.
