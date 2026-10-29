# Shared field-velocity charts

> Current presentation (October 29): the duplicate tissue and recording-hours views described below are retained internally, not mounted on the current page. Their fragments resolve to the curated charts; recording hours is now one twelve-observation, five-series log scatter with no pooled fit. The unique neuron capability chart and its default-off scenarios remain. See [current Metrics groups](metrics-navigation.md) and [consolidation](recording-hours-consolidation.md). The original source and method contract below remains archival documentation.


`/field-velocity` → **Metrics** has compact chart cards that open an in-place, URL-addressed modal. The grid never expands or scrolls to a chart. The existing Milestones, Funding Index, Ecosystem and implemented implant content are preserved.

## Exact source scope

| Chart | Canonical object | Observations | Semantics |
| --- | --- | ---: | --- |
| Simultaneously recorded neurons | `records[instrument=performance_curves]` | 7 | Historical 1957–2014 frontier; log neurons; not a current acceleration claim. |
| Neural tissue mapped — selected datasets | `measurementSeries[id=tissue-mapped]` | 7 | Scatter; log mm³; species and volume bases remain distinct. |
| Neural recording hours — selected datasets | `measurementSeries[id=neural-recording-hours]` | 11 | Scatter; linear session-hours; release/modality/access and reused-corpus distinctions retained. |
| Idea vintage | `records[instrument=idea_vintage]` | 27 | Publication years 2000–2026; median reference age in years, source intervals retained as whiskers. 24 reliable observations through 2023; 2024–2026 explicitly under-indexed, shown as hollow markers. |
| Latency compression | `records[instrument=latency_compression]` | 4 | Selected BCI modalities; preclinical demonstration year on x, years to first-in-human implant on y. Different animal models, including sheep for Synchron. Scatter, no inferred pooled growth curve. |

The original performance objects remain **7 + 7 + 11 = 25 selected observations**, not a global inventory or total. No additional annual points, post-2014 neuron maxima, fitted slopes, sums or growth rates are inferred. Tissue and recording-hours stay scatter plots. TUSZ releases are not summed. POYO remains **more than 100 hours**, not an exact total, in both readout and table.

Idea vintage and Latency compression were already **reading** records in the shared export. Atlas now renders those original objects instead of its old unwired static rows. Their original definitions, source queries, observation/check dates and source links are retained. Patent vintage remains explicitly **unwired**; no patent series is invented. A non-reading state suppresses retained values, plots and observation dates.

The duplicate **The Implant Ledger** and **Open Neural Data Hours** coming-soon pitches were removed. Their implemented content was not removed. The distinct human **Channel count frontier** roadmap item is now the fourth card in Performance curves, with a blurred, explicitly illustrative chart and **Coming soon** overlay; it is not the historical neuron series and has no modal or share controls. Remaining commitments/markets rows and Expectations retain the older Atlas extracts.

## Source and provenance

- Candidate provider: `protocol/plrd.org#152`, commit `4b3ac510355212ff4d127badafa994a182aa862f` (unmerged).
- Independently compared sibling: `protocol/plneuro.xyz#23`, commit `38f5509a2226db73aa458a0fbc54d0c20e3d74f4` (unmerged).
- Snapshot: `src/data/field-velocity/neurotech.snapshot.json`; exact bytes of the real provider `loadFieldVelocity()` → `fieldVelocityForArea(..., "neurotech")` export.
- Export assembled: `2026-09-09T19:06:18.064Z`. This is export time, not observation freshness.
- Unchanged SHA-256: `2b16a8ebf5ada867a79129243fc3f3afada7ad6e75a639ca0d005849607815ee`.
- Adjacent `.provenance.json` records provider commit, source URLs, original schema origin, byte count/hash and refresh command. Activating two already-present records did not require changing snapshot bytes or inventing a new export date.
- The schema retains unknown additive fields. `selectPerformance()` and `selectPace()` preserve original objects and validate chart-specific year/scale/value semantics before import or rendering.

There is no runtime feed fetch, scheduled refresh, writable runtime cache or claim of live data. The neutral, collapsed **Export & source provenance** disclosure remains below Performance curves. The full feed is parsed on the server; only selected projections reach chart clients.

## Deliberate refresh and parity

1. Obtain a complete export from the real provider API (`GET /api/field-velocity/neurotech/`) at a reviewed commit, or execute its actual loader and public projection in that checkout. Record the exact `git rev-parse HEAD`. Do not assume the unmerged API is deployed.
2. Validate and import:

   ```sh
   npm run performance:sync -- /path/to/provider-export.json <40-character-provider-commit>
   ```

   Validation covers feed/area/version, sources, date bases/precision, categories, units, qualifiers, scale/plot semantics, sorted unique years and nonempty neuron/Idea vintage/Latency readings. Exports over 1 MiB are rejected. Invalid data leaves snapshot and provenance unchanged; valid input retains exact original bytes.
3. Compare against an independently exported provider and reviewed sibling snapshot:

   ```sh
   npm run performance:verify -- /path/to/provider-export.json /path/to/plneuro/neurotech.snapshot.json
   ```

   This verifies snapshot bytes/hash, deep-compares the original neuron and two measurement objects, both pace records and definitions, and shared methodology. Tests pin immutable source-object digests and prove the verifier rejects altered pace objects. Update digests only after independently verifying a real source change.
4. Run tests, typecheck, build and browser QA. `npm run data:generate` still owns older Atlas extracts, not this snapshot. Funding tests can remove the trailing newline from `src/data/milestones.json`; restore that unrelated generated-only diff.

## Metrics layout

All four Metrics sections use the same `pc-section-header` heading treatment and `pc-grid`: Performance curves, Idea vintage & latency compression, Revealed commitments, and Markets. Desktop grids always have three equal tracks, independent of card count. Performance has four cards (three sourced + one planned), so the planned card starts row two. Pace has two cards, leaving the third track empty; each older Atlas section has one card, leaving tracks two and three empty. Empty tracks are CSS space, not fake charts or focusable placeholders. At 900px and below, cards stack in one column. Existing evidence and the five URL-addressed chart modals are unchanged.

Layout regression: `UV_THREADPOOL_SIZE=1 GOMAXPROCS=2 taskset -c 0,1 node --import tsx --test --test-concurrency=1 tests/metrics-layout.test.mjs`. This checks rendered sections, source retention, the decorative-only placeholder, the desktop CSS cascade, and the mobile one-column rule; real bounding-box checks still require browser QA.

During browser QA, additionally compare card widths and x/y positions at 1440px: section counts are 4 / 2 / 1 / 1, all cards have the same one-track width, and the fourth Performance card aligns below the first. Check 390px/320px stacking, readable Coming soon overlay, and no document overflow. Use the existing five-chart modal probe below for URL/history/focus regression.

## Modal navigation and accessibility

- Stable fragments remain `#simultaneously-recorded-neurons`, `#tissue-mapped`, `#neural-recording-hours`; added fragments are `#idea_vintage`, `#latency_compression`. `#performance_curves` and `#expectations` retain their tab/section meaning.
- Only the selected chart mounts its full detail. Native `dialog.showModal()` puts it in the top layer and makes the underlying page inert. Its sticky header has a visible **× Close** button; backdrop and Escape also close it.
- Focus enters Close, wraps through controls and keyboard-reachable markers, then returns with `preventScroll` to the trigger or prior control. Body scroll is locked with scrollbar-width compensation. Reference-counted scroll ownership survives graph-to-graph subscription overlap.
- Every compact card and open modal has visible **Direct link** and **Copy link**, outside the trigger. URL construction preserves the actual origin/path/query and uses the existing fragment identifiers. Ordinary clicks use history without native anchor scrolling; modifier clicks retain normal browser link behavior.
- Opening pushes the graph URL. Closing a locally opened card goes Back to its prior location, preserving prior fragments; closing a directly loaded graph replaces its fragment with `#performance_curves` without leaving the site. Browser Back/Forward restores the selected modal and Metrics/Expectations state.
- Automatic history scroll restoration is suspended while the field-velocity location store is subscribed, then restored on unmount. No scroll-to-card effects or matching graph IDs on in-flow cards remain. The compact grid and page scroll position stay fixed when a modal opens/closes.
- Hover/focus source readouts, keyboard priority over a stationary pointer, fixed-axis track isolation and original source tables remain. Wide charts and tables scroll inside labeled, focusable regions on narrow screens; they do not widen the document. Light/dark and reduced-motion modes retain functionality.

## Verification

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run performance:verify -- /path/to/provider-export.json /path/to/plneuro/neurotech.snapshot.json
npm run lint
```

Next 16 needs route generation before `tsc`; `typecheck` runs `next typegen && tsc --noEmit`. In a constrained container, `CIRCLE_NODE_TOTAL=3 NEXT_TELEMETRY_DISABLED=1 UV_THREADPOOL_SIZE=1 taskset -c 0,1 npm run build` bounds workers without source/config edits (check available CPU affinity first).

The unchanged baseline has three ESLint errors in `milestone-timeline.tsx` / `theme-toggle.tsx`. Changed files pass ESLint. The inherited dependency tree still reports two high and one critical advisory; no unrelated framework upgrade is included. `jsdom` is a dev-only dependency for DOM lifecycle regressions; native modal inertness, actual keyboard navigation and browser history are also exercised in headed Chrome.

### Headed browser QA

Use browser-harness in an owned window/lock; never spawn a separate browser. `scripts/qa/modal-browser.py` is the consolidated probe (older performance QA entrypoints delegate to it). From the repository root, execute its contents through browser-harness Python stdin. `ATLAS_QA_URL` defaults to `http://127.0.0.1:3397/field-velocity`; output defaults to `.qa`.

The probe exercises all five charts at 1440px, 390px and 320px: fresh links, exact source-point counts, actual clipboard readback, focus wrap/restore, visible Close/Escape/backdrop, unchanged card geometry and scroll coordinates across open/Back/Forward/close, no document overflow, graph-to-graph history, Expectations recovery, fixed-axis filtering, mixed hover/focus, dark/reduced-motion and route regressions. Clipboard read permission is scoped to the loopback QA origin and restored afterward. Generated reports and screenshots are local evidence, not committed build assets.

Hosted Basic Auth is unchanged. For local UI QA, use a disposable checkout pinned to the application revision with an explicit test-only `proxy.ts` fixture, then bind the test server only to `127.0.0.1`. Never commit, push or deploy the fixture, and never read or extract a hosted authentication value to run local tests. Verify that the test checkout differs only in the auth fixture; report that local UI evidence separately from hosted authenticated verification. Production alias remains `https://neuro-atlas-app.vercel.app` (gated). Before rebuilding the local production bundle, stop the exact task-owned Next server and verify its port is closed; a process-manager kill may leave the server alive.
