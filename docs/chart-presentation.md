# Field velocity chart presentation

The shared role contract lives in `src/lib/chart-presentation.ts`; the family CSS is regression-checked against it.

- Preview heading: **16 CSS px**, 600 weight, 1.4 line height; wrap naturally.
- Shared modal heading: **18 CSS px**, including narrow screens.
- Numeric/date ticks, units and axis captions: **12 actual CSS px** in both previews and full charts.
- Legends and essential supporting labels: **12 CSS px**, with wrapping retained.
- Existing Atlas semantic colors, scientific marks, source positions/scales/qualifiers and measurement definitions are unchanged.
- Existing preview/expanded/focus marker radii remain 4/5/7 screen px, with 1.5px non-scaling outlines.

`usePreviewFont` is the shared screen-space presentation hook despite its historical name. Fixed-viewBox Curve/Pace/reference previews and full Curve/Trends plots use the actual screen CTM (including height-capped letterboxing), with width/height fallback, invalid/hidden measurement retention and observer cleanup. Width-adaptive Draft/timeline and compact Trends plots retain their natural coordinate frames and 12px family CSS. Do not constrain plot height to equalize cards; the existing rail sizing owns equal card heights.

Full fixed-viewBox SVGs declare `data-export-font-size="12"`. The inert export serializer starts from that canonical coordinate font throughout the SVG subtree (12 also when absent), never arbitrary viewport type. The white branded 1200px export bounds adaptive-frame labels to approximately 16–22 image pixels and measures the isolated, canonical-font clone to reserve an internal glyph gutter. Axis captions share the title/source left edge; quantitative geometry remains at its original coordinates. See `chart-sharing.md` and `chart-export-brand.md`. Pointer-only radius emphasis is still normalized separately.

`tests/chart-typography.test.mjs` reproduces the old mismatch before implementation and checks the shared hierarchy, actual fitted 12px full-chart type at narrow/wide/height-capped scales, canonical exports and disposal. Existing reference/font, source-byte/independent geometry goldens, qualification, preview-width and image-export suites remain intact. The extrapolation golden helper normalizes only the exact new root typography style/metadata in addition to the previous exact presentation normalization; no hashes were regenerated.

Native screenshot/font-bound/clipping checks and full-suite integration are owned by the parent handoff; jsdom fitted-transform tests do not establish native pixel acceptance.
