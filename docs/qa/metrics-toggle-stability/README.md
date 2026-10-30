# Metrics toggle stability

Exact runtime: `32d133decc01d979b23d2a7038d64a10360d384f`. Evidence comes from the real production-built `/neuro-atlas/field-velocity#metrics` route with a disposable loopback-only QA proxy. Production auth/noindex source, scientific data and theme behavior were unchanged.

## Root causes and corrections

The previous equalizer considered only visible charts. At 1440px, expanding Mapping changed the shared height from 574 to 606px and moved its heading and featured chart down 64px as preceding rows grew. The corrected sizing lane measures all 20 charts at the actual responsive width. Hidden peers remain off-flow, invisible, inert and aria-hidden. The display overrides explicitly account for Tailwind's base-layer important hidden reset.

A distinct near-bottom issue remained after that correction: changing rail padding, scrollbar and action placement shortened the document and clamped scrollY by 47–67px. The row now reserves its existing rail/action footprint, including measured native scrollbar space. There is no scroll-position restoration or document-bottom padding workaround.

## Verified

- **50 real state-changing native cases:** all five groups, expanding and showing only the featured chart, at 1440/1024/768/390/320px. Maximum observed scroll and heading deltas were both **0px**. Card heights and widths stayed unchanged. Visibility-count deltas independently confirm that the clicks actually changed state.
- **Two additional mobile-at-bottom cases:** native last-group collapse at exactly maximum scroll, at 390px and 320px, preserved scrollY, heading position and maximum scroll.
- **35 hidden-state scenarios:** five widths × featured, native headline collapse/reopen, native Collapse all, H01 matching search, no-match search and clearing search. All 20 natural bodies retained positive widths and equal card heights; no page-level horizontal overflow.
- Real Chrome refused focus attempts into hidden content. Seventy native Tab steps stayed outside hidden/inert regions. Visible modal open, Close-button focus, Escape and exact trigger-focus return passed after reveal at all five widths.
- The established rail, partial-next-card, focus and actual 11px in-bounds preview-font replay passed at all five widths.
- All **455 tests**, typecheck, production build, scoped ESLint and diff checks passed at the exact runtime.
- Independent candidate review identified residual bottom clamping (F1) and missing native visibility/focus evidence (F2). A bounded final closed both at this source revision.
- Twenty-two protected source files were unchanged. Eleven served client assets matched the exact build. The subsequent evidence commit changes no runtime, assets, tests or packages.

The paired screenshots use the same viewport before and after expansion. Uniform card height still entails blank space in shorter charts; this correction prevents toggles from adding or removing it. Headline collapse intentionally removes its own content while other chart heights remain fixed. Chrome responsive emulation is not physical-phone or cross-browser proof. No merge, production deployment or automatic Trends refresh was performed.
