# Release verification — November 6, 2026

## Delivered surface and source

Four populated native charts: annual paper output, publication growth by group, unique researchers by publication sector, and first/latest publication-sector changes. Artio is a methodology/design reference only, with no production data/runtime dependency.

The independent OpenAlex acquisition completed 180 topic-year slices / 403,266 candidate works. The selected wider paper corpus contains 140,627 works; the separately scoped two-topic researcher corpus contains 111,345 works and 168,577 identified researchers. Acquisition date is November 6; complete observed years end in 2025. Author histories are reacquired dynamically, not a permanently frozen imported author table.

The complete original raw-receipt replay and normalized-row comparison passed, followed by strict production snapshot staging. An independent reviewer additionally verified all 5,516 receipt metadata/body hashes and independently reconciled paper/sector/transition/fractional outputs. Final snapshot SHA-256: `45b5befea15612f0a34f639022e575f51386faa384821b2405811eb9f2eaca5b`.

A subsequent disclosure-only regeneration reran the matched adapter against real receipts, all 25,783 selected endpoint works and exact verified fractional numerators. It reproduced the owned venue evidence exactly. Every numerical value, source timestamp, primary source hash and audit value remained unchanged; only selected-reference/pending-acquisition metadata changed. The full strict staging gate passed again with final runtime hashes. Source proof was not hand-edited.

## Baseline limitation — explicit partial coverage

The growth chart has 21 category rows, **not 21 charts**. Nine rows have actual paired references: three geography, three institution and three venue categories. Twelve method/BCI/career/citation references are **not yet established**, remain null and are visibly labeled unavailable. Their numerators remain populated. The selected reference universes and concrete acquisition-cost disposition are in [matched-baselines.md](../matched-baselines.md). No larger or paid acquisition was started, and this handoff does not claim all-category matching.

## Executed checks

- Full Node suite: **903 passed / 0 failed**. This full replay followed source-expectation updates for the genuinely refreshed Trends/citation data. The subsequent reference-disclosure-only change also passed the focused publication suites and its new Python regression.
- Python primary/acquisition/refresh checks: 44 + 18 test executions, plus 10 matched-adapter tests; overlapping discovery patterns intentionally repeat some tests. The separate disclosure regression passed. The private activation gate passed 16 tests, including real local Git fixtures and an unrelated-site-content negative control.
- Production typecheck and build passed using unchanged real authentication. A separate physical-dependency QA checkout used a disposable loopback-only proxy, never committed or deployed, at the actual `/neuro-atlas/field-velocity` prefix.
- Native publication browser replay: **12 cases passed**, all four charts at 1440/390/320px. Actual plotted values matched the primary snapshot; matched/unavailable row counts, unique-researcher key, exact transition cells, empty initial inspection, keyboard selection, history, Escape/focus return and overflow checks passed. Fifteen screenshots were captured.
- Four actual Download PNG handlers produced decodable PNGs from the rendered scientific charts, with full source-qualified notes. The page-local anchor transfer was intercepted to save the real generated blobs without racing another task's shared Chrome download destination; this is generation/handler evidence, not a claim about a receiving editor's paste behavior.
- The real November 6 Trends capture and citation acquisition are installed as validated bundled fallbacks with their actual source dates. Original shared archives remain unchanged. The currently retired Neuralink context card remains retired.

Screenshots are local production-build evidence, **not proof of hosted deployment**. Their runtime is `c062d1e`; subsequent metadata/docs/tests changes preserve every plotted coordinate and source value. Original authentication and unrelated owner-merged recording evidence are retained.

## Release boundary

Initial implementation remains an unmerged PR. No app/main merge, live data-feed publication or production deployment was performed. The installed weekly source workflow is held by its real initial-PR human-merge gate. After that merge it verifies deployed consumer acceptance and performs its explicitly authorized one-time data-feed installation, then bounded weekly data-only refreshes. Code/method changes remain separately reviewed. Changed accepted updates report to the requested Atlas channel with screenshots in that post's thread; unchanged checks remain quiet. The separate newsletter/Notables job remains PR-only and reports there too.
