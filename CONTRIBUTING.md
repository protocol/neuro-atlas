# Contributing to Neuro Atlas

Atlas is a separate application at [protocol/neuro-atlas](https://github.com/protocol/neuro-atlas). Submit a fork/branch and pull request there; no write access to `protocol/plrd.org` is required. The repository transfer is complete. Direct writes, invitations and organization permissions are separate owner decisions. Never include credentials, private records or production settings in a PR.

## Data and research

- Edit canonical `data/` CSV/JSON, not just generated `src/data/` output. For the pinned Field velocity import, follow [performance-curves.md](docs/performance-curves.md) instead of hand-editing the snapshot.
- Supply primary source URLs, publication/access dates, observation dates and precision, units, definitions, inclusion/exclusion scope and provenance. Separate announced/estimated values from observations; do not combine incompatible populations or multiply recording hours by electrode count.
- Preserve unknown values and qualifiers; do not fill gaps with plausible numbers. Explain the change and add validation/regression tests.
- For logos, retain source URL, official site, retrieval provenance and integrity in existing source records. Do not copy another directory's dataset.
- Run `npm run data:generate` after canonical data edits; include the derived diff and verify regeneration is reproducible. Run `npm run performance:verify` for relevant shared-feed changes.

**Licensing:** there is currently no repository-wide LICENSE file. A public repository is not a blanket reuse license for code, research data, logos or third-party material. Check each source's terms, obtain permission when needed and record restrictions. Do not claim all Atlas data is open-licensed.

## Development and checks

Read `AGENTS.md` and installed Next.js documentation before routing changes. Use the checked-in npm lockfile:

```sh
npm ci
npm run data:generate
npm test
npm run typecheck
npm run build
node scripts/verify-hosting.mjs
```

Repeat routing/asset checks with `NEXT_PUBLIC_BASE_PATH=/neuro-atlas`. See [hosting](docs/plrd-hosting.md) for exact commands, metadata controls and the auth boundary.

Hosted Atlas currently uses HTTP Basic authentication. Do not read/copy/use the hardcoded source credential or add an auth bypass for QA. A local browser fixture must be a separate loopback-only checkout never deployed; label local/synthetic evidence and its exact source SHA. Removing/replacing the hosted gate needs a separate owner decision.

## PR expectations

Include scope, source/units/date decisions, commands and actual results, desktop/mobile screenshots for visual changes, and known gaps. Review the exact final SHA and provenance. Same-origin PLRD hosting is a shared browser trust boundary: contributor code needs review before production. Never grant Atlas contributors PLRD secrets or website permissions as a shortcut.
