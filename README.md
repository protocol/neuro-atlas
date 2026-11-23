# Neuro Atlas

An interactive atlas of neurotechnology: scientific and clinical milestones, technical progress, companies, and funding. Built by PL Neuro.

[Explore Neuro Atlas](https://www.plneuro.xyz/neuro-atlas) · [Sources & methodology](https://www.plneuro.xyz/neuro-atlas/methodology)

## Contribute

Corrections, new sources, and code improvements are welcome. Fork this repository and open a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and data guidelines.

You can also [report a correction or bug](https://github.com/protocol/neuro-atlas/issues/new/choose), use **Feedback** on the website, or [browse existing pull requests](https://github.com/protocol/neuro-atlas/pulls). Report security vulnerabilities through [private reporting](SECURITY.md).

## Run locally

Use **Node.js 24 LTS** and npm. The full test suite also uses **Python 3**.

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. To match the website's `/neuro-atlas` path, run `NEXT_PUBLIC_BASE_PATH=/neuro-atlas npm run dev` and open <http://localhost:3000/neuro-atlas>.

```sh
npm test
npm run typecheck
npm run build
```

[Contributor checks](.github/workflows/contributor-checks.yml) run contribution, navigation, and Feedback tests, then typecheck and build the app. The full `npm test` suite has existing failures; include relevant test results with your PR. Maintainers can run the [Full regression suite](.github/workflows/full-regressions.yml) workflow.

## Project structure

- `src/app/` — pages and routes.
- `src/components/` — charts, navigation, and feedback controls.
- `data/` — source inputs and provenance.
- `src/data/` — generated data and curated snapshots.
- `scripts/` — data acquisition, generation, and verification.
- `tests/` — regression and source-integrity tests.
- `docs/` — chart definitions, source guides, and hosting documentation.

For canonical data changes, run `npm run data:generate` and include the generated files. Follow [performance-curves.md](docs/performance-curves.md) for changes to the shared Field Velocity feed.

## License

Original software and documentation use **Apache-2.0 OR MIT**, following the [IPFS/Kubo convention](https://github.com/ipfs/kubo/blob/master/LICENSE). See [LICENSE](LICENSE), [LICENSE-APACHE](LICENSE-APACHE), and [LICENSE-MIT](LICENSE-MIT).

Third-party data, papers, figures, logos, fonts, and trademarks retain their source terms and attribution. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
