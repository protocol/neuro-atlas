# Neuro Atlas — selective financing and portfolio source review

Reviewed November 17, 2026. This advances the latest selective review date, not an exhaustive re-review of the full financing history. No automatic feed, outreach, or portfolio-to-round synchronization is introduced.

## Science Series D

Primary source: [Science Series D](https://science.xyz/news/series-d/), Science Team, published November 17, 2026. Retrieved directly during this review.

> Science has raised a $400 million Series D financing with participation from Khosla Ventures, the Ackman Oxman Institute, Tenet Healthcare, 885 Capital, Y Combinator, and PLC Neurotech, among others. This brings the total capital raised since our founding in 2021 to more than $900 million.

- Add one $400m Series D to `rounds.csv` and one capital milestone to `../market-memo-q1-2026/milestones.csv`.
- November 17 is the company announcement/publication date, not a separately disclosed closing date.
- Retain the six named investor identities; do not rename PLC Neurotech to Protocol Labs or infer a lead investor. “Among others” means the participant list is not exhaustive.
- The more-than-$900m lifetime total is cumulative, not a separate financing event. The three indexed Science records sum to $734m, including the inherited rounded $104m 2025 record. The difference from the lifetime total remains a coverage gap; no synthetic missing round or allocation is added.
- Existing rows remain byte-for-byte intact and in their previous order; the new rows are appended.

## PLC published portfolio — a different evidence class

Primary source: [PLC Neurotech](https://plcapital.xyz/neurotech), undated current page, directly retrieved November 17, 2026.

> A selection of our portfolio, spanning BCIs, NeuroAi, and Connectomics:

The page links ten unique companies, preserved with its source labels and exact linked URLs in `portfolio-disclosures.json`: Echo, EON, Hemispheric, Integral Neuro, Merge Labs, Netholabs, Paradromics, Precision, Science Corp, Synchron.

Six match the existing screened BCI roster: `echo-neurotech`, `merge-labs`, `paradromics`, `precision-neuroscience`, `science-corporation`, `synchron`. EON, Hemispheric, Integral Neuro, and Netholabs remain in the published portfolio data but are not added to BCI financing totals or the screened company roster.

### Identity review

- The PLC-linked [Echo site](https://www.echo.bio/) was directly retrieved and has the title **Echo Neurotechnologies**. The [existing Bloomberg financing source](https://www.bloomberg.com/news/articles/2025-01-30/andreessen-horowitz-backs-rival-to-musk-s-neuralink-in-new-funding-round) identifies Echo Neurotechnologies Corp.; that identity was corroborated by a current search-result excerpt, not a fresh full-article read. The index's “Echo Neurotech” is an abbreviated name. The legacy `echoneurotech.com` roster domain could not be retrieved and is not evidence for this match. The new portfolio relationship retains the verified PLC-linked `echo.bio` URL; no unrelated company fields or historical financing participants were changed.
- The PLC-linked [Merge introduction](https://merge.io/blog) was directly retrieved. It identifies Merge Labs and its molecular/ultrasound BCI program, matching the screened company. The old roster domain `merge.xyz` could not be retrieved. The relationship retains the exact published `merge.io/blog` URL, without changing the source investor list on the indexed seed financing.
- Precision, Science Corp, Paradromics, and Synchron match the existing roster's primary domains. Shortened source names remain unchanged in portfolio data.

### Investor identity and display family

`sourceInvestorName` is **PLC Neurotech**. The reviewed **Protocol Labs / PLC Neurotech** label is an explicitly reviewed display-only family, not an alias or a claim that the two investor labels identify one legal entity. The family members and review rationale are stored alongside the disclosure. Indexed rounds and investor aggregates retain their original source labels.

The [platform disclaimer](https://plcapital.xyz/disclaimer) was directly retrieved and states:

> Nothing on this website should be interpreted as implying that the advisers, funds, companies, accelerators, incubators or initiatives described herein constitute a single advisory business, pooled investment vehicle, or jointly managed investment program.

It also states:

> Certain investments referenced in connection with PLC Neurotech may be held through affiliated investment vehicles, warehousing arrangements, or other structures associated with the PLC Neurotech strategy.

> Rather, these investments are referenced to illustrate the investing experience generally of the PL Capital network.

The ten published relationships therefore do not establish current legal ownership, dates, round stages, amounts, or participation in particular indexed financings. November 17 is the review date only. No rounds are manufactured to fill gaps for Echo, Merge Labs, Paradromics, or Precision.

### Distinct denominators after this update

| Evidence class | Coverage | Meaning |
| --- | --- | --- |
| Selected published PLC portfolio | 10 unique companies | Source-published relationships, not exhaustive |
| Portfolio matches in screened BCI roster | 6 companies | Reviewed company identity matches, not inferred financings |
| Protocol Labs named in indexed financing records | 2 events / 2 companies / $207.5m associated financing | Synchron Series D and Neurosoft seed; full financing size, not investor checks |
| PLC Neurotech named in indexed financing records | 1 event / 1 company / $400m associated financing | Science Series D; full financing size, not investor check |
| Display-family union of indexed financing records | 3 unique events / 3 companies / $607.5m associated financing | Informational union of the two exact source labels; no synthetic aggregate investor is emitted |

Neurosoft is present in the indexed Protocol Labs financing evidence but absent from this selected ten-company PLC list. These populations are not interchangeable or additive.

## Generated values and regression receipts

`node scripts/generate-derived.mjs` returned `milestones: 91 | acronyms: 53 | logos copied: 25`. Generated financing coverage is 25 screened companies, 42 indexed records, 15 regulatory markers, $3,553.96m observed financing, as of the selective November 17 review. Previous financing coverage was 41 records / $3,153.96m; the only financing increment is Science's $400m.

Vertical TDD in `tests/funding-feedback-data.test.mjs`:

1. Science slice RED: canonical milestone count was `0`, expected `1`. Added both source rows, regenerated; GREEN `1/1`.
2. Portfolio slice RED: separate disclosure data was absent. Added the canonical JSON and loader/build path, regenerated; GREEN `2/2`.
3. Portfolio provenance slice RED: missing source did not throw. Added validation for review/source identity, dates, duplicate/foreign company matches, URLs, and financing-shaped fields; GREEN `3/3`.
4. Stage slice RED: latest group was `Investment`, expected `Undisclosed`. Added `normalizeFundingStage` and applied it only to company grouping; GREEN `4/4`, with original stage labels unchanged.

## Integration reconciliation

Historical Notables 64/65 hashes remain frozen. Their tests explicitly exclude the independently asserted later Science event and restore only the exact reviewed current website fields before checking the historical company digest. Current Khosla participation is six indexed records across two companies; the Science row is not suppressed from current totals.

Two newly discovered broken public company links were repaired at their canonical roster source: Echo's legacy `echoneurotech.com` has no DNS address; its current primary site is https://www.echo.bio/ (title: Echo Neurotechnologies). `merge.xyz` fails TLS hostname verification; https://merge.io/ and the PLC-linked https://merge.io/blog both identify Merge Labs and its BCI program. Only those website fields changed; no historical financing participants or portfolio membership were inferred from them. `tests/funding-public-links.test.mjs` exercised RED→GREEN for each canonical/generated replacement.

Final implementation/browser/review evidence is recorded in `docs/ui-feedback-20261117/`. This review does not authorize a merge, production release, monitoring, or outreach.
