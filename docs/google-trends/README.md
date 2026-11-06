# Google Trends public attention

The runtime and weekly data-only publication contract is in [weekly-feed.md](weekly-feed.md). The initial reviewed implementation now bundles the genuine November 6 capture as its last-good fallback; see [bundled-source-proof.md](bundled-source-proof.md). The source details below describe the unchanged October 15 archive, including its historical chart inventory. The Neuralink brand chart remains retired from the current page; retaining its source group does not remount it. Weekly releases replace the complete rolling window while preserving normalization and chart methodology; they do not overwrite either archive.

## Captured source and scope

The original October 15 implementation included two populated, URL-addressed attention charts:

- `#google-trends-neurotech`: `neurotechnology` and `brain-computer interface`, compared in one request on a **shared** index.
- `#google-trends-neuralink`: `Neuralink` queried separately as brand/news context. Its **independent** index is not comparable in magnitude with the first chart.

Both use **Worldwide / Web Search / All categories / 2023-10-15 through 2026-10-15**, exactly the requested past **36 calendar months**, with weekly UTC observations. These literal English **search terms** use Google's BROAD matching, not exact quoted phrases or multilingual Google topic IDs. `BCI` is deliberately excluded because the acronym is ambiguous. This is a bounded attention basket, not all neurotechnology searches.

Acquisition on 2026-10-15 used Google's actual public Explore page in a normal browser, then the page's same-origin `/trends/api/explore` and `/trends/api/widgetdata/multiline` responses. An initial direct HTTP request returned 429; the native browser path returned 200 for both complete captures. No proxy, third-party estimator, invented points or private/account data is used. These widget endpoints are not a supported public API contract and can change or rate-limit.

| Capture | Retrieved UTC | Raw response SHA-256 |
| --- | --- | --- |
| neurotech | 2026-10-15T18:59:03.096730+00:00 | `13f8075c9982c0f7bba52d145118c51474fc16c6c9863d7898329d74e60269b0` |
| neuralink | 2026-10-15T18:59:19.629966+00:00 | `611b43f4f5e0c4f5c61a79ede71cc3416abb3f5a0f30170d784b9c44b2d245b8` |

`source/*.raw.json` preserve exact response bodies, including Google's XSSI prefix; the extension does not mean they are immediately parseable JSON. `source/*.request.json` record term order, geographic/property/category restrictions, WEEK resolution, and capture timestamp. Transient widget tokens and browser headers/cookies are not retained. Deep links to the exact Google query and both Google methodology pages appear in each modal.

## Meaning, missingness and incomplete periods

Google samples actual searches, divides each observation by all searches for that time/geography, then scales relative popularity to 0–100 for the request. 100 is the peak within that request, not 100 searches or 100% of people. Sampling/statistical noise can change later retrievals; low-volume terms are especially fragile. Do not read the visible discontinuities as verified real-world field acceleration or causal responses to specific events.

Each capture has **157 weekly rows**. The week starting **2026-10-11** is explicitly `isPartial: true` and extends past the capture/end date; it is retained in the table and CSV but excluded from charts and latest-value summaries. There are **156 complete weeks**, latest **2026-10-04 through 2026-10-10**. Latest complete readings are **7 / 3** for the two domain terms and **4** for Neuralink on its separate scale. Partial-week readings **6 / 3** and **3** are not substituted for these.

The domain capture contains `hasData: false` for brain-computer interface on **2024-06-02**, **2024-10-27** and **2025-02-09**. These are `null`/“Unavailable”, break the line, and are not plotted as zero or interpolated. Thus the expanded charts plot **309** domain-term values and **156** brand values. A returned numeric 0 with available data means low/insufficient interest, not zero searches. A returned `<1` is retained as `<1` in values and drawn at Google's numeric floor; the current captures contain no such available `<1` values. No rescaling, aggregation, growth fit or extrapolation is performed after incomplete rows are removed. The source normalization window still includes the partial week.

References:
- https://support.google.com/trends/answer/4365533?hl=en
- https://support.google.com/trends/answer/4359550?hl=en

## Reproduce the current bundle and original archive

The runtime integration initially renders the verified November 6 bundle, then loads one validated data release per document. Visitors make no Google requests. The application installs no recurring job. Initial human code merge/deployment and parent-controlled activation remain separate steps. The default commands below reproduce the November 6 bundle; use `trends:feed` for weekly data-only staging/publication.

```sh
npm ci
npm run trends:verify  # reconstructs all outputs and checks exact byte equality
npm run trends:refresh # regenerates from the committed raw source/metadata
```

Current bundled outputs are under `public/data/google-trends/bundled-20261106/`; accepted source strings are under `docs/google-trends/bundled-20261106/source/`. Current chart downloads pin their displayed revision through the API, use Atlas's build-time basePath and remain within the existing gate. The original static files at `public/data/google-trends/` retain the October 15 bytes. Verify that archive explicitly with `npm run trends:verify -- --source docs/google-trends/source --out public/data/google-trends`. JSON carries original source hashes, complete metadata and rows. CSV includes request/capture metadata and explicit partial flags.

For a new capture, use an owned canonical browser-harness window and lock. Run from this checkout; choose a fresh staging output directory. The following uses the currently pinned period; to change it, set both `TRENDS_CAPTURE_START` and `TRENDS_CAPTURE_END` to a new exact 36-month interval ending no later than today.

```sh
BU_NAME=<owned-window> browser-harness <<'PY'
exec(open('scripts/capture-google-trends.py').read())
PY
npm run trends:refresh -- --source .qa/trends-capture --out .qa/trends-generated
```

The acquisition script was exercised against Google on 2026-10-15; both newly staged captures passed the same validator. That second retrieval was a refresh-path check and left the pinned first capture intact. Changes to the bundled archive require separate review: inspect the entire capture, regenerate, inspect the diff, rerun tests/build, and commit. Weekly data-only publication keeps `docs/google-trends/source` and bundled exports unchanged. Re-query and replace the **whole normalized window together**; never append values from another request. Keep the previous verified snapshot if acquisition or validation fails. An HTML response, HTTP429, invalid dates/values, changed term order/type, property, region, category or incomplete coverage must not become a chart.

The validator enforces 36-month calendar boundaries (including leap-day clamping), ordered weekly UTC timestamps and complete source coverage, valid 0–100 integer values, aligned display/availability arrays, request identity, and partial-week rules. Metadata is recursively allowlisted; unknown fields abort before capture files are written. Both sources are validated before any output is written. Archive output files use temporary-file renames. `trends:refresh` is local generation; the separate weekly CLI requires an explicit publication flag and expected ref.

## Implementation and verification

- `src/components/google-trends.tsx` and `.css`: responsive previews with 11px axes, expanded plots, accessible values, methodology, revision-pinned CSV/JSON links, existing chart actions and Copy link/modal/history/focus implementation.
- `src/lib/field-velocity/google-trends.ts`: strict parser and period selection.
- `scripts/capture-google-trends.py`: browser-origin acquisition; `scripts/refresh-google-trends.ts`: validated deterministic generation.
- `tests/google-trends*.test.mjs`: real-response parity, invalid values/scope/dates, gaps, partial exclusion, latest readings, modal point/table parity and deployed `/neuro-atlas` downloads.

Local production UI evidence is in `qa/`, with its fixture boundary and results documented there. It is not evidence of a deployment or authenticated hosted acceptance. Production auth, noindex and basePath source are unchanged. Dependency audit findings and the existing full-repo lint failures are outside this feature's scope.
