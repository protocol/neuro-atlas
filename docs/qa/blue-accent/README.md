# PL R&D blue accent — verification

## Scope and color source

Replace the Atlas brand accent throughout, not its scientific/category classifications.

- Official PL R&D logo blue: **#115EF7**, matching `src/lib/chart-export-brand.ts` and upstream `protocol/plrd.org/public/images/pl_research_logo.svg` (blob `bc03d889bec4d1890eb9321715a14d36583da44d`, rechecked November 6, 2026).
- Dark-theme accent: **#78A6FF**. Tinted backgrounds and focus rings follow the blue family; filled controls use the corresponding theme-aware foreground.
- Covers shared navigation, controls, links, accent-driven charts, landing artwork/CTA/glows, and publication-chart primary blue.
- Preserves distinct scientific/category colors, including Commercial milestones, recording datasets and Other institutions; no measurements, calculations, access gates, dependencies or deployment configuration changed.

## Verified runtime

`711833ec91fb568963af83c6a56d5582a3b8900b` against main `81a52a5886a9c64ae8bb0e30fb59831e1a81649a`.

- `npm test`: **1,072 passed; 0 failed**. Includes five brand regressions and updated publication color expectations.
- `npm run typecheck`: pass.
- Changed TypeScript/TSX ESLint: pass.
- `npm run build -- --webpack`: pass, with the original production auth code unchanged.
- Independent source review and closure review: pass; no unresolved material findings. Closure includes the dark badge foreground and alpha-suffixed palette regression.
- Headed Chrome: **30 route/theme/viewport checks**, five internal routes × light/dark × 1440/390/320 px. Theme controls were activated with native pointer input; computed tokens, badge foregrounds and page widths were checked.
- Keyboard exploration/focus color, actual publication plot color, native Download PNG output and modal Escape: pass. The generated PNG contains 27,872 exact `#115EF7` pixels.
- Ecosystem remains the existing external Neurofounders link/redirect; it is not a sixth internal Atlas page.

The machine-readable report is [browser-report.json](browser-report.json). Reproduction script: `scripts/qa/blue-accent-browser.py`, run via an owned `browser-harness` window against an isolated loopback production fixture.

## Evidence boundary

Screenshots are **actual local production-build Chrome captures**, not mockups or authenticated hosted acceptance. Every tracked runtime/config/package/asset file was byte-compared with the reviewed revision, except the isolated fixture's loopback-only QA proxy. The release branch's production auth is untouched; no bypass or fixture is published.

Evidence/documentation-only commits after the runtime revision must have no `src`, `public`, config, dependency or test delta. Hosted preview remains gated/noindex; a successful build does not claim a successful real-password sign-in.

## Existing issue found, not changed here

The publication annual chart's PNG export already places both axis captions at the same top-left coordinates. Baseline `docs/qa/chart-export-footnotes/annual.svg` has both `Neurotech papers` and `Science index · 2022 = 100` at `x=0`, `y=16.034581575057835`; the new native export reproduces that overlap. This accent-only change preserves the geometry and does not claim to fix that separate export-layout issue. The native PNG check here establishes color/retained content, not complete export-layout acceptance.
