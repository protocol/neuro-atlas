# Visitor feedback → Linear (logging only)

Every visitor who can access Atlas can send feedback **without a Linear or GitHub account/sign-in**. Existing site Basic Auth/noindex remains unchanged. The mounted UI is a compact single-field chat-like composer after structural element selection, launched by the bottom-left/footer Feedback trigger; there is no public feedback list, history, owner identity, model, proposal automation, PR or deployment promise.

## Operator configuration

- `FEEDBACK_PUBLIC_INTAKE_ENABLED=true` — dedicated server-only switch; unset/anything else disables this intake.
- `FEEDBACK_LINEAR_API_KEY` — server-only environment secret. Never `NEXT_PUBLIC_*`, a browser value, a response, a log or a repository file. Use a dedicated restricted personal key with Read + Create/update issues and only the PL-R&D team. No visitor credential is requested.
- Keep legacy `FEEDBACK_ENABLED`, `FEEDBACK_WORKER_ENABLED` and `FEEDBACK_PUBLISHER_ENABLED` unset/false. This public intake does not use their OAuth/database/worker/publisher machinery or remove human review controls.
- Preserve the existing nonsecret `NEXT_PUBLIC_BASE_PATH=/neuro-atlas` mount setting.

No backend key or dedicated switch means no Linear request; config exposes only `{enabled, connected}` booleans. `connected` means the required server configuration is present, not that a health check or save succeeded. Failures never clear the draft or claim a save. Environment changes require the host's normal redeploy/restart; there is no configuration endpoint.

Fixed, parent-verified Nov. 10, 2026 target (not visitor/env-selectable):

| Field | Value |
| --- | --- |
| Team | PL-R&D — `4e2891ec-4382-46ca-8f2d-bfb3a1c00304` |
| Project | Neuro Atlas — `18f2619a-8795-4767-9806-e171a02fd1ca` |
| State | Backlog — `75d31d77-99fb-46dd-99d4-4bf68392bb53` |
| Priority / assignee | `0` / `null` |
| Default template / labels / subscribers | `false` / `[]` / `[]` |

Backlog logs the note for later human queueing; it is not active work or approval to process it. PL-R&D is workspace-visible, not project-private. Disclosure: “On Send, feedback is logged in Linear with structural context, visible to Protocol Labs workspace/team members. No automatic code changes.”

## API and privacy contract

- `GET /neuro-atlas/api/feedback/public/config`: booleans only. `POST /neuro-atlas/api/feedback/public`: create/reconcile exactly one issue. No public read/list/history, arbitrary ID lookup, provider URL, GraphQL proxy or update endpoint. Legacy authenticated paths remain separate and unchanged.
- POST requires the exact production `Origin: https://www.plneuro.xyz`; wrong/missing/null origins and cross-/same-site fetch metadata are rejected. GET rejects a wrong Origin when supplied. No CORS grant or feedback cookies. The browser preserves same-origin credentials for the existing site Basic gate; this does not add visitor identity.
- Strict JSON `{feedback, context, screenshot?}`; unknown fields rejected recursively. Feedback is 1–3000 characters with existing control-character restrictions. Streaming bodies are bounded at 1,064,960 bytes for the base64 PNG plus existing context (legacy image-free requests retain 16 KiB). Context uses the existing route/chart/scenario/viewport/theme and bounded structural-element schema; no DOM HTML/text dump, input values, query/fragment or caller URL is accepted. Screenshot handling and private custody are specified below.
- Title is fixed. Note and structural context are separate literal fenced blocks, with a fence longer than every backtick run in the value. Arbitrary instructions, mentions and URLs stay inert text, not commands, author identity or public GitHub metadata. A real native MCP storage probe (PLR-108, parent-run) established Linear's blank line before each fence; formatter emits that canonical shape. Full description comparison remains exact, including interior bytes.
- Fixed `POST https://api.linear.app/graphql`, personal-key `Authorization: <API_KEY>` (no Bearer), `redirect: error`, no-store, a 12-second whole-operation deadline and 48 KiB streamed provider-response limit. HTTP errors, GraphQL errors even on HTTP 200, malformed results and transport errors are not raw response/error prose. All app responses use private/no-store, no-referrer, noindex/nofollow and nosniff.
- Per-instance best-effort protection: burst 30, one token replenished per 2 seconds, at most four in-flight submissions, bounded scalars rather than unbounded IP/client maps; `429` supplies a 2-second Retry-After. This is **not distributed/global abuse prevention** or a user identity guarantee. Hosting must not log request bodies, API keys or raw upstream responses.

Only explicit local test mode may replace the origin: `NODE_ENV=test`, `FEEDBACK_PUBLIC_INTAKE_TEST_MODE=true`, `FEEDBACK_PUBLIC_INTAKE_TEST_ORIGIN=http://127.0.0.1:<port>` (or IPv6 loopback), with neither Vercel flag. No environment variable can change the provider endpoint or target. Fetch injection is an in-process test seam, not runtime configuration.

## Retry identity and confirmation

The client generates a random UUID v4 and retains it with the complete input snapshot while a save is uncertain. Closing/reopening, viewport/theme/DOM movement and connection retry do not mutate it. An intentional note/target edit starts a new operation. No automatic retry loop exists; duplicate click/Enter is fenced while busy. True exit clears visual selection and a retained note always reopens into fresh picking, never implicit General page. Explicitly choosing the unchanged original DOM element/route may reconcile the genuine same-UUID snapshot; a new/replacement node or route cannot inherit it even if the structural selector is identical.

A domain-separated SHA-256 digest of that random request key produces a deterministic UUID with Linear's required v4 bits. The backend queries that exact ID in the fixed team/project before any create. Absent records get at most one create attempt, with explicit fields. Success is returned **only after independent exact source readback** of ID, title, entire description, team/project/Backlog, priority and assignee. Lost/duplicate/error mutation responses reconcile once with the same ID, never a fresh create identity. Same key with a different payload returns conflict, never overwrites or confirms the other note. A server restart/another instance still finds the same issue; existing records manually changed or moved fail closed rather than being overwritten.

The browser receives only `202 {saved:true}`, no issue body, ID, URL or other visitor's history. Only that exact receipt clears the note and replaces composer content in the same native dialog with persistent “Thanks for your feedback.” / “It’s under review. Check back soon.” Close/Done exit explicitly and clear target/pin/hover; New feedback starts an empty note and fresh selection. This copy is an acknowledgment for human review, not automated processing or a visitor status tracker. No toast or auto-dismiss remains. Draft and retry identity are page-memory only; reload/navigation that unmounts the page loses them. No sensitive browser persistence or new hosted database was added.

Official schema verification: [`@linear/sdk` 101.1.0](https://registry.npmjs.org/@linear/sdk/101.1.0) `IssueCreateInput.id` explicitly accepts a UUID v4 string; `IssueFilter.id` uses `IssueIdComparator.eq: ID`. [Official GraphQL docs](https://linear.app/developers/graphql) specify personal-key transport and HTTP-200 GraphQL errors. The implementation does not add the SDK dependency.

## Local verification and release boundary

```sh
node --import tsx --test tests/feedback-public-*.test.mjs tests/feedback-ui-*.test.mjs tests/feedback-trigger.test.mjs tests/feedback-simple-contract.test.mjs tests/feedback-context-contract.test.mjs
npm run typecheck
npx --no-install eslint src/lib/feedback-public src/lib/feedback-public-client.ts src/components/feedback/feedback.tsx src/components/feedback/feedback-trigger.tsx src/components/site-nav.tsx src/components/plate-header.tsx src/app/page.tsx src/app/api/feedback/public tests/feedback-public-*.test.mjs tests/feedback-ui-overlay.test.mjs tests/feedback-ui-followup-context.test.mjs tests/feedback-ui-chat.test.mjs tests/feedback-ui-selection.test.mjs tests/feedback-trigger.test.mjs scripts/qa/feedback-synthetic-transport.js scripts/qa/feedback-ui-fixture.mjs
git diff --check
```

Tests use explicitly synthetic Linear peers (including real loopback HTTP), component DOM and transport fixtures; no actual credential/provider call is required. An actual browser bundle is compiled in memory and checked for secret/backend-scope/legacy-OAuth exclusion. Existing picker/focus/Escape/IME/retry/viewport/mobile contracts remain covered. The old toolbar/toast native replay scripts are marked historical, not current acceptance. Parent integration supplies the current exact-revision `native-qa.py` replay against actual Next/HTTP with a synthetic Linear peer. Actual browser execution, full standard suite/build/audit, independent review, native Linear acceptance and exact-head release remain separate parent integration gates. This implementation itself neither pushes, deploys nor enables a flag/key/service.

## Selected-region screenshots (PR-only change)

- Selection synchronously freezes the current card/chart or bounded surrounding DOM, computed styles, SVG geometry and already-loaded logo/canvas pixels. It renders that frozen clone in the visitor’s browser, not a fresh server fetch of the route. Maximum output is 1200 × 800 at 1×, 768 KiB PNG, with a blue selected-element outline. Only the visible viewport intersection is captured, never the full page. The snapshot is never mounted in the live page.
- Feedback chrome, editable controls (including their values), explicitly marked `[data-feedback-private]` regions, scripts and embedded browsing/media contexts are excluded. Loaded same-origin/CORS-safe images and canvas pixels are frozen to data URIs locally. Unsupported/tainted/not-yet-loaded resources, excessive DOM size, offscreen/full-page selection or a four-second render failure produce a visible unavailable state. No screenshot is invented: Enter remains blocked until re-selection or explicit **Send without screenshot**; that choice is recorded in Linear. DOM capture is a best-effort browser rendering, not an OS-level screenshot; unmodeled pseudo-elements/complex paint may differ.
- A small memory-only preview confirms what is about to be sent. The exact image and selection-time context stay with the complete uncertain UUID/input snapshot; note edits create a new operation but do not recapture the selected scene. Closing/reopening cannot replace an uncertain image. No browser persistence, public blob URL, object-store service or GitHub image publication is introduced.
- The server strictly checks PNG MIME/signature/base64/decoded bytes, matching dimensions, single frame and full bounded decode with Sharp before provider work. Visitor URLs/SVG uploads are never accepted. The existing fixed Linear API calls native `fileUpload` with `makePublic:false`, then PUTs bytes to its returned signed destination, **before issue creation**. This avoids relying on data-URI Markdown import and ensures the initial issue-created notification can see the image.
- Upload egress accepts only exact HTTPS `storage.googleapis.com` or `uploads.linear.app`, with the asset’s exact path suffix, a signature query, no user info/port/fragment, a bounded header allowlist, no redirects and no Linear-key forwarding to storage. Assets must be unsigned `https://uploads.linear.app/<workspace>/<file>[/<name>]` URLs. No public/signed image URL is returned to visitors or put in GitHub. Unknown provider storage shapes fail closed, pending an explicitly reviewed native shape check; they do not enable arbitrary cloud hosts.
- Before acknowledgment, an anonymous asset GET must deny access (401/403), authenticated GET must return the identical PNG hash, and the fixed-scope issue must independently read back the full unchanged note/context plus image hash/dimensions/URL. Failed uploads/custody/readback never yield a save receipt. Retries read the deterministic issue before any new upload/create. If a process dies after an upload but before issue creation, an unreferenced **private** upload can remain and a later explicit retry can upload again; concurrent initial retries can similarly leave an extra private upload while producing only one issue; no unsafe broad deletion or new retention job is added.
- This uses the existing server connection only. Whether the currently restricted Production key permits native file upload and exact authenticated asset readback must be verified in that secret-bearing runtime before release; no credential was retrieved or broadened here. Local tests use a labeled synthetic provider, not proof of the production key’s permissions or GraphQL Markdown normalization.

### Slack visibility is a separate evidence layer

The image is embedded in the initial private Linear issue description, not only in an attachment metadata field. Existing Linear project notifications remain the only Slack delivery route: no webhook, bot, public image host, new service or monitor is added. Native Linear documentation describes private storage and rich Slack previews but does not guarantee identical formatting for every notification. A separately authorized, source-free native upload/issue smoke confirmed an image **inline in the existing Slack issue-created notification**, as well as in Linear; that used the operator/MCP identity, **not** the website’s restricted server key. The exact website-key → hosted visitor → Linear → Slack image roundtrip remains a release check, not a claim made by the synthetic replay. Never publish private Slack or visitor screenshots as public PR evidence.

### Reproduce locally without real credentials

```sh
# New private output directory outside the checkout; copies source and isolated dependencies.
FEEDBACK_SCREENSHOT_QA_OUT=/private/temp/neuro-feedback-qa node scripts/qa/feedback-screenshot-fixture.mjs
# In your task-owned browser-harness window, after the loopback HTTP health check:
FEEDBACK_SCREENSHOT_QA_OUT=/private/temp/neuro-feedback-qa/evidence browser-harness < scripts/qa/feedback-screenshot-browser.py
```

The fixture binds only 127.0.0.1:35643/35644 and replaces the **copied** proxy/runtime with an explicit synthetic origin/provider seam. The committed site gate and production provider selection are unchanged. The replay captures the actual Milestones Capital lane with real logos and SVG, plus an actual Citation latency SVG, at desktop/390/320; checks short-mobile resize, capture exclusion, complete frozen retry and actual Next HTTP → synthetic upload → private bytes → issue readback. Keep its captures/receipts outside the public repo, stop the exact fixture and close only the task-owned tab when done.

The content regression `scripts/qa/feedback-screenshot-content-browser.py` additionally renders source-free colored landmarks through an exact-head esbuild bundle of `screenshot.ts`. It checks the selected landmark's actual PNG pixel at the predicted highlight center under nonzero horizontal/vertical cropping, nested two-axis scrolling and a retained root transform, while mutating the live target after capture begins. This is a raster-content/alignment check, not merely a matching transport hash. The main native replay also includes the real mobile Commercial-lane selection with its timeline root above the viewport. Cropping is applied by a dedicated translation wrapper, not a negative absolute top/left on the cloned root.
