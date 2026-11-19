# Persistent graph pages for Neuro Atlas

**Recommendation:** make every Field velocity chart a real page at `/neuro-atlas/field-velocity/<stable-slug>`. Cards navigate to those pages rather than opening a dialog. Keep the overview as the place to explore across charts.

**Status:** architecture proposal, not implemented in this footer/methodology PR.

## The reader experience

A chart page begins with **← Field velocity**, then its title, short description and the existing Copy link / Copy chart / Download PNG actions. The full interactive chart sits in the page, with its existing methodology, point evidence, source links and data table below/beside it. No dimmed overview or Close button. Existing chart-specific selectors remain available.

The arrow always works for someone arriving from an external link: it links to the overview, rather than calling browser Back. When arriving from the overview, retain its search, expanded groups, page scroll and horizontal rail positions in tab-local state and restore them on return. A fresh visitor returns to the relevant chart group. A small “More in this group” row below the evidence preserves exploration without competing with the graph.

Example proposed URL:

`https://www.plneuro.xyz/neuro-atlas/field-velocity/bci-information-transfer-over-time`

Keep existing published identity even if its display title changes (“BCI communication rates over time” here). Future renamed slugs get permanent redirects from the old path. Measurement-view choices may use a small allowlisted query parameter; the canonical chart identity stays one stable path.

## What the code already provides

Checked against `protocol/neuro-atlas` main `1b466b72641709bfbbd1e1ae55f556da73cbc49b` and the live Field velocity page on November 19, 2026:

- `src/data/field-velocity-links.ts` already owns explicit slugs and legacy aliases. It contains **25 active chart identities**, matching the live overview’s **25 cards** (8 + 4 + 6 + 4 + 3 across five groups). One additional retired chart identity already has a category fallback.
- Current navigation in `src/lib/field-velocity/navigation.ts` stores chart identity in the fragment. `ChartModal` owns dialog/history/focus behavior and a reusable chart/source/data layout.
- Chart implementations live in four main families: draft scientific charts, performance/pace charts, publication charts and Google Trends. Their existing evidence and provider snapshots should be reused.
- PL Neuro’s host has a catch-all `/neuro-atlas/:path*` rewrite. The route fits the existing mount; a new hosting project is unnecessary. Actual proxied deep-route behavior still needs release verification.

## Implementation approach

1. Extend the explicit chart registry with group and a renderer key; reconcile it to the **actual mounted visible catalog**, excluding retired/unplotted proposals. Add `src/app/field-velocity/[slug]/page.tsx`, static params and per-chart metadata/canonical URLs. Unknown slugs return a real 404.
2. Extract each family’s existing full detail renderer and a shared page layout from the modal wrapper. Render exactly the requested chart with its current providers and evidence; avoid mounting the complete gallery and hiding everything else. Preserve server-rendered titles, descriptions and source links.
3. Turn preview triggers into ordinary links with native new-tab/keyboard behavior. Update internal “related measurements,” Copy link, clipboard/PNG URL footers and export API consumers to the same path helper. Preserve the existing `recordingView` state with exactly one allowed value (`historical`, `electrical`, `human-channels`, or `optical`); reject duplicate/unknown values and keep unrelated query sanitization separate from canonical metadata.

   **PNG filenames:** `downloadChartImage` currently derives the filename from `URL.hash`. Replace that dependency with the registry’s stable slug and optional allowed recording-view suffix, producing `neuro-atlas-<slug>.png` or `neuro-atlas-<slug>-<view>.png`. Test exact nonempty names for direct pages, legacy links and each supported view.

   **Single and bulk export:** `window.neuroAtlas.exportAll()` currently changes the overview hash and waits for a mounted chart to register. Decouple renderer registration from navigation. Retain one export-only host using the same selected detail renderer and providers; resolve each stable chart ID and view, await that host’s readiness/registration, export serially and release it. Both overview-card export and bulk export use this seam without changing the visible path/hash, losing overview state or emitting navigation analytics. Cover the ordinary `exportChart` and `exportAll` APIs and compare output geometry/data/source parity to the on-page chart.
4. Migrate old chart fragments client-side using replace navigation, including all old aliases. Fragments never reach the server, so a server-only redirect cannot preserve old shared links. Keep overview/tab/category fragments and retired category fallbacks working. Do not create empty pages for retired proposals.
5. Add the 25 active paths to the sitemap; retain production indexability and preview noindex rules. Canonical/share URLs use the current public mount, stripping unrelated or credential-like query state while preserving supported measurement views.

## Acceptance before release

Test every active identity, direct load/reload, title/canonical/sitemap, legacy aliases, unknown/retired IDs, native card links, browser Back/Forward and arrow return from both internal and external entry. Compare chart data/source/export parity against the existing full chart. Exercise all four renderer families and every specialized selector; verify desktop and 390/320px, keyboard access, light/dark, feedback context and actual copied/downloaded URLs. Finally check the exact deep paths through the PL Neuro production-style proxy. This migration should be a separate PR so it can be reviewed independently of the footer and source directory.
