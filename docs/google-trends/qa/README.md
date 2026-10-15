# Local production QA evidence — not a hosted deployment

## Pinned application and fixture boundary

All screenshots and `browser-report.json` were captured against application source **`f4363e9441222a51f0c66c812851204c46fd9029`** in a disposable `.qa/ui` copy, with its own frozen `npm ci` install (no node_modules symlink). It was built with `NEXT_PUBLIC_BASE_PATH=/neuro-atlas` and `ATLAS_SITE_URL=https://www.plrd.org`, and served **only on 127.0.0.1:3418** using `next start`.

The only application difference was the disposable fixture's `src/proxy.ts`: an explicit test-only passthrough carrying `noindex, nofollow` and a local-QA response marker. The production auth source was excluded from fixture extraction, was not read for credentials, and was never changed. A byte comparison of every tracked `src`, `public`, Next config and package file, excluding only that fixture proxy, confirmed equality with the source checkout. The follow-up evidence commit changes only this QA documentation/artifacts and the browser probe, not application/data bytes.

`auth-boundary-report.json` is a separate negative-access check against the **unmodified** source production build on loopback port3419: the page, CSV and JSON all return **401**, a Basic challenge, and **X-Robots-Tag: noindex, nofollow** without credentials. This is not authenticated hosted verification.

## Results

- **196/196** repository tests pass; **9/9** focused Trends tests pass.
- Original source production build passes with `/neuro-atlas`; `next typegen && tsc --noEmit` passes. The pinned disposable UI fixture build also passes.
- `npm run trends:verify` exactly reproduces committed JSON/CSV from source bytes. The actual browser capture script was separately exercised and its fresh staging captures validated without replacing pinned data.
- All six browser combinations (**two charts × 1440/390/320**) pass exact point and source-row parity: **309** plotted domain values / **156** Neuralink values, **157** source rows per chart. Partial `2026-10-11` values never appear as plotted points or latest readings.
- Fresh fragment URLs, recovery from Expectations, actual clipboard readback, exact basePath CSV response bytes, values disclosure open/close, focus wrap/restore, visible Close, Escape, backdrop and Back/Forward all pass. No background scroll/card geometry shift or document horizontal overflow was observed.
- Preview axis/date labels stay **11 CSS px**, not scaled-down SVG text. Expanded tick text is at least **14.93px** at narrow widths. Narrow expanded charts and source tables scroll inside their own containers; they do not squeeze away the long history or widen the page. A focused, visible plot responded to native ArrowRight (scrollLeft0→40); the recent-history screenshot then shows the rightmost bounded scroll position235px.
- Captures were visually reviewed at desktop and narrow widths. Native desktop Chrome with viewport emulation is not a physical-phone touch test.

The first browser probe attempts stopped on a transient navigation/read race and a selector-escaping typo in the probe, not the app. The probe was corrected and the entire six-case run passed. Read retries do not replay dispatched user actions.

## TDD follow-up after the first implementation commit

The first implementation was `5290a9781c39e1d1997ef29f953f065664301a6d`. QA identified the new values disclosure's closed table as a hidden focus-wrap candidate. A failing regression was added first, then `f4363e9` changed **only** the Trends component to track disclosure-open state, explicitly include its summary in the existing focus trap, and make the table's scroll region tabbable only while open. No shared modal/auth/data code changed. The full test/build/browser results above cover that follow-up.

## Screenshots

- `local-overview-{1440,390,320}.png`: Metrics attention section and populated previews.
- `local-modal-{neurotech,neuralink}-{1440,390,320}.png`: each expanded chart, complete-week reading and methodology.
- `local-recent-history-390.png`: narrow plot scrolled to recent history.
- `local-values-390.png`: source links and opened value disclosure.
- `local-partial-values-390.png`: table scrolled to the final partial row and status column.

These contain only the local public-data UI, not Google account details. `evidence-hashes.json` binds PNG bytes and records the application SHA. The probes can be rerun through an owned canonical browser-harness window:

```sh
BU_NAME=<owned-window> browser-harness <<'PY'
exec(open('scripts/qa/google-trends-browser.py').read())
PY
```

## Unresolved limits (not silently fixed)

- No push, PR, deployment or authenticated hosted QA was performed.
- Google widget requests are an unsupported, rate-limit-prone acquisition surface. The app deliberately serves a dated verified snapshot, with manual refresh instructions, not a claimed live connection.
- Full-repository lint still reports the same **5 pre-existing errors**: two in `milestone-timeline.tsx`, one in `theme-toggle.tsx`, and two in `draft-chart-plot.test.mjs`. All changed TS/TSX/tests pass targeted ESLint.
- Frozen `npm ci` reports **10 dependency vulnerabilities (9 high, 1 critical)**. Dependency versions/lockfile were not changed in this data/UI slice.
