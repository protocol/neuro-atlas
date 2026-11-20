# Historical recording and acquisition-efficiency trends

These views use descriptive fits to selected published estimates or compiled literature. Solid fits are confined to the observed years. The acquisition human-brain cost view separately labels its dashed continuation and calculated future crossings as extrapolations. The views retain heterogeneous measurement scopes.

## Acquisition efficiency

The acquisition-economics preview and expanded chart default to **approximate dollars per human brain** on an inverted log scale (cheaper at the top). Three expanded-chart buttons select **voxels per dollar**, **dollars per voxel**, or **dollars per human brain**. The original nine `$ / voxel` observations remain unchanged in the source archive; the canonical efficiency presentation takes their reciprocal and adds Table A1's 2024 ExA-SPIM estimate. The 10 plotted points use the printed **Approx. Voxels/$** column from [arXiv:2603.25713v1](https://arxiv.org/pdf/2603.25713v1), Table A1, PDF p. 18. Rounded efficiencies are not replaced by throughput/hour divided by hourly cost.

For canonical efficiency `e`, the selected y value is `e`, `1/e`, or `1.875e21/e`. The human denominator models 1,200,000 mm³ at 4×4×40 nm: **1.875×10²¹ voxels (~1.9 sextillion)**. Cost per human brain = 1.875×10²¹ voxels ÷ demonstrated voxels per dollar. Image acquisition only; excludes preparation, reconstruction, proofreading and storage, which have historically dominated total cost.

The x domain stays **2015–2025**, including the original pixel positions of all year ticks and observations. Cost axes invert the reciprocal transformation, preserving the source efficiencies' log-space ordering and relative positions. Header lanes accommodate the longer cost labels without changing the x geometry. Per-voxel axis ticks use compact SI dollars (n$, p$, f$, a$); source popups use scientific dollars and always include all three quantities, year, source and qualifications. Dollars use at most four significant digits; dollar-per-brain axis ticks use two to fit the original margin. Acquisition formatting switches from M/B/T/Q to scientific above 10¹⁵ and leaves shared formatting for other charts unchanged.

The fixed modal heading is “Estimated acquisition efficiency”; the figure and image-export title identify the selected quantity. Selected JSON includes `acquisitionView` metric, unit, transformation, human denominator and original `voxels/$` fit basis. Trend endpoints are transformed, while retained fit intercepts, slopes, equations, diagnostics and input cohorts stay in original efficiency units, explicitly identified in each fit note. Stable fragments and aliases are unchanged. The archived raw $/voxel plot is not eligible for these controls.

- **Expansion microscopy:** `exm2015`, `exllsm2019`, `exaspim2023`, `exaspim2024`; N=4, 2015–2024. Doubling 1.490465588 years; R²(log10)=0.752798925.
- **Reported-technology EM estimates:** `sem2018`, `multisem506`, `multisem706`, `bdtem2024`; N=4, 2018–2025. Doubling 1.526369132 years; R²(log10)=0.682759742.
- **mesoSPIM:** separate optical singleton; no expansion-family fit.
- **PEEM:** a prospective/mixed estimate, rendered with a triangle and excluded from the historical EM fit.

**ExA-SPIM 2024 is an author estimate**, 1e11 voxels/$, Table A1 row 2. Its reference 54 is Day et al. (2024), HiExM, rather than ExA-SPIM. The citation mismatch and lack of independently matched ExA-SPIM throughput/cost configuration remain explicit. As a sensitivity, fitting only the other three expansion points yields approximately 2.40824-year doubling; the selected four-point fit retains the 2024 estimate.

Figure 2 and Table A1 differ: TEMCA-GridTape has no exact dollar-efficiency table row, mesoSPIM is absent from the figure, and MultiSEM706's visual position differs from the table's 1e9. No TEMCA value or traced source line is invented. Optical/EM resolutions, labeling, utilization, cost composition and price year differ or are unspecified; the efficiencies are rough order-of-magnitude source estimates.

The optional, default-off human-brain budget toggle sits beside the metric buttons above the expanded plot. It keeps its original volume/sampling/budget assumptions. The thresholds are `human image voxels / budget`, `budget / human image voxels`, or the budget itself, respectively. Human-brain labels show only $1B, $100M, $10M, $1M and $100K; the efficiency-mode $1B target is 1.88T voxels/$. Source observations never change when either control changes. Animation, reduced-motion behavior and export-during-motion guards are retained.

The two source fits remain separate: efficiency labels show “2×/1.5y”; reciprocal cost labels show “cost halves every 1.5y”, derived independently from each fit. In human-brain mode, the expansion fit continues dashed from 2024 to the existing 2025 edge. The EM fit already ends in 2025 and has no forward visible interval. Solving the original unconstrained equations for $1B gives **2032.741933127535** (expansion) and **2039.3328704849728** (EM). Both calculated years are labeled explicitly as extrapolations beyond the displayed range; no extra years or fabricated observations are added.

### Point-number discrepancy (November 20, 2026)

Point **#10** is `exaspim2024`, the Table A1 author estimate of **1e11 voxels/$**, giving **$18.75B** for this human model. The requested roughly $50–100B check is incompatible with that source value and denominator. Point **#8**, `peem2024`, is the prospective **2e10 voxels/$** estimate, giving **$93.75B**. That may explain the expected range, but no source identity, value or model assumption is changed to force it. The ExA-SPIM citation mismatch and PEEM prospective status stay visible.

## Historical simultaneous electrical recordings

The default recording card and modal reproduce the Stevenson–Kording tracker's **first-10 threshold selection**, rather than using the seven inherited provider checkpoints as a census. The modern electrical-unit, human-channel and optical-signal views remain separately selectable, with existing query values preserved. Old recording links continue to resolve; an omitted or invalid view selects `historical`.

Frozen source inputs are in `docs/sources/recording-scaling/`; the normalized raw fields and hashes are in `src/data/historical-recording.source.json`.

- [Tracker](https://stevenson.lab.uconn.edu/scaling/) and its public CSV captured November 17, 2026: 162 rows, July 1957–October 2022.
- CSV SHA-256: `b2971bb3fc6da9bd95407ca55febceaedcfb0dfd3020480ea1746516090d009b`.
- [Producer code](https://github.com/ihstevenson/scaling/blob/2bb7a59bc0bd7f490a0e10316b8907bf5d14a287/scaling.py), April 21, 2020; SHA-256 `4649763bb47ebddd516eff217c3dae2a1874f52b12551921510957e5419acd78`.
- The linked 2020 static figure has N=92. The separately captured live sheet includes later entries and produces N=94. The page's rounded seven-year claim is not used as the computed rate.

The producer defines `t = year + (month - 0.5)/12`, replacing a missing month (0) with 6.5. No month is missing in this capture. Keep a row if **fewer than 10 strictly earlier rows have at least that neuron count**. Same-date ties do not outrank each other. This selects **94** rows. Applying equal-weight OLS to the selected log-counts gives doubling **6.321214735 years**, R² **0.900357405**. Base-10 and natural-log regression yield the same fitted values and doubling time.

The chart preserves compiled publication months, tracker values, method notes, version identities and incomplete preparation/species fields. It includes ex-vivo retina and culture; it is not a uniform in-vivo or isolated-single-unit census. It does not combine optical cells, implant channels, reconstructed neurons or pooled modern studies into the fit.

Two decisive qualifications remain: Maccione 2014 is **approximately 3,200**, isolated neonatal mouse retina (literal 3,200 was not recovered in the primary publisher text); Mitz 2017 is **approximately 807 average units per session**, not a maximum. Stringer 2018's tracker/preprint 2,998 remains separate from the curated 2019 final-paper 2,668 stable units. Bartolo 2019 and 2020 are distinct source papers and are retained without an invented deduplication rule. Missing species/preparation metadata remains unspecified rather than inferred from a title.

## Shared regression and exports

`src/lib/historical-log-fit.ts` computes unconstrained, equal-weight OLS of `log10(y)` against year, with a centered x origin for numerical stability. It exposes exact input IDs, N, observed window, intercept, slope, equation, log-space R², doubling time and the two fitted endpoints. Invalid/non-positive values and non-distinct x domains are rejected. A constant-value series has no defined R²/doubling time. No confidence or forecast band is drawn.

Both actual renderers paint the fits behind observations and show short direct rate labels. Full diagnostic inputs live in a closed disclosure or selected-data JSON. Acquisition supports multiple independent reference lines while retaining the existing BCI single-reference API. JSON exports contain the selected values and fitted model; recording CSV exports the selected view with its date basis, qualifiers and fit diagnostics. Selected PNG/clipboard exports reuse the actual rendered SVG and shared Neuro Atlas / PL R&D branding; compact keys retain the acquisition estimate/prospective qualifications.

The original provider snapshot, original acquisition evidence and weekly-refresh inputs are not rewritten. Tests pin numerical fits, source preservation, selected rendering, source-view state and export data. Native browser geometry, real clipboard/raster checks and production-build review are separate acceptance evidence.
