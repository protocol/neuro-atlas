# Atlas GA4

## Configuration

The owner approved a separate **Neuro Atlas** web stream within the existing PL Neuro GA4 property, accepting less consistent cross-site journey attribution. The parent site's stream is unchanged.

- Property: `546239987` (PL Neuro)
- Atlas stream: `16335710912`
- Measurement ID: `G-5K6841R4RM`
- Website: `https://www.plneuro.xyz/neuro-atlas`
- Enhanced Measurement: **off** on this stream. Atlas emits explicit sanitized pageviews. In particular, `send_page_view: false` alone does not disable Enhanced Measurement's history collection.
- Vercel: production-only `NEXT_PUBLIC_ATLAS_GA_ID` is configured and read back. No GA secret is required. Preview deployments intentionally do not collect.

## Collection policy

The standalone password landing page has no Analytics, remote assets, or tracking. Per the owner's November 17 correction, pages viewed after entering the password may collect before launch under the existing consent policy. The public-launch date controls access only. The context endpoint requires `VERCEL_ENV=production` and a valid dedicated measurement ID, independently of the launch date. The proxy continues to deny unauthenticated prelaunch access to content, assets and this endpoint.

The companion PL Neuro host PR overwrites `x-atlas-consent-region` on all rewritten Atlas requests from trusted Vercel geography. Absent provider geography requires explicit consent; country classification otherwise follows the host's existing policy. The context endpoint returns that policy with private/no-store and CDN no-store headers; stale public cookies cannot relax it. A direct origin is not an eligible client hostname.

Atlas reuses `localStorage['pl-ga-consent']` from the parent site. Explicit denial always wins; required regions need explicit acceptance. Opt-out regions may collect without a prior choice. Cookie settings remains available in the Legal footer when eligible; Reject and Accept have equal prominence. Storage access failure fails closed. Withdrawal disables GA before other work and removes visible GA cookies across applicable host/domain/path variants; requests already sent cannot be recalled.

Only canonical Atlas content routes collect. Page locations omit queries and fragments, referrers omit queries/fragments/credentials, and titles are constant. One manual initial pageview and one per changed pathname; chart modals, query changes, and hashes do not create duplicate pageviews. Google Signals, ad personalization, ad storage, ad user data and ad personalization consent are disabled. Form contents, passwords, feedback text, Authorization and sessions are not included.

## Verification and release limitations

Focused controller, mounted component and server-route tests exercise consent, withdrawal, cross-tab updates, StrictMode/remount, history, redaction and failure cases with synthetic IDs and no network execution. See `tests/atlas-analytics-*.test.mjs`.

Stream creation/settings and production environment configuration were verified separately from application activation. This correction is PR-first: **no production merge/deployment or live collection is claimed by its local tests**. Preview deployments and the standalone password screen remain silent. After the approved production release, verify an authorized, consent-permitted prelaunch page navigation in the network panel and GA Realtime/DebugView, then verify rejection/withdrawal silence. Keep real ingestion distinct from local fixture checks.

A tab opened under the previous launch-gated implementation needs a full reload after this correction is released. A failed initial context fetch or tag load fails closed until reload. New public content routes must be added deliberately to the allowlist and cookie-cleanup paths. Campaign attribution and custom chart-interaction instrumentation remain separate from this eligibility correction.
