# BCI Funding Index data

This directory powers the `/funding` plate. It is a deliberately bounded, source-linked index of public financing events for a screened set of implanted and implant-adjacent BCI companies. It is **not** a comprehensive market census and it does not represent total funding to date.

## Scope

A company is included when it fits at least one of these categories:

- implanted BCI or implanted neural interface;
- minimally invasive interface, including endovascular systems;
- implant-adjacent platform with a direct BCI or neuromodulation thesis.

The v1 list was seeded from the project's BCI company tracker, then screened and source-checked. The Ecosystem entry links to the original Neurofounders startup map. This index does not import or depend on their directory.

## Financing rules

- Publicly disclosed rounds of at least USD 2 million, or a clearly qualifying local-currency equivalent, are eligible.
- Amounts are round sizes, not company valuations and not all-time company funding.
- `amount_usd_m` is used for visual comparison. When a release disclosed another currency, `display_amount` and `note` preserve that original amount and identify the USD figure as approximate.
- Optional `capital_treatment` retains a disclosed amount and its record while excluding the amount from indexed and investor/portfolio-associated capital. `overlap-unresolved` identifies possible conversion or financing overlap; `superseded` identifies an earlier disclosure replaced by a completed offering; `scope-unresolved` identifies unresolved transaction, funding-period or proceeds scope. Each requires a source explanation in `note`; unknown or malformed values fail generation. Blank treatment retains normal counted-capital behavior. The same treatment applies to annual and cumulative financing in Milestones.
- Material strategic and government-backed financing disclosures retain their actual financing form in `stage`. Standalone grants appear separately in Milestones as research-support disclosures and remain outside indexed financing. Mixed financing/subsidy packages retain their published combined scope.
- A company can have older or smaller financings that are not shown. Missing rounds should not be read as zero funding.

## Company-reported totals

`reported-totals.json` records public company-reported funding totals separately from itemized financing. Each current company record requires an existing company slug, a positive finite USD-million amount, valid `reportedOn` and `reviewedOn` dates, an HTTPS source, a `primary` or `reporting` source kind, a scope label, and an interpretation note. Duplicate company records fail generation. An absent file or empty collection retains the legacy payload and UI behavior.

The optional generated top-level `reportedTotals` collection leaves the company roster, financing records, indexed-capital calculations, stage bars, investor-associated capital, and portfolio metrics unchanged. Company detail presents the reported total with scope, report date, and a source link; indexed financing remains separately labeled. Timeline and stage company rows show a distinct reported-total annotation, with the source available in detail. Full source notes are in a native collapsed disclosure and exact-source context.

Paradromics has a **$180M company-reported total**, **Includes federal funding**, reported in an interview published November 18, 2026. Its separately itemized indexed financing remains **$85.37M** (displayed **$85.4M**). See the [November 24 source review](source-review-20261124.md) for the public source, date basis, and evidence limits.

## Investor view

Investor participation is counted once per indexed financing event. Associated capital is the full size of rounds in which an investor appears; it is **not** an estimate of that investor's check size or ownership. Investor names are normalized only for obvious spelling consistency.

`portfolio-disclosures.json` is a separate evidence class: source-published portfolio relationships, including companies outside this screened BCI roster. A portfolio listing does not establish a round date, stage, amount, check size, ownership, or participation in a particular indexed financing. It never adds to the financing roster, round count, or associated-capital totals. `sourceInvestorName` preserves the publisher's investor identity; `investorName` can be an explicitly reviewed display family, whose distinct source labels and grouping rationale remain in `familyGrouping`. This is not a legal-entity alias. Company names and website links preserve the published list; an optional reviewed `companySlug` joins only an existing screened company.

Latest-stage company grouping maps generic Investment, Financing, stage-undisclosed variants, blank and unspecified labels to **Undisclosed**. Original record `stage` labels are retained unchanged. Named stages and distinct financing forms are not rewritten.

## Regulatory markers

`milestones.csv` contains selected public inflection points that help explain capital timing:

- BDD — FDA Breakthrough Device Designation
- IDE — FDA Investigational Device Exemption
- CE — European CE marking
- NMPA — China National Medical Products Administration milestone
- TAP — FDA Total Product Life Cycle Advisory Program
- Pivotal — pivotal-study start or authorization

The set is illustrative and source-linked, not a complete regulatory history.

## Files

- `companies.csv` — the screened company universe and classification fields
- `foundings.csv` — one reviewed founding-year record per company, with source URL, source kind, review date and a concise origin/registration/rebrand note; blank years remain unknown
- `rounds.csv` — disclosed financing events, investor participants, and sources
- `reported-totals.json` — separately scoped public company funding self-reports; context outside indexed-capital totals
- `portfolio-disclosures.json` — independently sourced selected portfolio relationships; never financing events
- `source-review-20261117.md` — Science Series D and PLC portfolio evidence, identity matches, and coverage limits
- `milestones.csv` — selected regulatory inflection points and sources
- `src/data/funding-index.json` — generated client payload; do not edit by hand

## Updating

1. Add or amend source rows in this directory.
2. Run `npm run data:generate`.
3. Run `npm test`, `npm run lint`, and `npm run build`.
4. Check `/funding` in both themes and at desktop and mobile widths.
5. Update `summary.asOf` in `scripts/generate-derived.mjs` only when the index-wide coverage checkpoint actually advances; it is not proof that every source was re-reviewed on that date. A bounded record correction can retain that checkpoint and use the affected rows' `reviewed_on` dates plus a source-review note.

## Founding years

`foundings.csv` is a separate reviewed enrichment, joined by stable company slug. Every roster company must have exactly one entry; duplicate, missing or foreign slugs fail generation. Years are four-digit integers or blank (unknown), never inferred from financing. Known years require an HTTPS source URL, `primary` or `reporting` source kind, a valid `reviewed_on` date and a concise interpretation note. Blank years still require review context and render as **Unknown**.

Founding-year review: **2026-10-15**, 25/25 companies with source-linked years. This does **not** advance the financing/regulatory coverage date below. Business founding, corporate establishment, research origins and public launches are not interchangeable. Neurosoft's selected 2020 year retains a documented 2019 source conflict; Echo and Merge rely on explicitly labeled reporting. See [founding-year source notes](../../docs/funding-founding/README.md).

## Coverage date

Baseline financing/regulatory source review: **2026-09-30**. The latest selective review checkpoint is **2026-11-25**. The [all-company financing correction](source-review-20261125.md) implements public-source findings across Funding and Milestones, preserves unallocated histories and marks nonadditive disclosures explicitly. It retains the November 24 [China backfill](source-review-china-20261124.md) and [Paradromics correction](source-review-paradromics-20261124.md). Source access and company histories remain partial. Each record preserves its own review date, source authorship, native amount, date basis and relevant financing scope; portfolio disclosures retain their separate review dates.
