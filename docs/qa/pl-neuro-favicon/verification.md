# PL Neuro favicon — verification

## Scope

Use the existing PL Neuro favicon in both the anonymous Neuro Atlas launch screen and the full app at `/neuro-atlas`, including deep pages. The supplied `plneuo.xyz` hostname does not resolve; the requester was told this is treated as a typo for the existing `plneuro.xyz` mount. No domain, routing, launch timing, credential, or access-policy change is included. PR-only; no merge or production deployment authorized.

## Implementation

- Both renderers share the four exact public icon URLs currently declared by `https://www.plneuro.xyz/` (SVG, 96px PNG, ICO, Apple touch icon).
- Use public host URLs rather than protected `/neuro-atlas` resources, so the anonymous gate can load the icons without exempting app assets from authentication.
- Remove Next's old file-based default `src/app/favicon.ico` to avoid a competing automatic icon.
- Keep the gate's CSP restricted; add only the four exact public icon URLs to `img-src`. No script, connection, auth, or launch exceptions are added.

## Executed checks

- Regression tests first failed on the missing gate icons and missing CSP sources, then passed.
- Full suite: **1,391 passed, 0 failed, 0 skipped**.
- Focused launch/auth/robots/favicon suite: **30 passed**.
- Changed-file ESLint passed.
- `NEXT_PUBLIC_BASE_PATH=/neuro-atlas npm run build -- --webpack` passed using installed Next **16.4.6** in an isolated source snapshot; `npx tsc --noEmit` passed against that build.
- Real `next start` at loopback: anonymous HTML on `/neuro-atlas`, `/field-velocity`, `/milestones`, `/funding`, and `/methodology` returns 401 with the four icons. Synthetic authenticated requests return 200 on each route with exactly those same four icons and no old `/neuro-atlas/favicon.ico` link.
- Local QA uses only a synthetic loopback password; no hosted password, session, or auth configuration is read, copied, or changed.
- Headed Chrome on the actual mounted production build loads all four images with their expected dimensions and no CSP violations. Its native tab visibly shows the same PL Neuro cube/brain icon. Screenshot evidence is local-build evidence, not a production-release claim.
- Independent code review: PASS, no security or logic blockers. Its suggested full-app rendered-head check is covered by the real served-route checks above.

## Evidence

- `launch-tab.png`: unmodified crop of the real Chrome tab, with unrelated tabs excluded.
- `launch-screen.png`: actual loopback launch screen from the production build. The change is in the browser tab rather than the page layout.

Production still requires the owner's normal PR merge/release step. No automatic merge is enabled.
