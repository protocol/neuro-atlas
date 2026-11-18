# Neuro Atlas Milestones coverage review — November 18, 2026

This update adds exactly three source-backed capital-lane disclosure records to the neuro-wide Milestones timeline. It does not change the BCI Funding Index's company screen, financing records, investor attribution, or PL-family counts. Existing canonical rows and generated milestone objects are preserved in their original order.

## EON Systems — December 30, 2025

[Untapped Ventures' participating-investor announcement](https://untappedventures.substack.com/p/untapped-ventures-invests-in-eon), published December 30, 2025, explicitly announces its investment in EON Systems' **$3.5M seed funding round, led by Protocol Labs**. The same source describes brain emulation and connectomics.

- One capital record, `amount_usd_m=3.5`, `scope=broader`.
- December 30 is the investor's announcement date, not a separately established closing date.
- Protocol Labs is the source's exact investor identity; no legal holding vehicle or individual check size is inferred.
- Brain-emulation/connectomics coverage does not expand the narrower BCI Funding Index screen.

## Hemispheric — July 15, 2026

The [company-issued Business Wire release syndicated by Yahoo](https://finance.yahoo.com/healthcare/articles/hemispheric-emerges-stealth-52m-funding-130000438.html) establishes the July 15 announcement of $52 million in early-stage funding and names **Protocol Labs** among investors. Yahoo carries the issuer release; it is not independent Yahoo reporting.

[CTech's July 15 reporting](https://www.calcalistech.com/ctechnews/article/rjentgbege) explicitly states:

> The $52 million in funding was raised across three early-stage rounds, including pre-Seed, Seed and a Series A round completed earlier this year.

CTech is the canonical click-through source because it directly supports the aggregate qualification as well as the named investor. The issuer release establishes the announcement-date basis.

- One capital-lane financing-disclosure record, **not three inferred records and not one $52 million round**.
- Activity is `$52m aggregate`; the numeric amount is deliberately blank (`amountUsdM: null` in generated data).
- Per-round amounts, exact financing dates, and Protocol Labs' particular round participation are not disclosed by these sources. No dollar allocation or PL participation across every underlying round is invented.
- The $52 million aggregate is excluded from annual USD capital totals and the cumulative capital line. The milestone adds one financing disclosure to the record count, not three underlying rounds.
- NeuroAI/noninvasive EEG coverage uses `scope=broader`; no BCI Funding Index company is added.

## Paradromics — February 12, 2025

[Paradromics' February 12 issuer announcement](https://paradromics.com/news/neom-investment-fund-partners-with-paradromics-to-drive-innovation-in-neurotechnology-healthcare/) states that it announced a **strategic investment from NEOM**, with the partnership led by **NEOM Investment Fund (NIF)**.

- One capital record, activity `strategic investment`, `scope=bci`.
- Financing amount and round stage remain undisclosed; the numeric amount is blank (`amountUsdM: null`).
- February 12 is the announcement date, not an inferred closing date.
- The planned BCI Center of Excellence is a future agreement component, not an established operational facility.
- This source does not establish PL participation in the investment. No PL attribution or BCI Funding Index financing is added.

## Data integrity boundary

Canonical edits are limited to appending these three records to `milestones.csv`; `scripts/generate-derived.mjs` generates the corresponding JSON. No schema, UI implementation, logo, Funding Index canonical file, or Funding Index generated file is changed.

Historical source-audit and Notables goldens remain frozen. Their bounded baseline helper verifies every field of exactly these three new canonical/generated records before excluding them from historical-only digests; all other rows and fields still reach the original hashes. Additional regression checks pin the pre-addition canonical bytes and generated milestone objects to base revision `509ad21e8b33ef076bdcd055f26f4c4aedf011b1`.
