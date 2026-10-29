# Metrics cards and recording-hours consolidation

## Revision and limits

Native UI evidence and source/build checks were produced at **`f929a5938fc9f481936497505555239f2c184c14`**, against baseline **`372dc5231011782ce2d59e46689150783eb06c03`**. Any subsequent evidence-only commit must have identical application/data/test trees; screenshots are not relabeled as a different build.

Browser: the existing headed Chromium, production Next build, bound to `127.0.0.1:35872`, base path `/neuro-atlas`. Only the disposable QA checkout replaces the auth proxy with a passthrough marker. The source proxy and shared snapshot remain unchanged. The response marker and all 8 served client JavaScript files were compared to the pinned build (`asset-manifest.json`). **This is local UI evidence, not authenticated hosted acceptance.** No merge or production activation is part of this change.

## Verified behavior

- Exactly five ordered sections: Neurotech Engagement; Human interfaces and recordings; Mapping Scale; Cost and automation; Simulation and NeuroAI. Each defaults to its requested real chart and supports headline-only, preview and full expansion. All three states, non-preview search and fresh links passed at 1440, 390 and 320px.
- One recording-hours chart: 12 source observations in five distinctly labeled scopes, on a shared date/log-hours geometry. No summed scopes or fitted trend. All 85 archived source observation objects remain exact. The former tissue and recording reference presentations are retired; their old URLs route to the retained charts.
- 15 curated chart/timeline pop-outs × 3 widths = 45 native cases. Real plotted marks, one modal, initial empty details, Escape, Close, visible focus wrap/return, keyboard opening and Back/Forward passed. Existing simultaneous-recording capability remains a distinct 7-point chart.
- Whole-integer implanted-human ticks; acquisition economics remains approximate dollars/voxel in Cost and automation; NeuroAI display title has no “over time.”
- Visible qualification notes preserve source bounds/approximations in previews and initially empty pop-outs. Every preview tick/axis title was measured at an effective size of at least 11 CSS pixels at all three widths, including the wrapped timeline date axis. No horizontal axis-label clipping or page overflow was found by the probes.
- All 15 curated card borders were checked in light and dark CSS themes at every width; native screenshots show their actual paint.
- Actual clipboard readback contained PNG + text/plain + text/html. The decoded recording PNG is 2400 × 3300 and retains source scopes and `>50,000` / `>100` qualifications. Its footer is deliberately the local QA URL. Receiving social editors may select only one format; no social posts were made.
- `npm test`: **406 passed, 0 failed**. Typecheck and source production build passed. Receipts are alongside this file.

## Review fixes

The independent candidate review found two material issues: invisible preview qualifiers and tiny preview axes. Those were fixed with red/green regression tests (`chart-preview-integrity.test.mjs`) and measured native evidence (`preview-integrity-results.json`). Native QA also caught stationary-pointer selection when a modal appeared beneath the pointer; inspection now waits for real pointer movement, focus or a click. The full initial review and final disposition are retained in the task's private review record; the PR description reports the final verdict.

## Janelia coverage

Neither resource gained a new numeric point on the open-data-size plot. MaleCNS is already represented in mapped tissue; no matched stored/image byte footprint was verified. Fish Fire&Wire/Fish2 has request-only, restricted access and no substantiated footprint. See [source review](../../janelia-resource-coverage.md). These are explicit coverage limits, not fabricated zeroes or nominal-grid storage estimates.

## Images

| File | What it proves |
|---|---|
| before-hours-desktop.png | Baseline fragmented presentation |
| default-hours-desktop.png | One source-scoped preview in the requested group |
| recording-popout-desktop.png | Enlarged chart and empty initial inspector |
| headlines-mobile.png | Five ordered, headline-only sections |
| recording-preview-mobile.png | Readable 320px preview with strict bounds |
| open-data-preview-mobile.png | Visible public-resource qualifications |
| frontier-popout-mobile.png | Non-time frontier, mobile modal |
| integer-humans-mobile.png | Human-count tick labels are whole integers |
| cards-dark-mobile.png | Visible dark-theme card edges |
| recording-hours-clipboard.png | Real decoded clipboard PNG, local-link footer |

Responsive mouse/pointer and emulated-viewport checks are not a physical-phone or assistive-technology session. Full source tables and longer modal content scroll normally; screenshots capture the named state, not every row at once.
