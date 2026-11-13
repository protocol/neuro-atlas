# Metrics pop-outs: header actions, two columns, drag-to-measure

Follow-up to #105/#106. Scope is the Field velocity → Metrics chart pop-outs, plus two card fixes that came out of review. Hero, tab bar, Inflection points and other pages are unchanged.

## What changed

- **Header row.** Title, then the chart's own Copy link / Copy chart / Download PNG pills, then the round Close control overhanging the corner. Copy/download messages float under the pills instead of growing the header. Close stays the first header button (focus on open and every existing close path are unchanged). The cross is CSS-drawn so it is optically centred; the old glyph plus a font-size-0 "Close" text node made the button a two-item grid, which is why the × sat off-centre.
- **Header stays put.** Only the body scrolls, so Close and the actions remain reachable on long pop-outs.
- **Two columns, then data.** Under the chart and its legend: a reading column (definition, methodology, how to read, the reading itself) beside a "Sources & data" column (scope line, source links, downloads, capture/check dates, collapsed Provenance). Source tables move to a full-width row below, each closed under one uniform disclosure. Implemented with small slot components (`ModalReading`, `ModalSources`, `ModalData`, `ModalTable`) that portal into regions `ChartModal` owns; outside a pop-out they render inline, so cards and standalone renders are unchanged. Applies to all 24 Metrics charts (drafts, timeline, Trends, citation latency, latency compression, participants, recording evidence, publications). Draft pop-outs gain a de-duplicated source-link list built from their own plotted points.
- **Click, hold and drag to measure** on the three line charts: Neurotech search terms (both terms), Citation latency, Neurotech papers per year (adds annualised growth). The band snaps to plotted observations only, the readout shows start → end values, the change and the percentage change; a plain click clears it and still reaches the marks underneath, so source tooltips keep working. The overlay is `data-export-exclude`, so PNG exports are byte-identical with or without a selection. A small hint names the gesture; it is hidden on touch-only devices, where the chart scrolls instead.
- **No hover enlargement.** Inspected points no longer grow (6 → 7px, Trends 2.5 → 7px); emphasis is a darker stroke.
- **Citation latency** gets five-year labels (2005–2020) between its endpoints, opted in per chart (`PlotData.yearLabels`).
- **Publication growth:** the comparison baseline is a two-option toggle (General science / Matched to each group) instead of a select; the card preview no longer freezes the axis/legend row over its first groups (the expanded chart keeps its sticky axis). The "Hover, focus or tap a mark…" line is removed.
- Selects in pop-outs get an inset chevron.

## Decisions kept as they were

- Draft "Definition and comparability" stays a closed disclosure (pinned by `metrics-reader-policy` and documented in `docs/metrics-navigation.md`); it now sits at the top of the reading column.

## Tests

Updated to the new contract (not deleted): actions-in-header (`chart-actions-layout`, `recording-evidence-ui`), table location (`draft-charts`, `retired-metrics`), coverage text in Sources (`field-velocity-reader-copy`), focus order ending on the data row (`google-trends-ui`), hover radius (`chart-export`, `chart-presentation`, `chart-typography`), baseline toggle and preview without sticky axis (`publication-ui`, `publication-reader-copy`).

New: `metrics-popout-layout.test.mjs` — every Metrics pop-out has Close first, actions in the header, a populated Sources column and closed data tables; draft sources are one link per distinct source in table order; a drag reads both Trends series, leaves the export unchanged, and a plain click clears it; the growth preview has no sticky axis.

## Evidence and boundaries

`before-*.png` from `main` @ `eaa14c9`, `after-*.png` from this branch: Citation latency, Neurotech search terms and Neural recording hours at 1440px, Citation latency at 390px, the growth card, and a drag measurement on Neurotech papers per year. Local dev-server captures from disposable loopback-only copies with the Basic-auth proxy file removed in the copy only; never committed or deployed. No hosted verification is claimed.
