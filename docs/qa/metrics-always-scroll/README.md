# Metrics: always-visible horizontal chart rows

## Requested change

Field velocity → Metrics no longer offers **show more charts** or **show only featured**. Every section opens with its full existing chart inventory in one horizontal rail. Section and chart order are unchanged; heading/global collapse controls remain, and reopening a section restores its full row.

Only `src/components/sections/metrics-section.tsx` and `src/components/draft-chart-plot.css` change application behavior. The obsolete button CSS and its reserved space are removed. Measurements, chart renderers, source records, auth, URLs, exports, and theme policy are unchanged.

## Executed acceptance

Native headed Chrome, production builds, at **1440 / 390 / 320px**:

- Initial inventories equal the independently captured expanded rails from baseline main `50433cb305302e8495b6692c35d18c1d8b6613ba`, including the distinct scalar context reading. All 20 plotted chart cards remain available.
- All five rows scroll horizontally using native wheel input and show a partial next card at rest; cards stay on one row, with no document-level horizontal overflow.
- Preview heights remain equal across the 20 chart cards at each width; scientific SVG dimensions and content are not squeezed.
- Search/clear and heading collapse/reopen retain the complete chart inventory and its order.
- Keyboard focus reveals an offscreen peer locally; native Enter opens its modal, and Escape restores trigger focus.
- Copy link succeeds on the first click and native clipboard readback matches the chart URL. The tested peer was partially visible at 1440/390px, fully visible at 320px.
- Fresh reference-chart URLs open with Close focused and dismiss with Escape.

Evidence: `native-results.json`, `sharing-results.json`, `baseline-order.json`, and matched desktop/mobile before/after screenshots. The order regression test separately pins the established literal chart identities.

## Code checks

- Regression first: the new always-scroll test failed on baseline because five `data-metric-more` controls remained, then passed after implementation.
- Updated focused Metrics tests: **106 passed**.
- First full `npm test`: **463 passed**, zero failures/skips. A repeated full run passed 462/463 and hit `performance-modal.test.mjs:36` (Forward restoration after its fixed 30ms wait). That isolated component/test and navigation/helper sources have no changes in this PR; the targeted rerun passed **6/6**, and native Back/Forward modal replay passed at all three widths (`history-results.json`). This intermittent test result is retained rather than silently called a clean repeat.
- The final literal-order regression passed separately after its expectations were pinned to baseline identities.
- Independent clean-critic review: **PASS**, no supported blocking defects in the two application diffs or rendered desktop/mobile evidence; exact source bytes match the reviewed/native-tested candidate.
- `npm run typecheck`, `npm run build`, targeted ESLint, and `git diff --check` passed.

## Verification boundaries

These are **local production-build captures** from disposable loopback-only checkouts. A test-only proxy fixture is never committed, pushed, or deployed; both QA servers bind exclusively to `127.0.0.1`, check the raw Host/runtime flag, and reject a negative-host request. Production auth source is unchanged. This evidence does not claim authenticated hosted UI verification or a production release.
