# Neuro Atlas social-preview image

## Request and cause

Use the supplied still launch graphic for link previews of Neuro Atlas, particularly X/Twitter. Production `https://www.plneuro.xyz/neuro-atlas` at base revision `afbccc65fd25352c4f67ca3dadb3bb07ed15f3e7` emitted neither `og:image` nor `twitter:image`; Next emitted `twitter:card=summary`.

## Change

- Keep the original 2400 × 1350 PNG byte-for-byte at `public/social/neuro-atlas-launch.png`.
- Explicitly emit `twitter:card=summary_large_image`, matching OG/X image URLs, image alt text, OG dimensions, and PNG MIME.
- Construct an absolute URL through the existing validated site origin and base-path helper. With production configuration: `https://www.plneuro.xyz/neuro-atlas/social/neuro-atlas-launch.png`.
- Apply through the existing per-route metadata helper, retaining each route's title/description/canonical, robots policy, and unconfigured standalone behavior. No page UI, source data, access, analytics, consent, routing, or indexing changes.

Asset SHA-256: `628f0ecd450acd8deb7600d710709c6d1b3dfe06d289362383352b93b08fac84` (145,679 bytes).

## Verification at runtime revision 99fd09eccbfea3b73fafbcd8f78690f83c3e2736

- RED: new home metadata regression failed specifically because `twitter.card` was absent.
- GREEN: 17 focused social-preview/subpath regressions passed, including actual exported metadata for all five content routes, root and mounted configurations, page-specific copy, unchanged preview noindex and standalone behavior, and PNG dimensions/hash.
- Fresh `npm ci`, `npm run typecheck`, production `npm run build`, and changed-source ESLint passed. Existing npm environment/deprecation/install-script notices remain unrelated.
- Real isolated `next start` build, configured with the actual production origin and `/neuro-atlas` base path: home, Milestones, Funding, Field Velocity and Methodology each returned 200 for Twitterbot, Facebook crawler, and a browser user agent (15 route/agent combinations). Crawler-visible head contained matching OG/X images, explicit large card, alt text and OG dimensions; canonical and index/follow remained unchanged.
- Served `/neuro-atlas/social/neuro-atlas-launch.png`: HTTP 200, `image/png`, 2400 × 1350, byte-for-byte match with the supplied original.
- Headed Chrome verified the actual built home metadata and loaded the exact image in desktop/mobile illustrative cards without horizontal overflow.

## Screenshot meaning

`social-card-illustration-1440.png` and `social-card-illustration-390.png` show a **local explanatory illustration** generated from actual served metadata and the original asset. They explicitly label themselves as **not X screenshots, not a social-cache refresh**. They preserve the whole original graphic and do not assert X's final layout/crop.

## Release boundary

This is a PR-only implementation. It does not merge or deploy production. On a preview, metadata deliberately still points at the production image URL, which becomes available when the change is released. Verify candidate asset bytes on that preview's own corresponding path, not the currently absent production asset. X and other platforms may retain an older cached card after deployment; correct tags and an accessible image do not prove an existing tweet has refreshed. No social posts, account changes, or cache-refresh requests are made here.
