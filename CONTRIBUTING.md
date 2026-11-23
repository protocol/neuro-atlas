# Contributing to Neuro Atlas

Corrections, new research, clearer explanations, accessibility fixes, and code improvements are welcome. Keep pull requests focused on one change.

## Getting started

Use **Feedback** on [Neuro Atlas](https://www.plneuro.xyz/neuro-atlas), [open an issue](https://github.com/protocol/neuro-atlas/issues/new/choose), or send a pull request. Check existing issues and PRs first. For a large feature or methodology change, open an issue to discuss the approach. Report vulnerabilities through [private reporting](SECURITY.md).

## Your first pull request

1. [Fork Neuro Atlas](https://github.com/protocol/neuro-atlas/fork).
2. Clone your fork and create a branch:

   ```sh
   git clone https://github.com/YOUR-GITHUB-USERNAME/neuro-atlas.git
   cd neuro-atlas
   git switch -c fix/describe-your-change
   npm ci
   npm run dev
   ```

   Replace `YOUR-GITHUB-USERNAME` with your username. Use **Node.js 24 LTS** and **Python 3**; some source-integrity tests invoke `python3`.

3. Make your change and add or update the relevant tests. Preserve source credits and existing URLs.
4. Run the checks below, commit your changes, and push to your fork.
5. Open a PR against **`protocol/neuro-atlas:main`**. Describe the change and include sources and test results.

Lukas Bresser (`@lksbrssr`) reviews contributions.

## Data and sources

- Use **primary source** links where possible. Record publication, observation, and access dates, date precision, units, definitions, populations, and inclusion criteria.
- Label reported, announced, estimated, and forecast values. Keep unknown values marked as unknown and retain the source's qualifications.
- Check for overlapping datasets and incompatible populations before combining values. Keep recording hours separate from electrode counts and distinguish amounts raised from valuations.
- Edit canonical inputs in `data/`, then run `npm run data:generate` and include the `src/data/` changes. Follow each chart's source guide. For the shared Field Velocity feed, see [performance-curves.md](docs/performance-curves.md) and run `npm run performance:verify` where applicable.
- Preserve attribution, license notices, and logo provenance. Explain changes to denominators, conversions, cutoffs, or methodology, and add a validation test.

## Checks

The app uses Next.js, React, TypeScript, and Tailwind. Install from the committed lockfile with `npm ci`. Keep dependency updates separate from unrelated changes. For framework changes, read the installed Next.js documentation referenced in `AGENTS.md`.

```sh
npm test
npm run typecheck
npm run build
```

The required **Contributor checks** job tests contribution, methodology, navigation, and Feedback behavior, then typechecks and builds the app. The full `npm test` suite has existing failures. Include the results of relevant regression tests in your PR and preserve scientific assertions. Maintainers can run the **Full regression suite** workflow for a complete run.

For routing or asset changes, run `node scripts/verify-hosting.mjs` and test with `NEXT_PUBLIC_BASE_PATH=/neuro-atlas`. See the [hosting guide](docs/plrd-hosting.md).

For visual changes, include desktop and mobile screenshots and identify the tested revision. Check keyboard navigation, focus, and existing chart links.

A maintainer may need to approve the first CI run from a fork. GitHub checks use a read-only token and run without production secrets. Vercel Git Fork Protection remains enabled; maintainers review fork code before approving preview deployments, which may have access to server-side environment variables. Keep private feedback and credentials in private channels.

## License

Original software and documentation use **Apache-2.0 OR MIT**, following the IPFS/Kubo convention. Submitting original work offers it under the same license choice. You retain your copyright.

For third-party material, include the source, license, notices, and attribution. Research data, papers, figures, logos, fonts, and trademarks retain their source terms. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). If rights are unclear, link the source for review.

You are responsible for the evidence, rights, and test results in your contribution.
