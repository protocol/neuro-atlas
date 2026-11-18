# Neutral investor display-label follow-up — November 18, 2026

## Scope and revision

Runtime `7df838cecad5059f28c920ba04ed77512d996326`, based on merged #125 (`cd6c3daae189c348b9bbd3d05a6b0c5d8516f3ce`). The ordinary ranking now says **Protocol Labs (incl. PLC Neuro)**. The entire regenerated funding index equals merged main after normalizing that one investor display name. Exact member names, source participants, all financing/portfolio data, totals and ordering are unchanged. Historical portfolio metadata retains its original reviewed label; it is not rendered as a showcase.

## Why four is not the portfolio count

The [current PLC page](https://plcapital.xyz/neurotech), retrieved November 18, lists ten **selected** portfolio companies across BCI, NeuroAI and connectomics. Six map into the current selected BCI company roster:

- **Synchron, Science and Merge:** three entries with publicly supported round-specific PL-family participation in the index.
- **Echo, Paradromics and Precision:** included companies, but the bounded November17 source review did not sufficiently verify an exact PL-family financing attribution. This is not proof of nonparticipation.
- **EON, Hemispheric, Integral Neuro and Netholabs:** not in the current selected BCI roster. This does not assert that they cannot be BCI-related.

The fourth attributed company is **Neurosoft**, absent from the selected portfolio page but supported by [an explicit Protocol Labs seed participation disclosure](https://www.neurofounders.co/press-releases/neurosoft-bioelectronics-closes-7-5m-oversubscribed-seed-round-to-build-stretchable-and-scalable-brain-computer-interfaces).

Thus four equals **three listed companies plus Neurosoft**, not four of ten. Four remains a public-evidence round-participation minimum, not total investments or complete portfolio coverage. This label-only change does not fill the remaining dataset gaps.

## Evidence

- `red.log`: the new displayed-label assertions failed against the old canonical/generated data.
- `green.log`:23 focused tests passed after canonical rename and regeneration.
- `build.log`, `typecheck.log`: production build and typecheck passed.
- `investors-native.json`: exact-production-built loopback replay at1440/768/390/320px;24 ordinary rows, new label/counts, no showcase, direct/reload/history and unchanged Merge evidence links.
- `parity.json`: funding HTML and13 static assets matched production-build bytes; exact runtime revision header verified.
- `investors-family-row-1440.png`, `-390.png`, `-320.png`: native captures; desktop/320px inspected visually for fully legible label/counts, neutral styling and no clipping.

These captures are exact-production-built loopback evidence, not authenticated hosted interactions or physical-phone touch. Existing hosted authentication is preserved. No merge or production release by Henry.

Full suite: **1,440 tests passed, zero failures**, `full-tests-summary.log`. Independent bounded label/code/reconciliation review: **PASS**, `independent-review.md`. The reviewer independently ran14 data/grouping tests; mounted UI execution in its dependency-free checkout was unavailable. The parent separately passed the23-test focused run, full1,440-test suite and four-width native replay above.
