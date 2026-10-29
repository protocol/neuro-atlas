# Chart clipboard sharing

`Copy chart` snapshots the selected numeric SVG, not its surrounding card or viewport. One `ClipboardItem` contains `image/png`, `text/plain` (the absolute direct chart URL), and `text/html` (an escaped image + link for rich editors, when supported). Clipboard writes occur only after an explicit click. The browser may require a secure context and permission.

**Recipient applications choose which format to paste.** Successful clipboard writing does not establish that X, LinkedIn or another editor accepts the image, or pastes both image and URL. Some editors ignore clipboard images. `Download PNG` and the existing separate `Copy link` remain explicit fallbacks; failure never silently overwrites the clipboard or downloads a file. No public post is part of QA.

## Export contract

- Full original SVG viewBox and exact plotted geometry, intervals, marker shapes, colors, targets and selected scenario/track; not the clipped mobile scroll viewport. Pointer-only marker emphasis and tooltip/UI/disclosure scaffolding are excluded.
- Observation-level qualifiers (≈/≥/> or their source words) are rendered visibly with the exact observation identity and unit. Hover/accessibility metadata is not sufficient for a standalone PNG; filtered reference exports include qualifiers only for the plotted selected points.
- Portable system fonts and resolved light/dark paint; title, axes, actual legend, source/scope notes, Neuro Atlas and chart link are rendered into the image.
- SVG geometry/paint allowlist, no foreignObject, active markup, stylesheet/resource URLs, external rendering service or data upload. Rich HTML is constructed from escaped text and the generated PNG, not copied HTML.
- 1200 CSS-pixel export width, normally rasterized at 2×; large images are capped at 16 MP / 8192 px per side. Overlong exports fail explicitly, not by clipping qualifiers. Height follows the full chart and wrapped metadata.
- Image sharing strips URL username/password and **all query parameters**; preserves origin, path/basePath and validated chart fragment. Existing navigation and Copy link behavior is unchanged. The stable chart link identifies the panel; it does not encode transient track/extrapolation controls. The PNG preserves those controls' plotted state. Copy/download is disabled during extrapolation motion.
- Rendering tests use actual React components, data, SVG serialization and payload code with only native clipboard/raster/download boundaries replaced. They are not evidence of native browser image decoding or recipient-editor paste behavior.

## Actual chart inventory

14 visible curated numeric panels, all individually shareable:

- `#metric-panel-tissue-cm3`
- `#metric-panel-largest-connectome-neurons`
- `#metric-panel-largest-connectome-synapses`
- `#metric-panel-acquisition-rates`
- `#metric-panel-acquisition-economics`
- `#metric-panel-pathfinder-nerl`
- `#metric-panel-connectomics-roboem-human-split-merge`
- `#metric-panel-proofreading-effort`
- `#metric-panel-neuralink-cumulative`
- `#metric-recording-hours` (all five former dataset-panel fragments remain aliases)
- `#metric-panel-paired-manual`
- `#metric-panel-public-data-size`
- `#metric-panel-flyvis-contrast`
- `#metric-panel-neuroai-imagenet`

Three additional numeric Performance/Pace modal panels: `#simultaneously-recorded-neurons`, `#idea_vintage`, `#latency_compression`. The redundant tissue/hours reference views are no longer mounted; their fragments resolve to the curated charts.

Two Google Trends modal panels: `#google-trends-neurotech`, `#google-trends-neuralink` (separate normalization retained).

Total: 19 independently addressed numeric panels. Modal thumbnails open their full plot; they are not exported as tiny previews. Multi-panel curated cards say **Copy card link**, with each plot's own **Copy chart** and **Copy link** below it.

Other SVG families were inspected: the selected-application categorical timeline retains its existing links, not numeric-chart sharing; milestone timeline connectors, icons, landing artwork and unavailable-chart illustrations are not numeric panels. The Milestones 2026 cumulative-capital inline Sparkline is a contextual mini-summary without a standalone panel URL/axes, outside this Metrics sharing surface; no misleading whole-page image control was added there. No source observations or scientific caveats were removed. The retired duplicate reference presentations and their preserved aliases are documented separately.

## Native QA entry points (parent-owned)

Use the exact frozen SHA, existing loopback-only fixture workflow and preserved production auth. Never run the historical unsafe local-auth-adapter or read gate credentials.

At 1440/390/320px in light and dark:

1. Open `/field-velocity#metric-panel-connectomics-roboem-human-split-merge` (prepend configured basePath). Copy/download; inspect actual PNG dimensions, axes, small marker shapes, legend, source scope and footer. Exercise the unified recording-hours chart: one twelve-point scatter, five labeled colors, shared log-hours axis, generic `#metric-recording-hours` export URL and visibly observation-linked >50,000 / >100 qualifications.
2. Open each of the five additional modal fragments above. Copy and inspect native ClipboardItem MIME types and decoded PNG; verify source marks/intervals and correct absolute per-panel links. Google Trends keeps complete weeks and missing gaps.
3. On the unique neuron chart, toggle extrapolation and change scenario/track; wait for motion to settle, export, inspect targets/scientific qualifiers. On/off exports must not freeze a hovered tooltip or mutate source values.
4. Deny image clipboard permission, try unavailable API, and verify accessible error plus separate PNG download and existing Copy link. Cancel/close during a pending export, reopen and retry. Check keyboard focus and narrow action-row bounds.
5. Paste into an unsubmitted local rich/text editor to characterize selection of representations. Never claim social-site image support from MIME presence alone. Social receiver behavior is separately parent-tested; no automatic post/upload.

Commands: `node --import tsx --test tests/chart-export.test.mjs tests/chart-sharing.test.mjs`; full `npm test`; `npm run typecheck`; `npm run build`.
