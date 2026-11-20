# Contributing to Neuro Atlas

Thanks for helping improve Neuro Atlas. Useful contributions include sourced corrections, new research evidence, better explanations, accessibility fixes, and code. Small, focused pull requests are easiest to review.

## Pick a route

- **No GitHub account?** Use **Feedback** on [Neuro Atlas](https://www.plneuro.xyz/neuro-atlas). Select the relevant element and include a source link/date when available.
- **Data correction or bug?** [Open an issue](https://github.com/protocol/neuro-atlas/issues/new/choose), or send a focused PR with evidence.
- **Large feature or methodology change?** Open an issue first so we can agree on scope before you invest in a large implementation.
- **Security concern?** Use [private reporting](SECURITY.md); do not disclose vulnerabilities, credentials, or private records publicly.

Search existing issues and PRs before starting. This application is separate from the PL Neuro and PL R&D websites; contributing does not require access to either repository or to Protocol Labs accounts.

## Your first pull request

1. Click **Fork** on [protocol/neuro-atlas](https://github.com/protocol/neuro-atlas).
2. Clone your own fork, then create a feature branch:

   ```sh
   git clone https://github.com/YOUR-GITHUB-USERNAME/neuro-atlas.git
   cd neuro-atlas
   git switch -c fix/describe-your-change
   npm ci
   npm run dev
   ```

   Replace `YOUR-GITHUB-USERNAME` with your GitHub username. Use **Node.js 24 LTS**. The bundled local website does not require production secrets or organization membership.

3. Make a focused change and add or update regression tests. Keep existing source attributions and historical URLs working.
4. Run the checks below, commit the specific changed files, and push the branch to your fork.
5. Open a PR from your fork against **`protocol/neuro-atlas:main`**. Fill out the PR template with the actual results, sources, and known limitations.

**Lukas Bresser (`@lksbrssr`) is the review owner.** Community contributions need his review before merge. Additional commits may require a fresh review. CI passing is not approval to merge or deploy. Repository administrators retain their normal emergency override; no new contributor receives write, secret, or deployment access. Self-authored maintainer PRs use an explicit maintainer merge decision rather than impossible self-approval.

## Data, units, and evidence

- Use **primary source** URLs where possible. Record publication/access dates, observation dates and precision, units, definitions, populations, and inclusion/exclusion scope.
- Distinguish observed, reported, announced, estimated, and forecast values. Unknowns stay unknown; do not fill gaps with plausible numbers or invented citations.
- Do not sum incompatible populations, overlapping dataset releases, or recording hours multiplied by electrode count. Financial amounts mean the stated metric, not an inferred valuation or investor allocation.
- Edit canonical `data/` inputs where a generator owns the output, then run `npm run data:generate` and include the `src/data/` diff. Some chart snapshots have their own source procedures; follow the relevant `docs/` guide. For the pinned shared feed, use [performance-curves.md](docs/performance-curves.md) and `npm run performance:verify` where applicable.
- Preserve existing qualifications, source links, credits, and licensing notices. Logo provenance includes the official source, retrieval information, and integrity records; another directory's dataset is not ours to copy.
- New evidence belongs in a source-backed regression or validation test as well as in the UI. Explain any changed denominator, conversion, cutoff, or methodology explicitly.

## Development and verification

The project uses Next.js, React, TypeScript, and Tailwind. Use `npm ci` with the committed `package-lock.json`; do not change package managers or broadly refresh dependencies for an unrelated change. Read `AGENTS.md` and the installed Next.js docs before changing framework behavior.

```sh
npm test
npm run typecheck
npm run build
```

For canonical data edits, also run `npm run data:generate` and inspect the diff. For routing/asset changes, run `node scripts/verify-hosting.mjs` and repeat the relevant build/HTTP tests with `NEXT_PUBLIC_BASE_PATH=/neuro-atlas`. See [hosting history and boundaries](docs/plrd-hosting.md). The CI workflow runs a secret-free local build; it does not deploy.

Visual PRs should include real desktop and mobile screenshots, labeled with the tested revision and whether they are localhost or hosted evidence. Keep keyboard access, focus, and old chart/deep links working. Include a working preview if a maintainer provides one; a preview is not production approval.

Fork CI may wait for a maintainer to approve the run. That approves running the checks—not the PR itself. Never request credentials to unblock CI. The existing Vercel project has **Git Fork Protection enabled**: retain it, and do not approve a preview deployment of untrusted code without reviewing it first. Preview builds can have server-side environment access; passing secret-free GitHub checks does not make such a deployment safe. Private feedback, provider acquisition, and deployment must remain separate from untrusted contribution execution.

## Licensing your contribution

Original software and documentation use **Apache-2.0 OR MIT**, following the IPFS/Kubo dual-license convention. By intentionally submitting original work for inclusion, you offer it under that same choice of licenses. There is no new CLA or copyright assignment in this workflow.

Only contribute work you have the right to submit. Identify copied or adapted third-party material and preserve its actual license, notices, attribution, and restrictions. The project license does **not** relicense research datasets, papers/figures, logos, fonts, or trademarks. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). If rights are unclear, link the source and ask for review instead of uploading it.

AI-assisted contributions follow the same evidence, rights, testing, and review requirements as any other contribution. You remain responsible for what you submit; never put private records or credentials in a prompt or PR.
