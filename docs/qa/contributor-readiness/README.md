# Contributor-readiness verification

## Scope and revision

This change adds public-fork onboarding, ownership/review routing, a secret-free GitHub Actions check, issue/PR templates, software licensing, and contribution discovery. It does not change scientific data, chart calculations, existing routes, visitor feedback processing, or production deployment settings.

The original November 20 UI build and `contribute-*.png` screenshots use runtime revision `1a521d2` (based on `bc92a0bee01d9490808cd501279eef008048568c`). The November 23 copy revision and its new captures are documented below.

## Actual local execution

- Fresh `npm ci --no-audit --no-fund` succeeded using the committed npm lockfile. Local Node was 26.5.1; the new GitHub workflow uses Node.js 24 LTS.
- `NEXT_PUBLIC_BASE_PATH=/neuro-atlas npm run typecheck` passed.
- `NEXT_PUBLIC_BASE_PATH=/neuro-atlas NEXT_TELEMETRY_DISABLED=1 UV_THREADPOOL_SIZE=1 npm run build` passed with Next.js 16.4.6.
- Changed TSX files passed ESLint; `git diff --check` passed.
- Contributor-readiness, methodology interaction/content, and footer source-relocation focused tests passed. New contribution behaviors were tested red before implementation.
- A production `next start` served `http://127.0.0.1:38971/neuro-atlas/methodology#contribute`, returning HTTP 200 with the new contribution links.
- Actual headed Chrome checked 1440×1000, 390×844, and 320×800. All layouts had document scroll width equal to client width. Contribution links stayed inside the viewport; the existing Feedback alternative and footer contribution route remained present.
- A native mobile pointer click opened the existing Feedback element selector; Escape closed it without a submission or open dialog. This is desktop-Chrome mobile emulation, not a physical-phone test.
- The task tab/server were closed after verification; pre-existing browser tabs were preserved.

Screenshots are **actual localhost UI captures**, not hosted preview/production evidence:

- `contribute-1440.png`
- `contribute-390.png`
- `contribute-320.png`

### November 23 copy revision

The contribution invitation now ends: “Fork Neuro Atlas and open a pull request on GitHub. Or use Feedback without a GitHub account.” The README and contributor guide were shortened; the invitation omits review, access, and repository-transfer boilerplate. Review settings, license files, workflow definitions, routes, and Feedback behavior are unchanged.

- The updated copy assertion failed against the previous paragraph, then passed after the requested removals.
- All 25 required scoped tests passed on Node.js 24. The prefixed typecheck and production build also passed.
- The new localhost build returned HTTP 200. Headed Chrome checked the paragraph and links at 1440, 390, and 320px with no horizontal overflow.
- Current copy captures: `contribute-copy-1440.png`, `contribute-copy-390.png`, and `contribute-copy-320.png`. The earlier `contribute-*.png` files remain as historical evidence of the November 20 wording.

## Licensing and source preservation

The chosen software expression is `Apache-2.0 OR MIT`, verified against current IPFS/Helia (`cba1ed69b4369924790d9eccdb8c9089435f4f20`) and Kubo (`833e04a240d8c533509ddaaa3c202b39b0bb3024`). It is not a claim that all Protocol Labs repositories have a uniform policy. No CLA, copyright assignment, or new signoff requirement is introduced.

- Apache text is the complete official text, SHA-256 `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`.
- MIT text matches the inspected upstream text, SHA-256 `8f71659370c5268d9a1dc962a46232540e8fca63462586d8efaa95aab492a208`.
- Existing `docs/sources/recording-scaling/LICENSE` remains unchanged, SHA-256 `4eeb29dd9b129a6b1247cc11bcf4a527f625cf52edbca8a0d7e132e166231a48` (CC-BY-4.0).
- Research/source data, imported materials, separately licensed code, logos, fonts, and trademarks are excluded from the software default. This is not a completed rights audit; merging the license remains a maintainer decision.

## Fork and approval safety

The new workflow uses `pull_request`, GitHub-hosted Ubuntu, read-only contents permission, no stored checkout credentials, SHA-pinned actions, no secrets, and no deployment. The existing Vercel project's Git Fork Protection was read back as enabled and is preserved. Approving GitHub CI is not approving an environment-bearing Vercel deployment.

`CODEOWNERS` routes every path to `@lksbrssr`. Required-code-owner review only becomes effective once that file is on `main`; normal organization-admin overrides remain possible. This PR does not grant collaborators any new permissions or merge itself.
