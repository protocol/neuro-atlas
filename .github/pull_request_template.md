## Summary

What changed and why? Link issues and primary sources.

## Evidence / scope

- Primary sources, provenance and retrieval/publication dates:
- Observation dates/precision, units and definitions:
- Inclusion/exclusion scope; observed vs announced/estimated; known gaps:
- Licensing/reuse restrictions (public does not imply permissively licensed):
- Canonical inputs changed; generation/import command and derived diff:

## Verification

- [ ] `npm ci` using the frozen lockfile
- [ ] `npm test` and `npm run typecheck`
- [ ] `npm run build` and `node scripts/verify-hosting.mjs` in root mode
- [ ] Repeat with `NEXT_PUBLIC_BASE_PATH=/neuro-atlas` for routing/asset changes
- [ ] Data regeneration/parity checked where applicable
- [ ] Desktop/mobile screenshots for UI changes, captioned with origin and exact SHA
- [ ] Independent final-revision review; hosted auth unchanged

Actual commands/results and known gaps (do not check based on intent):

## Release / rollback

Preview origins and exact deployed SHAs, auth/consent implications and rollback. Public launch, production settings and collaborator access are separate owner decisions. No secrets or hosted bypasses.
