# Atlas feedback frontend

The mounted flow is [visitor feedback → Linear logging](../../../docs/feedback-public-linear.md): **no visitor account/sign-in**, one note and structural picker. There is no bot conversation, visitor history/status list, account or PR UI. The legacy owner OAuth API/client remains separate and disabled.

## Entry points, native layers and selection

`FeedbackTrigger` is the only feedback/contribution action: bottom-left in the desktop sidebar, and left-aligned in the footer below the large-screen breakpoint. Plate headers, the landing hero and mobile header have no duplicate Feedback or Contribute via PR buttons. The layout mounts one page-lifetime `Feedback` controller with no floating launcher. **Feedback** / **Alt+Shift+F** starts fresh picking, even when unsent text is retained. Curated chart open events can supply an allowlisted target directly.

The picker only highlights elements; there is no visible instruction card, General page or Back button, and those controls/copy are not relocated. Screen-reader-only instructions describe selection/cancel. Clicking pins the structural element and opens a compact native `dialog.showModal()` beside it. Escape cancels fresh selection without opening the composer; pressing Feedback again also cancels, including on mobile. Canceling **Select element** from an active composer returns safely to its still-active pin and text.

A true exit via Close, Escape or Done clears the target, pin and hover. Reopening must select again; only unsent text is retained. A confirmed **New feedback** also starts fresh selection with an empty note. The composer/confirmation flips and clamps to the visual viewport, including narrow/short mobile and resize. No chart ordering/actions/IDs or scientific data changed.

The picker is a pointer-pass-through manual popover, portaled into an existing native chart dialog when present. Capture-phase pointerdown/up, mousedown/up and click suppression prevent activation of underlying controls; pinning occurs at click, not pointerup. Escape is handled layer-by-layer without closing the original chart. The composer traps visible controls and returns focus on exit; confirmation focuses Done and remains in the same native dialog.

`selection.ts` sends only bounded tag/nth-of-type selector, tag, optional role/static classes and allowlisted chart context. Its local label never travels. No live input values, DOM/HTML/text snapshots, href/URL, screenshot, query or fragment are captured.

## Send, confirmation and retry

`PublicFeedbackClient` sends `{feedback, context}` to the mounted `/api/feedback/public`. Enter sends; Shift+Enter and IME/composition Enter do not. The old long helper paragraph is removed entirely, without replacement or tooltip. **Logging and workspace/team visibility are unchanged.**

Only exact `202 {saved:true}` clears the note and replaces the composer content with a persistent accessible status: **“Thanks for your feedback.” / “It’s under review. Check back soon.”** There is no toast, timeout, automatic processing, tracking, polling or PR promise. Close/Done dismiss explicitly; New feedback starts a deliberate new note. The former target is retained internally only to anchor the confirmation until exit/new selection; its outline is hidden.

Failure keeps the draft and complete original input snapshot/UUID. Busy requests fence duplicate gestures and disable editing/reselection; exiting does not permit reopening into another operation while a request is in flight. After exit, a fresh explicit choice of the unchanged original DOM element/route can reconcile the genuine retry with the same UUID and bytes. A different/replacement node or route is an intentional new target even when its structural selector matches the old one; it cannot silently reuse the exited snapshot. Intentional note/structural-target edits start a new operation. Viewport/theme/DOM movement during an unchanged retry does not alter it.

Drafts/keys live only in page memory; reload loses them. Requests have a 15-second client deadline and abort on unmount. Same-origin credentials preserve the existing Basic site gate, not visitor identity. No Authorization/custom session header is added. The Linear key and fixed server target stay outside the browser import graph.

## Verification and selectors

Run the focused commands in the logging runbook. Component tests cover retry bytes/UUIDs, pending fence, exact receipts/negative writes, persistent confirmation, selection/no-toolbar/cancel, true-exit deselection, IME, growth, native chart layering, focus/Tab/Escape, route/remount and viewport clamps. Trigger tests verify both retained responsive placements, the three duplicate-free surfaces, and the same event/controller. A/H1 and B/H2 are actual separate synthetic-transport saves, not fabricated history.

Stable selectors: `[data-feedback-trigger]`, `[data-feedback-selection]`, `[data-feedback-composer]`, `[data-feedback-success]`, `[data-feedback-submit]`, `[data-feedback-close]`, `[data-feedback-done]`, and textarea `[aria-label="Feedback"]`. Multiple responsive triggers are rendered: native tests must choose a visible one.

The component-only loopback fixture now mounts the reusable trigger. The old `feedback-*-browser.py` replays are explicitly historical because they assume the removed toolbar/toast. Parent integration owns the new exact-revision native `native-qa.py` replay using actual Next/HTTP with an explicitly synthetic Linear peer, plus full suite/build, independent review and release evidence. No browser execution, provider write, push, activation, merge or deployment is claimed by component tests.
