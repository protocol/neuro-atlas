# Extrapolation motion verification

## Behavior

Both expanded extrapolation charts now rescale their existing historical marks and axes on one 800 ms eased clock. The chart grows rather than swapping SVGs. New ticks fade in after separating; dashed conditional output and reference targets appear near the end. Switching back reverses the transition, including interrupted toggles. Reduced-motion preferences skip interpolation, including when changed during motion.

Enabled-only scenario controls and fit diagnostics sit below the chart. Both hint strings share reserved layout space, preventing the plot from jumping down on mobile. Scientific observations, fit assumptions, settled axis geometry, source tables, compact previews, tissue chart, deep links, and hosted authentication are unchanged.

## Exact source and environment

- Baseline: `cc545e686bf8f0e913ebd2161a821b0b2e26b70a`.
- Runtime tested: `c0d85456fc47d647db55c5bd835d9c70b7627631`.
- Subsequent evidence-only commit adds this report, screenshots/GIF, receipts, and browser probes; it does not change application source, tests, or dependency manifests.
- Native headed Chrome at 1440, 390, and 320 px, prefixed `/neuro-atlas/field-velocity` route, isolated local production build. A disposable loopback-only auth fixture was used for browser access; original-auth production build and auth tests passed separately. No authentication bypass is included in the feature branch.
- Screenshots and GIF are actual local browser captures. The GIF preserves captured frame timing but is a screen-capture illustration, not an FPS benchmark. This is not signed-in hosted acceptance.

## Results

- Original-auth production build, typecheck, and changed-source/test ESLint passed.
- Full suite: **165 tests passed, zero failures**. Eight new deterministic motion tests exercise intermediate geometry, tick/model reveal, sizing, rapid reversals, live reduced-motion changes, StrictMode cleanup and exact settled restoration.
- Six native motion cases (two charts × three widths): baseline produced one point position per toggle; candidate produced 49 distinct forward positions and 46–50 reverse positions. Rendered height changes continuously; chart top remained anchored. Final on geometry matches baseline. Off SVG hashes match the original baseline exactly after ordinary and interrupted reversals.
- Keyboard Enter operates the switch. Reduced motion reaches an endpoint without interpolated geometry (the state commit may occur on the next paint).
- Nine native interaction cases verify both charts' alternative scenarios, hours track suppression/fixed axes, marker keyboard readouts, exact off restoration, and Escape during motion; tissue remains without an extrapolation switch.
- Fifteen existing native modal cases passed: five graphs × three widths, fresh URLs, clipboard readback, focus handling, Escape/close/backdrop, and Back/Forward without background layout or scroll shifts.
- Independent code review found no material issues and independently replayed irregular-frame repeated reversals under StrictMode.

See `motion-receipt.json` for per-chart counts and baseline hashes. Narrow plots retain their pre-existing internal horizontal scrolling to keep labels readable; they do not overflow the document. Responsive pointer/keyboard testing is not a physical-phone test.

## Known baseline limits, not changes in this PR

Whole-repository ESLint has existing findings outside this patch (`milestone-timeline.tsx` and `velocity-tabs.tsx`). Changed files pass. Frozen npm installation reports existing audit alerts in Next, sharp, and js-yaml (two high, one critical); dependency manifests/lockfile are unchanged. This feature does not claim to remediate those alerts.

## Reproduction

Run the usual `npm ci`, `npm test`, `npm run typecheck`, and `npm run build`. Preserve production auth; use only a disposable loopback-only UI fixture for local captures.

Run the browser probes through an owned browser-harness window, not as standalone Python. Set `ATLAS_MOTION_URL` to the loopback prefixed route and `ATLAS_MOTION_OUT` to a shared evidence directory:

1. Run `scripts/qa/extrapolation-motion-browser.py` against the untouched baseline with `ATLAS_MOTION_PHASE=baseline`.
2. Run that script against the candidate with `ATLAS_MOTION_PHASE=candidate`, reusing the output directory so the baseline comparison is independent.
3. Run `scripts/qa/extrapolation-motion-interactions.py` against the candidate.
4. Run `scripts/qa/modal-browser.py` with `ATLAS_QA_URL` and `ATLAS_QA_OUTPUT`.

Keep the exact task page foregrounded for RAF sampling. The motion probe screenshots before native pointer actions and fails closed on missing click samples; it does not treat a missing browser input as successful animation. No source data or team records are written by these probes.
