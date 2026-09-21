# Hosting the separate Atlas under PLRD

Atlas remains its own Next application and repository, [protocol/neuro-atlas](https://github.com/protocol/neuro-atlas). Its eventual canonical home is **https://www.plrd.org/neuro-atlas/**. PLRD proxies that namespace to a separately built Atlas deployment: no iframe, copied app/dataset or new main-menu item. Plain HTML anchors cross the app boundary; `by PL R&D` and the footer return to PLRD. Powered-by credits remain intact.

## Build-time settings

| Setting | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_PATH` | empty | Standalone root. Set exactly `/neuro-atlas` for the paired deployment; no trailing slash. Invalid values fail the build. |
| `ATLAS_SITE_URL` | unset | Optional HTTPS **origin only**, e.g. `https://www.plrd.org`. No path/query/fragment/credentials. Canonical and Open Graph URLs append the configured base path exactly once. |
| `ATLAS_INDEXABLE` | unset | With a site URL, defaults to `noindex,nofollow` and an empty sitemap. Only literal `true` enables indexing/sitemap entries and requires a site URL. Literal `false` keeps previews unindexed. |

Without a site URL, standalone metadata/indexing behavior is retained (no new canonical/robots declaration) and the new sitemap is empty. Configure the actual standalone HTTPS origin if it needs canonicals. These are build-time settings: rebuild after changes and use the same configuration for `next start`. Request Host headers never select the canonical origin.

Every content route has its own canonical without transient filters/query/hash. Redirect-only `/ecosystem` and `/regulatory-landscape` are excluded from the sitemap. Home uses the canonical trailing slash; Next's existing trailing-slash routing policy remains unchanged. Open Graph includes title/description/URL when configured; no fabricated chart or unrelated logo is claimed as a social-preview image. A dedicated approved image is a later change. Next handles prefixing the existing favicon, fonts and chunks.

The prefixed sitemap is `/neuro-atlas/sitemap.xml`. No Atlas root `robots.txt` is created or proxied: PLRD owns its root robots and sitemap discovery policy. Metadata/noindex is not access control.

## URL rules

- Keep Next Link/router and config redirect destinations app-relative (`/funding`, not `/neuro-atlas/funding`); Next applies `basePath`. Do not double-prefix or substitute `assetPrefix`.
- Use `atlasPath` in `src/lib/atlas-path.ts` for root-relative raw img/download/fetch/anchor URLs. FirmLogo and both powered-by assets use it. Canonical data keeps app-relative logo values, never deployment paths.
- External, protocol-relative, query, hash and blob/data URLs are unchanged. Chart share/history URLs derive from the actual page and preserve prefix/query/fragment. There is no current static-download endpoint; future downloads follow the same rule.
- Navigation supports Next's app-relative and raw prefixed pathnames. The regulatory redirect remains temporary; Next forwards queries and browsers manage fragments. Ecosystem still redirects externally to Neurofounders.

## Repeatable checks

```sh
npm ci
NEXT_PUBLIC_BASE_PATH= ATLAS_SITE_URL= ATLAS_INDEXABLE= npm test
NEXT_PUBLIC_BASE_PATH= ATLAS_SITE_URL= ATLAS_INDEXABLE= npm run typecheck
NEXT_PUBLIC_BASE_PATH= ATLAS_SITE_URL= ATLAS_INDEXABLE= npm run build
NEXT_PUBLIC_BASE_PATH= ATLAS_SITE_URL= ATLAS_INDEXABLE= node scripts/verify-hosting.mjs

NEXT_PUBLIC_BASE_PATH=/neuro-atlas ATLAS_SITE_URL=https://www.plrd.org ATLAS_INDEXABLE=false npm test
NEXT_PUBLIC_BASE_PATH=/neuro-atlas ATLAS_SITE_URL=https://www.plrd.org ATLAS_INDEXABLE=false npm run typecheck
NEXT_PUBLIC_BASE_PATH=/neuro-atlas ATLAS_SITE_URL=https://www.plrd.org ATLAS_INDEXABLE=false npm run build
NEXT_PUBLIC_BASE_PATH=/neuro-atlas ATLAS_SITE_URL=https://www.plrd.org ATLAS_INDEXABLE=false node scripts/verify-hosting.mjs
NEXT_PUBLIC_BASE_PATH=/neuro-atlas ATLAS_SITE_URL=https://www.plrd.org ATLAS_INDEXABLE=false npm start -- --hostname 127.0.0.1 --port 3491
```

Stop task-owned servers before rebuilding. Do not mix root/prefix output under a running server. On constrained Linux hosts use `NEXT_TELEMETRY_DISABLED=1 UV_THREADPOOL_SIZE=1 taskset -c 0,1` before the npm command after checking CPU availability.

### Hosted gate: explicit launch blocker

Hosted Atlas currently returns **401 HTTP Basic** from its existing `src/proxy.ts`. This change leaves it untouched and adds no hosted bypass. Do not read, copy or use its source credential for QA. Removing/replacing the gate for anonymous launch requires a **separate owner decision**; `ATLAS_INDEXABLE=true` does not remove auth.

An owner-controlled isolated loopback-only fixture checkout may omit the proxy for browser QA; never deploy/push that fixture or equate its anonymous behavior with hosted readiness. Test desktop and 390/320px, deep routes, logos/fonts/JS/CSS, active nav, funding/milestone filters, performance modals/share hashes, Back/Forward/reload and the plain-anchor return link. Pair with PLRD to exercise its real rewrites. Capture exact-source screenshots with honest local/static-interface captions.

## Deliberate release

1. Independently review both final PR SHAs and native checks. Transfer to `protocol/neuro-atlas` is complete; keep the repository identity/history. **Prerequisite:** verify the existing Vercel project's GitHub App has organization/repository access, reconnect that existing project if needed, and prove exact-SHA preview deployment. Do not create a replacement project. Invitations/direct write permissions are separate authorization; fork PRs require no PLRD write access.
2. Build an Atlas preview with `/neuro-atlas`, `ATLAS_SITE_URL=https://www.plrd.org`, `ATLAS_INDEXABLE=false`. Verify prefix root/deep pages, assets, redirects and metadata on the exact deployment SHA. Report the Basic gate honestly; loopback and authenticated hosted proof are separate evidence classes.
3. Set only PLRD preview `NEURO_ATLAS_ORIGIN` to the verified Atlas preview's HTTPS origin (no path). Its rewrites must retain `/neuro-atlas`, cover the exact path and descendants, and leave other routes/assets/auth unchanged. Test the actual two-app route, requests, filters/hash/history/reload. Preserve PL Neuro's Website link, adding a separate Atlas link and static interface preview—not a real-time dashboard claim.
4. Obtain the separate owner decision about Basic auth and public access. Verify the deployed decision before claiming anonymous readiness. Keep analytics deferred.
5. Merge/configure Atlas deliberately first; verify its production exact SHA, prefix and intended gate. Enabling the prefix changes root Atlas URLs: coordinate that cutover rather than casually flipping standalone settings.
6. Point reviewed PLRD configuration at that verified Atlas origin, then merge/deploy PLRD. Verify both exact deployed SHAs, `https://www.plrd.org/neuro-atlas/`, deep paths/assets and original-domain behavior. Only after successful public routing/auth verification explicitly rebuild with `ATLAS_INDEXABLE=true`, verify canonicals/social URLs/sitemap, and coordinate sitemap discovery with PLRD's owner.
7. Consider old-origin redirects only after verified migration. No blanket/permanent redirects now: Host-based redirects can loop through a proxy. Verify both domains before any later redirect decision.

**Rollback:** record previous deployment IDs/SHAs and nonsecret config first. Restore PLRD's previous deployment/config to remove entry points/proxy; then restore Atlas's previous standalone deployment or rebuild with empty base path and previous metadata settings. Preserve hosted auth; recheck both domains/deep links. Leave indexing off for an incomplete migration. Do not delete/transfer the repository as a rollback mechanism.

## Shared trust and analytics

`plrd.org/neuro-atlas` is the **same browser origin** as PLRD, not a security sandbox. Atlas JavaScript can access origin-scoped storage and readable cookies; paths do not isolate them. Review contributors/dependencies before production. Give Atlas no cross-app PLRD secrets or deployment credentials. Keep projects/permissions separate.

No tracker or consent implementation is added. Shared analytics is a separate explicit opt-in after matching PLRD's actual consent model, approved measurement ID, withdrawal and pageview/event behavior across full-document app boundaries. An ID alone must not start tracking before consent. Do not invent an ID or claim analytics parity here.
