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
- Strategic investments, grants, and government-backed financings are retained when they are material and sourceable; `stage` names the financing form rather than forcing it into a venture round taxonomy.
- A company can have older or smaller financings that are not shown. Missing rounds should not be read as zero funding.

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
- `portfolio-disclosures.json` — independently sourced selected portfolio relationships; never financing events
- `source-review-20261117.md` — Science Series D and PLC portfolio evidence, identity matches, and coverage limits
- `milestones.csv` — selected regulatory inflection points and sources
- `src/data/funding-index.json` — generated client payload; do not edit by hand

## Updating

1. Add or amend source rows in this directory.
2. Run `npm run data:generate`.
3. Run `npm test`, `npm run lint`, and `npm run build`.
4. Check `/funding` in both themes and at desktop and mobile widths.
5. Update `summary.asOf` in `scripts/generate-derived.mjs` only when the source review actually advanced. It is the most recent selective review date, not proof that every source was re-reviewed on that date.

## Founding years

`foundings.csv` is a separate reviewed enrichment, joined by stable company slug. Every roster company must have exactly one entry; duplicate, missing or foreign slugs fail generation. Years are four-digit integers or blank (unknown), never inferred from financing. Known years require an HTTPS source URL, `primary` or `reporting` source kind, a valid `reviewed_on` date and a concise interpretation note. Blank years still require review context and render as **Unknown**.

Founding-year review: **2026-10-15**, 25/25 companies with source-linked years. This does **not** advance the financing/regulatory coverage date below. Business founding, corporate establishment, research origins and public launches are not interchangeable. Neurosoft's selected 2020 year retains a documented 2019 source conflict; Echo and Merge rely on explicitly labeled reporting. See [founding-year source notes](../../docs/funding-founding/README.md).

## Coverage date

Baseline financing/regulatory source review: **2026-09-30**. Selective additions and corrections are reviewed through **2026-11-24**, including the bounded China backfill in [source-review-20261124.md](source-review-20261124.md). This is not a fresh exhaustive review of every company's funding history or a China market census. The November 24 pass adds six companies and eleven financing records, with approximate native amounts, financing-agreement dates, incomplete corporate metadata, and held candidates explicitly distinguished. Every shipped financing and regulatory marker carries a direct source URL. Reviewed rows carry `source_kind` and `reviewed_on`; older rows remain unlabeled rather than being marked reviewed. Portfolio disclosures carry their own independent review date.
