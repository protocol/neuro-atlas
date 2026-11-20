# Neuro Atlas

An interactive atlas of neurotechnology: scientific and clinical milestones, technical progress, companies, and funding. Built by PL Neuro.

**Explore:** [Neuro Atlas](https://www.plneuro.xyz/neuro-atlas) · [Sources & methodology](https://www.plneuro.xyz/neuro-atlas/methodology)

## Contribute

Corrections, new primary sources, documentation, accessibility improvements, and code contributions are welcome. **Fork this repository and open a pull request**; you do not need organization membership or write access. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

- [Report a data correction or bug](https://github.com/protocol/neuro-atlas/issues/new/choose).
- Use **Feedback** on the website if you do not have a GitHub account. Include a source link and date when available.
- [Browse existing pull requests](https://github.com/protocol/neuro-atlas/pulls) before starting overlapping work.
- Changes are reviewed before merge. Lukas Bresser (`@lksbrssr`) is the review owner; proposing a contribution does not grant deployment or production access.
- Report vulnerabilities [privately](SECURITY.md), not in public issues.

## Run locally

Use **Node.js 24 LTS** and npm with the checked-in lockfile. The complete test suite also uses **Python 3**. No production account or API credentials are required for the bundled website.

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. The production site is mounted at `/neuro-atlas`; local development uses the root path by default. For a matching local mount, run `NEXT_PUBLIC_BASE_PATH=/neuro-atlas npm run dev` and open <http://localhost:3000/neuro-atlas>.

```sh
npm test
npm run typecheck
npm run build
```

[Contributor checks](.github/workflows/contributor-checks.yml) run contribution/navigation/Feedback tests plus whole-app typecheck/build without production secrets. The wider `npm test` suite currently has legacy failures; this required check does not certify that entire suite is green. The separate [Full regression suite](.github/workflows/full-regressions.yml) remains available for complete runs. Data acquisition, weekly refreshes, private feedback processing, and deployment are separate operator workflows—not requirements for a first contribution.

## Where things live

- `src/app/` — Next.js routes, including Milestones, Field Velocity, Funding, and Sources & methodology.
- `src/components/` — charts, navigation, accessible controls, and visitor feedback UI.
- `data/` — canonical imported inputs, source records, provenance, and logo manifests.
- `src/data/` — generated datasets and curated snapshots; follow the relevant source guide before editing.
- `scripts/` — reproducible derivations, bounded source acquisition, and verification tools.
- `tests/` — Node/TypeScript regression and source-integrity tests.
- `docs/` — measurement definitions, source qualifications, refresh procedures, and deployment history.

For canonical data changes, run `npm run data:generate` and include the derived diff. For the pinned shared Field Velocity feed, use [performance-curves.md](docs/performance-curves.md), not hand-edited imported results. Keep unknowns and qualifications intact.

## License

Original project software and documentation are dual-licensed under **Apache-2.0 OR MIT**, following the [IPFS/Kubo convention](https://github.com/ipfs/kubo/blob/master/LICENSE). See [LICENSE](LICENSE), [LICENSE-APACHE](LICENSE-APACHE), and [LICENSE-MIT](LICENSE-MIT).

**This is not a blanket license for third-party research data, papers, figures, logos, fonts, or trademarks.** Existing notices, attribution, and upstream terms remain in force. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and each source's provenance.

## Hosting and optional feedback automation

The public canonical site is <https://www.plneuro.xyz/neuro-atlas>; the previous PLRD address redirects to it. Deployment and host changes require maintainer review. [Hosting history and boundaries](docs/plrd-hosting.md) and the [current visitor-feedback contract](docs/feedback-public-linear.md) are documented separately.

Visitor feedback is logged privately for review without a visitor Linear sign-in. The separate [agent/proposal pipeline](docs/feedback.md) is not activated by submitting a community PR or by this contribution setup. Never include private feedback, credentials, or production settings in a public issue or PR.
