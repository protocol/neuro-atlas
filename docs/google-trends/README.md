# Google Trends: public attention, not field progress

## Captured source and scope

The Field velocity **Metrics** tab includes two populated, URL-addressed attention charts:

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

## Reproduce and manually refresh

The deployed page uses a checked-in snapshot, **not live requests from visitors**. No cron, monitoring or automatic refresh is configured.

```sh
npm ci
npm run trends:verify  # reconstructs all outputs and checks exact byte equality
npm run trends:refresh # regenerates from the committed raw source/metadata
```

Outputs are `public/data/google-trends/google-trends.json`, `neurotech.csv` and `neuralink.csv`. Download links use Atlas's build-time basePath and remain within the existing gate. JSON carries original source hashes, complete metadata and rows. CSV includes request/capture metadata and explicit partial flags.

For a new capture, use an owned canonical browser-harness window and lock. Run from this checkout; choose a fresh staging output directory. The following uses the currently pinned period; to change it, set both `TRENDS_CAPTURE_START` and `TRENDS_CAPTURE_END` to a new exact 36-month interval ending no later than today.

```sh
BU_NAME=<owned-window> browser-harness <<'PY'
exec(open('scripts/capture-google-trends.py').read())
PY
npm run trends:refresh -- --source .qa/trends-capture --out .qa/trends-generated
```

The acquisition script was actually exercised against Google on 2026-10-15; both newly staged captures passed the same validator. That second retrieval was a refresh-path check, not a silent replacement of the pinned first capture. Review the entire new capture before replacing `docs/google-trends/source`, regenerate, inspect the diff, rerun tests/build, and commit. Never append normalized values from another request to an existing series: re-query and replace the **whole window together**. Keep the previous verified snapshot if acquisition or validation fails. An HTML response, HTTP429, invalid dates/values, changed term order/type, property, region, category or incomplete coverage must not become a chart.

The validator enforces 36-month calendar boundaries, ordered weekly UTC timestamps and complete source coverage, valid 0–100 integer values, aligned display/availability arrays, request identity, and partial-week rules. Both sources are validated before any output is written. Output files use temporary-file renames. Refresh is manual and local, not an external state-changing action.

## Implementation and verification

- `src/components/google-trends.tsx` and `.css`: responsive previews with fixed-size HTML labels, expanded plots, accessible values, methodology, source/CSV/JSON links, stable fragment/direct/copy links using the existing modal/history/focus implementation.
- `src/lib/field-velocity/google-trends.ts`: strict parser and period selection.
- `scripts/capture-google-trends.py`: browser-origin acquisition; `scripts/refresh-google-trends.ts`: validated deterministic generation.
- `tests/google-trends*.test.mjs`: real-response parity, invalid values/scope/dates, gaps, partial exclusion, latest readings, modal point/table parity and deployed `/neuro-atlas` downloads.

Local production UI evidence is in `qa/`, with its fixture boundary and results documented there. It is not evidence of a deployment or authenticated hosted acceptance. Production auth, noindex and basePath source are unchanged. Dependency audit findings and the existing full-repo lint failures are outside this feature's scope.
