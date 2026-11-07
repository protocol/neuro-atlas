# Cost per recording channel — discussion mock

A disposable, source-backed visual proposal. **Not a production metric and not for merge as-is.** No existing app route, navigation, metric data, authentication, package file or production setting is changed. Both HTML files declare `noindex, nofollow`; the existing Atlas gate applies when they are served by the app.

## Two compositions

- **Chart-led:** `public/mockups/cost-per-channel.html`. Primary exploration is a real log-scale scatter plot. Source evidence appears only after inspection; a click pins it. Best for discussing the proposed Atlas chart.
- **Evidence-led:** `public/mockups/cost-per-channel-evidence.html`. All seven records stay visible while the filtered chart is secondary. Best for discussing accounting boundaries and source quality.

These are complete standalone HTML files with embedded data, styles and behavior; no CDN, external font, AI service or live-data refresh is required. The navigation-like sidebar is labeled prototype context, not functioning live Atlas navigation. The layout links and all benchmark controls work.

## Discussion decisions

1. Keep probe/array purchase price, recording electronics, and matched complete setups separate?
2. Which components belong in each price numerator, especially computer, pedestal, adapters and accessories?
3. How should academic and commercial list prices appear together?
4. Which fully itemized modern setup would close the current complete-setup gap?

## Evidence contract

The denominator is simultaneous spike-capable electrical recording channels in the **priced configuration**, not all selectable sites, AP and LFP counted twice, stimulation LEDs or isolated neurons. Original currencies remain separate; nominal prices are not adjusted for inflation or amortized. Approximate and less-than prices retain visible qualifiers and marker shapes. No line, interpolation or Blackrock-to-Science improvement factor is fitted.

The seven records are a fixed November 5, 2026 research snapshot: NeuroRighter, Open Ephys 2017, two Science SciFi 2 adapter configurations, a specified current Open Ephys bundle, a reported historical Utah-array price, and an official Neuropixels 2.0 probe-box price. Each record retains supporting links, included/excluded hardware, source excerpts or selected fields, and date basis. Science tier changes affect only Science's two records. The complete-setup gap contains no artificial zero or invented point. Historical headstage bandwidth pricing and the unmatched NHP system-price range are context, not plotted data.

## Editable source and reproduction

- Data: `scripts/mockups/cost-per-channel.data.json`.
- Layout template, style and behavior: adjacent `.template.html`, `.css` and `.js` files.
- Generate both standalone files: `python3 scripts/mockups/generate-cost-per-channel.py`.
- Focused tests, also wired into `npm test`: `node --test tests/cost-per-channel-mock.test.mjs`.
- Local preview: `python3 -m http.server 3537 --bind 127.0.0.1 --directory public`, then open `/mockups/cost-per-channel.html`.
- Hosted preview path: `/neuro-atlas/mockups/cost-per-channel.html` (or the `-evidence.html` variant). Keep the existing password gate; an unauthenticated response does not prove an authenticated UI roundtrip.
- Native browser replay (in browser-harness): set `script` to the absolute path of `docs/cost-per-channel-mock/browser-qa.py`, then run `exec(compile(open(script).read(), script, 'exec'), {**globals(), '__file__': script})`. The explicit `__file__` binds the checkout correctly inside the harness. Environment variables `ATLAS_MOCK_QA_ROOT`, `ATLAS_MOCK_QA_BASE`, `ATLAS_MOCK_QA_OUT` override the defaults.

## Verification boundary

`qa/browser-report.json` records 53 passing checks from actual headed Chrome at 1440, 390 and 320 pixels: empty default inspection, exact record selection, academic/list arithmetic, currency replacement, seven-record evidence retention, native layout navigation, Escape, stable filter scroll, complete-setup emptiness, bounded document width and a visible singleton without horizontal scrolling. Explicit mobile inspection opens a native, scrollable dialog with the selected heading visible, reachable source links, Close/Escape dismissal and focus return. Screenshots in `qa/` are captures of this standalone prototype served on loopback, **not** authenticated hosted Atlas captures.

The six focused tests cover data ratios/bounds, state transitions, both generated files, actual DOM empty/hover/pin/Escape behavior, mobile dialog selection/dismissal and source-record completeness. The unchanged main branch baseline also passed its 632-test suite and TypeScript check in the isolated worktree before the mock was finalized. Final full-suite and Vercel build/preview results are reported separately in the PR.

## Design review

Primary surface: **Explore**, with secondary evidence inspection. The gray shell, white surfaces and violet accent are drawn from the current Atlas theme. No hero, decorative KPI tiles, fabricated data, gradient or animated trend is added. The alternative changes composition rather than color. Deliberate trade-off: narrow plots use horizontal scrolling to retain readable coordinate typography; a singleton remains visible at the initial horizontal position. The inspector's empty default is intentional.
