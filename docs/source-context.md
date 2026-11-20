# Reverse citation contexts

`src/lib/source-context.ts` builds a reverse index from the same canonical data used by the current Neuro Atlas views. It does not scan files, invoke Git, fetch external pages, infer article aliases, or treat a publisher domain as a citation match. No source-directory href or label is changed.

## Directory integration API

```ts
import { sourceContextsForUrl, type SourceContext } from "@/lib/source-context";

// SourceContext = { href: string; label: string }
const contexts: SourceContext[] = sourceContextsForUrl(sourceUrl);
```

- Paths exclude the deployment basePath. Apply `atlasPath(contexts[0].href)` in the caller.
- Empty array means **no supported citation context**. Do not replace it with an unrelated page, source-directory self-link, or guessed publisher/article destination.
- First context is deterministic: ascending href order puts real Field Velocity chart destinations before Funding and Milestones matched-record destinations. All destinations are deduplicated by href, independently of repeated points or display labels. Returned arrays/context objects can be changed without mutating the index.
- `contexts.length - 1` is the number of additional distinct destinations, not the number of observations. A matched-record block can contain several events sharing the same source URL and counts once.

### Exact record receivers

Both receivers must accompany this integration:

- `/milestones?source=<encoded original bound URL>#source-context`
- `/funding?source=<encoded original bound URL>#source-context`

The Milestones and Funding pages render exact matched-record blocks before their unchanged timeline/dashboard components. The existing views had no event selector or native company-detail URL, so no unsupported company slug route is invented. The source query preserves a real canonical-data URL. Equivalent root-slash/tracking/DOI variants share one deterministic original binding and destination.

```ts
import {
  milestoneRecordsForSource,
  fundingRecordsForSource,
  type SourceMilestone,
  type FundingSourceMatch,
} from "@/lib/source-context-records";
import { normalizeSourceContextUrl } from "@/lib/source-context-url";

milestoneRecordsForSource(url: unknown): SourceMilestone[];
fundingRecordsForSource(url: unknown): FundingSourceMatch[];
normalizeSourceContextUrl(url: unknown): string | undefined;

type FundingSourceMatch = {
  company: FundingCompany;
  website: boolean;
  founding: boolean;
  rounds: FundingRound[];
  milestones: FundingMilestone[];
};
```

The match helpers return canonical records, not fabricated excerpts. They return new result arrays, but records retain their source-data identities and should be treated as read-only. Render only the company facts selected by `website`/`founding`, the selected rounds, and selected regulatory milestones. A round can match through its principal `sourceUrl` **or** a named investor's `investorEvidence[].sourceUrl`; the latter supports participation, not independently every amount/date in the record. Compare those URLs with the shared normalizer when labeling the role of that citation. Unrendered portfolio-disclosure research fields do not get Funding contexts.

`recordSourceContextsForUrl(url)` and `RECORD_CONTEXT_SOURCE_URLS` are the reverse-index plumbing; receiver pages only need the match helpers above. A malformed/unknown source returns no matches. Receivers accept exactly one source query value and give the matched block `id="source-context"`. Missing, repeated, malformed, or unmatched values leave the default page unchanged.

## Evidence and destination selection

- **Visible metrics:** `METRIC_CHARTS`, `isVisibleMetric`, and `METRIC_CHART_EVIDENCE`; panel identities from `DRAFT_CHART_LINKS`, current public hashes from `fieldVelocityLink`. Includes principal observations, confirmed supporting references, calculation methods, curation sources, reference-trendline methods, and rendered application timeline events. Retired plots, gaps, candidate attributions, and category-only fallback aliases are excluded.
- **Recording:** actual selected `HISTORICAL_RECORDING` observations and `RECORDING_VIEWS`; explicit `recordingView` query selects the correct historical/electrical/human-channel/optical view. Unselected tracker rows are not silently claimed as rendered evidence.
- **Engagement:** current participant tracks plus reviewed additions/literature, reviewed translation endpoints/pathways, projected bundled citation sources, the four canonical publication cards, and the mounted neurotech Google Trends card. Unmounted Neuralink brand-context data is excluded. The few literal methodology links duplicate citations already visible in the card components.
- **Forecasts:** actual primary/fallback links rendered from the inflection data. They select the existing Inflection points tab, whose four cards contain those forecast references; no unsupported per-inflection route is invented.
- **Milestones/Funding:** exact canonical record citations, company websites/founding citations, financing citations, named-investor evidence, and regulatory citations, served through the matched-source receivers.
- **Visible methodology prose:** the initial BCI Market Memo and PL R&D framework link to their existing body sections. Merely appearing in the source directory does not count as a citation context.
- **Ecosystem:** the Neurofounders map has no local cited view: `/ecosystem` redirects externally. It deliberately has no fake local context. Its four neighboring external forecast entries do have the real Inflection points context.

## URL identity and limitations

The normalizer accepts HTTP(S) only and rejects missing/repaired authorities (including extra authority slashes), credentials, encoded authority text, whitespace, backslashes, invalid percent escapes, and malformed/non-string input. DOI resolver aliases normalize to HTTPS `doi.org` and a lowercase DOI path. Only `utm_*`, `fbclid`, and `gclid` query entries are removed. Other query values/multiplicity, fragments, article path case, trailing path slashes, and non-DOI HTTP/HTTPS distinctions are retained. Standard URL serialization still applies, including the implicit root slash. There are no host-only matches, DOI-to-publisher guesses, or preprint-version collapses.

Coverage intentionally stops at current bindings. Historical/research-only references, retired plots, unselected tracker entries, old Trends queries, discovery leads, and documents used only by research/acquisition scripts can remain without a link. Dynamic feeds can introduce a new exact external URL after a build; this static reverse index follows the committed/bundled bindings until its next build. Existing routes and legacy chart aliases are not changed, and future standalone chart routes are not used.

## Measured coverage

Measured against the unchanged 587-entry catalog on this implementation:

| Group | Entries | With context |
| --- | ---: | ---: |
| Datasets | 48 | 11 |
| Studies | 261 | 148 |
| Disclosures | 183 | 149 |
| Discovery | 51 | 36 |
| Ecosystems/forecasts | 5 | 4 |
| Reference | 39 | 10 |
| **Total** | **587** | **358** |

229 entries correctly have no mapped context; 56 entries have multiple destinations. Catalog entries reach 229 distinct destinations: 29 Field Velocity chart/view/tab destinations, 93 Milestones matched-source blocks, 105 Funding matched-source blocks, and two existing methodology sections. The record destinations are handled by the matching Milestones/Funding receiver blocks. One real multiple: the FlyWire paper supports four separate visible chart contexts (proofreading effort, neuron counts, synapse counts, and tissue volume), yielding `+3 more`, not one entry per repeated observation.

## Validation

```sh
node --import tsx --test tests/source-context.test.mjs
npx tsc --noEmit
```

13 focused tests pass. The implementation was developed in red/green slices with observed failing assertions for the missing API, confirmed plot references, normalization, recording selection, participants, latency, publication/Trends cards, visible methodology/forecasts, exact record helpers, deterministic multiples, and repaired malformed authorities. Tests use actual runtime records, exercise true chart multiples, archival no-context behavior, stable deduplication, unknown/malformed input, and ensure new runtime URL literals are already in the existing catalog so these helpers cannot inflate the source inventory. TypeScript passes. Full build, full-suite validation, and native receiver checks are recorded separately in the PR verification evidence.
