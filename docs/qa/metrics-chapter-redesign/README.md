# Metrics: numbered chapters and compact chart cards

## Requested change

Bring the reviewed Field velocity redesign mockup to the live **Metrics** tab. Scope is limited to Field velocity → Metrics (catalog toolbar, group headers, chart rail cards and chart pop-outs). The hero, the Inflection points tab content, the sidebar and every other page are unchanged; the shared tab bar only changes position while Metrics is selected.

## What changed

- **Tabs inline with search.** On plates ≥900px wide, the Metrics / Inflection points rail and the catalog toolbar share one row (CSS subgrid on a `.velocity-tabs` wrapper; no DOM moves, so `MetricsSection` still owns its toolbar). Below 900px, and whenever Inflection points is selected, the rail sits on its own row as before.
- **Toolbar.** Intro line removed; one row with a search field (icon, "Search 24 charts — try H01, mouse, recording hours…", count derived from the rendered rails) and quiet Expand all / Collapse all. The "Search charts" label stays as a screen-reader label. Clear search only shows while a query is active.
- **Groups as numbered chapters.** Each group is a bordered, rounded chapter with a tone badge (01–05), a coloured left edge and tint, its existing `METRIC_GROUPS.summary` line, a rendered chart count and a round ± indicator. The whole header is the hit area; the existing `data-metric-toggle` button remains the only control and its accessible name is still exactly the group name. Tones: blue, teal, purple, orange, pink in reading order.
- **Compact rail.** About 3.3 cards per row on desktop (three plus a peek), two plus a peek on mid-width plates (container query), unchanged one-card-plus-peek on phones.
- **Card chrome.** Short signature tab in the group tone (as on exported PNGs), decorative expand icon (top right, the card was already the click target), accent hover, tighter padding, one footer row.
- **Shorter previews, capped cards.** Draft preview plotting band 200 → 130px; Google Trends preview 238 → 180px. Expanded/exported chart geometry is unchanged. `useMetricCardHeight` honours an optional `--metric-card-max-height` (340px on Metrics): cards still share one height, and a preview taller than the cap fades out above the footer (`data-metric-clipped`) instead of stretching every card.
- **Grey source line in every card footer.** Each card's existing qualifier moves from the (now clippable) preview body into the footer row next to the buttons, so the cap never cuts it off: draft scope and dataset lists, curve/pace `coverage` and preview notes, publication scope lines. Trends cards get "Google Trends · worldwide · weekly index 0–100", composed from facts already stated in its pop-out. No new claims. Long lines fade at the edge and scroll sideways (trackpad/shift-wheel, or click-and-drag); the full text is also the tooltip.
- **Copy PNG on every card.** Copies the same branded PNG as the pop-out's Copy chart. The card asks its own pop-out content to mount in an inert, `aria-hidden`, off-screen host (`ChartModal offscreen`), waits for that chart's share control to register, builds the image with the existing `buildChartImage`/`chartPng`, then unmounts it. No dialog opens, the URL hash is untouched, and the clipboard write starts inside the click (`copyDeferredChartImage`) so user activation is kept. Verified for all 24 cards in Chromium; output matches the pop-out export visually (byte-level PNG encoding differs).
- **Pop-out chrome.** Round close button overhanging the top-right corner (accessible name unchanged), title vertically centred, panel scrolls internally so the close control never scrolls away.

## Deliberate reversals of earlier pinned decisions

These tests pinned the previous design and were updated, not deleted:

| Test | Previous contract | New contract |
|---|---|---|
| `metrics-grid-breakpoint`, `chart-landscape-rails` | one landscape card (`(100% - 1rem)/1.25`) | three cards and a peek (`(100% - 2.625rem)/3.34`), two-and-a-peek mid-width |
| `chart-landscape-rails`, `draft-chart-popout`, `neuroai-axis-break` | preview band 200px, Trends 238px | 130px, 180px (expanded frames unchanged at 232/270) |
| `metrics-rails` | sibling divider lines between headline-only sections | bordered, numbered chapters with tone |
| `metrics-flat-cards` | intro sentence once; no group summary | no intro sentence; summary shown per chapter |

New tests: `metrics-chapters.test.mjs` (numbering, summaries, counts, placeholder total, toggle name, scope in footer), `metrics-card-png.test.mjs` (off-screen host is inert/hidden and not a dialog; every card has Copy PNG and a source line; a card export mounts once, writes once inside the click, opens no dialog, leaves the hash alone and cleans up) and a cap/clipping case in `metrics-equal-heights.test.mjs`.

## Not ported from the mockup (follow-ups)

- **Trend chips** under card titles ("Accelerating · peaked Jun 2026", "×593 since 2017", …): new quantitative claims per chart; deferred until each has a data rule and reviewed wording.
- **Pop-out content reorganisation** (separate PR): actions in the header row next to close, two-column reading / "Sources & data" split, drag-to-measure deltas on line charts, extra year dividers on Citation latency.
- Inflection points count badge on the tab.

## Executed checks

- Full `npm test` file set (`tests/*.test.mjs`): **1190 / 1193 passed**. The 3 failures are `public-data-inventory` (`mkdtemp '/opt/data/tmp/…'`), environmental, and fail identically on `main` @ `2b399f7`. The focused Metrics/chart subset on `main` passes 734/734 before the layout-pinning tests were updated.
- `npm run typecheck` and ESLint on all changed files: clean. `git diff --check`: clean.
- `npm run build` could not complete in the sandbox: `next/font` cannot reach fonts.googleapis.com from there. Not related to this change; needs a CI/hosted build.
- Browser checks (Chromium, local dev server): header click via summary/count toggles the group; search shows Clear and the status line, Clear hides it again; card click opens the pop-out, close sits 9px outside the corner and stays fixed while the panel scrolls, Escape closes; drag on a clipped scope line scrolls it without opening the chart; Copy PNG succeeds on all 24 cards with no dialog, no hash change and no leftover export host; tabs and toolbar share one row at 1440/1024px and stack at 390px; Inflection points renders as before; no page errors. Dark theme checked visually.

## Evidence and boundaries

`before-*.png` from `main` @ `2b399f7`, `after-*.png` from this branch, at 1440px and 390px plus one pop-out. These are **local dev-server captures from disposable loopback-only copies** with the Basic-auth proxy file removed in the copy only; that copy is never committed or deployed and the production auth source is unchanged. No hosted/authenticated verification is claimed.
