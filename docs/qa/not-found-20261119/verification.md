# Neuro Atlas 404 — verification

## Scope

Request: make missing Neuro Atlas URLs such as `/neuro-atlas/field-velocity3` a useful, branded 404 instead of Next's stock full-height error. Lukas approved the pictured “Off the map” direction in the task thread. This is a PR-only change; no production/merge approval was requested or inferred.

The existing sidebar, mobile menu, feedback action, footer and theme remain intact. The missing-page state provides a home CTA and three section links. It does not guess a destination or silently redirect typos. No data, access, analytics, deployment or routing configuration changes.

## Verified source and evidence

Runtime source: `b0c428b`, based on `1b466b7` from `main`. Subsequent verification-document-only commits do not change these captures.

- `npm ci --no-audit --no-fund` — passed against the deployment npm lockfile; no package changes.
- Regression was written first and failed because the custom missing-page state was absent. It passed after implementation.
- Focused layout/navigation/theme/metadata/404 and retained access-boundary suite: **35 passed**, zero failures/cancellations.
- ESLint for the new TSX and JavaScript tests/verifier — passed.
- `npm run typecheck` — passed.
- Actual production build with `NEXT_PUBLIC_BASE_PATH=/neuro-atlas`, canonical PL Neuro origin and public indexability — passed (Next 16.4.6).
- `node scripts/verify-not-found.mjs http://127.0.0.1:38194 /neuro-atlas` — passed: exact typo, slash variant, unknown nested funding path, unrelated unknown path with query. Each resolves to HTTP **404**, has `noindex`, uses the custom UI, and retains one main landmark. Home and all three recovery destinations return **200**. Every rendered href stays under `/neuro-atlas`.
- `scripts/qa/not-found-browser.py` in the existing headed Chrome — passed at **1440, 768, 390 and 320px**, in light and dark. Measured requested width, document client/scroll widths, heading bounds and minimum 44px recovery targets. Actual pointer clicks exercised all four destinations; native Tab verified order and visible focus. Mobile evidence is Chrome viewport emulation, not a physical-phone test.
- Screenshots in this directory show the local production build. `before-production.png` is the original supplied production route before the fix. Geometry results are in `results.json`.

## Broader-suite limitation

The full repository suite is **not claimed green**. Two runs on unmodified `1b466b7` exceeded the 180-second bound in existing chart-sharing tests. A bounded candidate run reported failures in existing chart-sharing cases and was then stopped for insufficient progress; their cause was not diagnosed. Stopping also produced cancellation diagnostics, which are not evidence of product regressions. The completed focused suite, typecheck, production build, HTTP replay and native browser replay are the verified gates for this small missing-page change. The unrelated full-suite condition remains unmodified.

## Replays

```sh
node --import tsx --test tests/not-found.test.mjs tests/landing-page.test.mjs tests/subpath.test.mjs tests/site-footer.test.mjs tests/theme-preference.test.mjs tests/response-robots.test.mjs tests/site-icons.test.mjs tests/mobile-navbar-feedback.test.mjs tests/auth-prefix.test.mjs
NEXT_PUBLIC_BASE_PATH=/neuro-atlas ATLAS_SITE_URL=https://www.plneuro.xyz ATLAS_INDEXABLE=true NEXT_TELEMETRY_DISABLED=1 npm run build
# Start the built app with the same env, then:
node scripts/verify-not-found.mjs http://127.0.0.1:38194 /neuro-atlas
```

Run the browser script inside an owned browser-harness session. `QA_BASE` and `QA_OUT` can be overridden; it is restricted to loopback and restores its temporary local theme setting.
