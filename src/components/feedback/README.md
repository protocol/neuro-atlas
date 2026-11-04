# Atlas Feedback frontend

Mounted once in the root layout. The native `dialog.showModal()` layer is opened after an existing chart dialog, so the chart remains in the browser top layer underneath it. Selection keeps that feedback dialog open but transparent; it selects curated identities and geometry, never DOM content. Escape exits selection, then feedback, then leaves the chart's existing Escape behavior alone. Alt+Shift+F uses the physical KeyF fallback for Alt-composed keyboard layouts and is ignored in editable controls.

Chart actions (separate PR77) may dispatch:

```ts
window.dispatchEvent(new CustomEvent('atlas-feedback-open', {
  detail: { targetId: 'simultaneously-recorded-neurons' }
}));
```

Unknown IDs are ignored. General page has no chart/target identity. `selection.ts` derives draft/metric panel identities from Atlas's existing curated chart-link registry and separately lists the existing performance/trends chart identities. No query string, fragment, raw DOM, input text, screenshot, scenario, or deployed revision is attached. Public context is frozen at the separate review step. Raw private comments never prefill the public title/summary/acceptance criteria.

`FeedbackClient` uses `atlasPath()` for every real API request, `X-Atlas-Feedback-Session` rather than Authorization, no-store and same-origin browser credentials to preserve the existing Basic gate. It does not set/read cookies or use browser storage. The existing mount's cookie stripping remains unchanged. OAuth state/verifier/session live only in page memory. Popup creation is synchronous with the click; exact origin, popup source, message type and single-use state bind finish. A normally closing callback popup does not cancel an already-consumed transaction. The absolute five-minute deadline still covers delayed finish. Close/dispose abort and remove the listener/timer. No live OAuth/provider connection is claimed.

Submission success requires a real 202 receipt. The exact draft and UUID idempotency key are retained across failed retries. Follow-ups use the existing feedback ID plus `expectedVersion`. Only actual status DTOs create PR/preview links; PR URLs must match the fixed repository and previews must match the reported PR head SHA. `received` explicitly does not claim a worker started. Disabled/disconnected/unavailable backend states retain the draft and do not fake a PR.

## Verification

```sh
node --import tsx --test tests/feedback-ui*.test.mjs
./node_modules/.bin/eslint src/components/feedback/*.tsx src/components/feedback/*.ts src/lib/feedback-client.ts
```

React/jsdom lifecycle tests execute the actual component and actual client against explicitly synthetic fetch fixtures. Native top-layer rendering, 320/390px visual checks, the full integrated build and real API end-to-end tests are integration-owner work. These tests are not live GitHub OAuth evidence.

Backend owns `src/lib/feedback/contracts.ts`; the frontend imports its DTO types and shared curated selection constants rather than maintaining a second contract. Run the integrated `npm run typecheck` (Next route type generation followed by project TypeScript) as a separate gate from component tests.

**Integrated selection contract:** `contracts.ts` exports the shared curated chart-ID allowlist consumed by both `selection.ts` and strict intake validation. `tests/feedback-context-contract.test.mjs` independently enumerates the public link registry and verifies every selectable identity is accepted while arbitrary DOM IDs remain rejected.
