# One-field feedback native QA

Runtime source: `372cc68dd718e56a3f25e1f58d1f13c311453c96`. The final evidence-only head is runtime-equivalent; exact-head tests/review receipts are in the PR.

Captures use the **actual Atlas Next production build** mounted at `/neuro-atlas` on a disposable `127.0.0.1:35641` fixture. Only the copied proxy is replaced by a raw-Host/runtime-flag guard; it is never committed or deployed. Its exact source-revision header was checked before native replays. Source auth, scientific data and hosting configuration are unchanged. The owner's private reference recording is not published here.

## Verified interactions

- `native-results.json`: actual heading and native-chart hover outlines, click-to-pin compact composer, exactly ONE textarea/zero input fields, disabled draft retention, reselect/Escape/focus and unchanged underlying native chart at 1440/390/320px. The 320px case is 600px tall. Requested viewport width, actual inner width, document/client width and popup bounds are checked.
- `synthetic-ui-results.json`: actual rendered client with **explicitly synthetic identity/network/popup peers** at those three widths. Picking the original chart's Close button suppresses its full activation sequence. Enter submits; Shift+Enter makes a newline. Failed retry retains identical UUID/body/element; confirmed save closes the composer and shows a real top-layer “Feedback saved” toast above the original modal. Received is not started; no PR/preview is invented. Same-ID follow-up and keyboard focus are exercised. Back and Escape during mandatory historical target selection return to history without another POST; they do not silently select General page.
- `extra-native-results.json`: actual nested theme-button SVG targets its button without toggling it, outline geometry matches the exact button, dark input contrast is measured in the real app, and light mode is restored. At 390 × 1000, a middle-of-page heading pins the composer 8px below its actual outline, rather than at the viewport top. Resizing to 390 × 400 verifies the same mounted composer responds to actual viewport changes and clamps on-screen; this simulates the available-space change from a software keyboard, not a physical-keyboard test. The replay awaits the actual queued placement result after CDP's synchronous metric update. These are pointer/browser checks, not a physical-phone touch certification.
- One replay encountered a backgrounded headed tab after a synthetic popup. Readback showed the composer still open and the page hidden; fronting the same owned page made History work. The helper now fronts/paints before measuring each pointer action. The complete strengthened matrices then passed; no product or auth change was made for that harness issue.

The `feedback-ui-followup-context` component/client regressions actually save A/H1 and B/H2 through synthetic transport, switch routes, cancel A’s mandatory selection using both Back and Escape, then remount and repeat before testing explicit General page/element choices. These are UI intent regressions, not live storage/OAuth acceptance.

## Privacy and integration

New one-field feedback and structural element references are private instructions for the bounded model. Fixed server-owned public metadata and CSS-only validation keep raw notes/references out of publication bundles/PR prose; publisher independently enforces the private-mode scope. Legacy explicitly public tasks remain compatible and their privateComment still never reaches the model. Real HTTP/PGlite/Git tests exercise this boundary, durability, idempotency, cumulative/mixed follow-ups and partial-publication parking. Actual Atlas baseline/candidate full checks supplement the small synthetic-peer integration fixture. See `docs/feedback.md` and `docs/feedback-worker.md` for limits and activation prerequisites.

## Reproduce

Use an owned browser-harness window and the isolated guarded fixture; never a hosted bypass:

```sh
FEEDBACK_QA_ROOT="$PWD" FEEDBACK_QA_OUT=/opt/data/tmp/atlas-feedback-evidence browser-harness < scripts/qa/feedback-browser.py
FEEDBACK_QA_ROOT="$PWD" FEEDBACK_QA_OUT=/opt/data/tmp/atlas-feedback-evidence browser-harness < scripts/qa/feedback-synthetic-browser.py
FEEDBACK_QA_ROOT="$PWD" FEEDBACK_QA_OUT=/opt/data/tmp/atlas-feedback-evidence browser-harness < scripts/qa/feedback-element-browser.py
```

Synthetic script registration is removed in finally; navigation clears its in-page overrides. The optional component-only fixture in `feedback-ui-fixture.mjs` is separate from these full-app captures; its receipts are explicitly qualified in `feedback-ui-receipts.md`.

## Image captions

- `selection-1440.png`: real cursor outline around an ordinary page icon button.
- `button-composer-1440.png`: that exact button pinned to the one-field composer, without activating it.
- `composer-1440.png` / `composer-320.png`: real page-heading feedback; narrow short viewport remains bounded.
- `chart-composer-1440.png`: feedback anchored below the selected plot while its native modal remains open.
- `dark-composer-1440.png`: real dark-mode heading and composer.
- `mobile-anchored-390.png`: a middle-of-page element with the composer directly below, not detached at the top.
- `mobile-keyboard-clamp-390.png`: the same composer remains fully inside the resized 390 × 400 viewport.
- `synthetic-retry-390.png`: one-field failed-save retention using synthetic transport.
- `synthetic-saved-1440.png`: confirmed synthetic receipt, visible top-layer saved toast.
- `synthetic-history-320.png`: versioned follow-up/status, synthetic peers; not a real hosted owner submission.

No live connections, provider spending, unattended service or activation occurred. Hosted owner/OAuth/database/provider/GitHub acceptance remains separate.
