# Selected A — chart export branding candidate

## Scope

Only the export serializer, its vetted brand module, export tests and documentation change. No renderers, data, auth, hosting or user-system changes. Pure white background; 84×9px `#115EF7` signature tab at x=48; small official PL R&D logo left in the footer; Neuro Atlas and the stable clean chart URL right. Legend, source scope, source-defined qualifications, selected views/scenarios and mark coordinates remain intact.

## Official asset / security

`src/lib/chart-export-brand.ts` embeds the official `protocol/plrd.org/public/images/pl_research_logo.svg` geometry as vetted static primitives. Upstream Git blob: `bc03d889bec4d1890eb9321715a14d36583da44d`; original SHA-256: `f5b09873608cc6acd9ee14c0b23588a9c8ee821c6da62e9404b0fb8cada6e2e5`.

Retains all 13 official paths, icon polygons, transforms, fills and R&D lettering. Removes authoring IDs/metadata, unused defs and the redundant mask on its contained polygon. The input SVG allowlist still rejects images, use, masks, foreignObject, scripts, stylesheets and resource URLs. Logo/fonts are never fetched during rasterization.

## White/theme and font contract

Actual resolved neutral theme colors become a fixed white-export palette on the clean clone; white/black neutral text becomes dark ink. Series colors are not replaced with brand blue. Hollow/under-indexed markers retain white interiors and their series outlines. Literal full-frame surface rectangles become white, but data rectangles retain their paints. The live chart is not recolored or resized.

Every plot text/tspan has an explicit `Arial, Helvetica, Liberation Sans, sans-serif` family; canonical coordinate size defaults to 12 (validated explicit metadata range 8–24). Adaptive source frames are fitted toward 16–22 image-pixel labels over three bounded passes. Native outlines marked `non-scaling-stroke` retain that exact contract. `fc-match Arial` in the candidate environment resolves to `LiberationSans-Regular.ttf` / Liberation Sans; this is a system-font contract, not an embedded or remotely loaded font.

## Latest left-edge correction

The title and source notes start at x=48. Axis captions are left-aligned to the same edge. Native `getBBox()` measures the inert canonical-font clone inside a hidden CSS-isolated shadow tree, excluding captions while establishing data/tick extents. The export viewBox can expand to reserve its own safe label gutter with 4 coordinate units of safety; the entire original viewBox remains included. Mark coordinates and source point values never change. Temporary measurement trees are removed on success and measurement exceptions.

Without native SVG measurement (e.g. JSDOM), conservative text envelopes reserve a gutter; this is test/fallback coverage, not proof of native glyph pixels or arbitrary transformed fallback typography. Fixed-viewBox Curve boundary captions and explicit Draft axis-title classes are recognized; other text keeps its original quantitative anchor.

## Strict TDD evidence

Each behavior was added as a vertical RED→GREEN slice, with the failing test executed before its implementation:

1. Selected A: original `#f7f4ed` background failed the required `#ffffff` assertion, then official tab/logo/footer payload passed.
2. Dark-theme paint: exported label `#f4f4f5` failed the dark-ink assertion, then clone-only neutral-palette conversion passed.
3. Canonical font/stroke: live `40px` failed required coordinate `12`, then explicit system family, canonical text and non-scaling outline contract passed.
4. Safe left gutter: unchanged viewBox failed the negative-left safe-region assertion for end-anchored `10,000`, then internal gutter/caption alignment passed with exact source coordinates retained.
5. Literal surfaces: full-plot `#f7f4ed` failed white-fill assertion, then full-frame-only conversion passed without changing a data rectangle.
6. Adaptive readability: 320-unit source frame produced 41.4px text and failed the size bound, then bounded clone typography passed for 320/720/1440-unit frames.

Additional existing-path regression coverage exercises native-measurement boundary isolation/cleanup via a JSDOM `getBBox` boundary replacement; it does not claim native pixel acceptance.

## Candidate validation

- `node --import tsx --test tests/chart-export.test.mjs tests/chart-typography.test.mjs`: **17/17 passed**, no skipped/canceled tests.
- `npm run typecheck`: **passed** (Next route type generation + TypeScript).
- `./node_modules/.bin/eslint src/lib/chart-export.ts src/lib/chart-export-brand.ts tests/chart-export.test.mjs tests/chart-typography.test.mjs`: **passed**.
- `git diff --check`: **passed**.
- npm emits an existing environment warning about its unknown `jobs` setting; no package/config changes were made.

## Handoff limits

Parent owns real native SVG/PNG decoding, glyph-bound screenshots at desktop/mobile in both source themes, clipboard/download checks, full-suite integration and independent review. No push, PR, merge or deployment is performed by this candidate. An early combined export/sharing baseline hit a 120-second timeout after 21 reported passes; isolated export baseline passed 7/7. A bare `tsc --noEmit` initially lacked generated Next `LayoutProps`; canonical `npm run typecheck` generated route types and passed.
