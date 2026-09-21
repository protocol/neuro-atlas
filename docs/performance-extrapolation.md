# Opt-in performance extrapolation and scenarios

## Scope

Extrapolation-only PR, based on `58dd8c2`. The separate Draft charts tab is not included. Canonical snapshot/provenance, source rows, navigation, preview SVGs and the tissue chart remain unchanged. Both expanded neuron and hours charts have a native keyboard-accessible switch, **off by default** on each modal mount. Off returns the exact original SVG. No persistence or URL change is introduced.

Enabled charts add horizontal reference targets and dashed scenario continuations. Growth-scenario selection changes the actual curve, crossing labels and fit diagnostics. The targets/model samples live outside the canonical observations and do not receive observation attributes. Expanded time domains are capped at 2200; unavailable/out-of-range results never get invented dates. Hours switch from linear to log while enabled, with an explicit notice. The 720px internal chart scroll keeps labels readable on narrow screens; off retains the original 560px minimum.

The interaction borrows the idea of inspectable assumptions and alternative fits from [METR's time-horizon view](https://metr.org/time-horizons/), not its statistical uncertainty model. These old, selected neurotech observations do not support a calibrated prediction interval.

## Method and R²

For one comparable track, ordinary least squares estimates the slope of `ln(value)` against decimal UTC year. Calendar dates are validated without silently normalizing impossible dates.

```
slope = Σ((year − meanYear) × (ln(value) − meanLog)) / Σ((year − meanYear)²)
doublingYears = ln(2) / slope
scenarioValue(year) = lastActualValue × exp(slope × (year − lastActualYear))
crossingYear = lastActualYear + (ln(target) − ln(lastActualValue)) / slope
R² = 1 − Σ((ln(observed) − ln(predicted))²) / Σ((ln(observed) − meanLog)²)
```

The dashed continuation is **anchored to the last actual value**, not the fitted OLS intercept. Therefore its historical R² differs from the unconstrained OLS R². The visible diagnostic reports the anchored scenario's log-space R²; **How to read the fit** discloses the unconstrained historical log-linear R² and the distinction. Both describe historical agreement, not forecast confidence or the probability a milestone occurs. Literature pace is a manual slope assumption, so no unconstrained OLS R² is claimed for it. A constant-value plateau has zero total variation and R² is **N/A**, not 1.

Exponential fitting requires at least three distinct valid dates, finite positive values, a single track and positive growth. It rejects conflicting last-date anchors, flat/decreasing series and invalid inputs. The explicit plateau scenario separately requires three final equal release values. No pooled fit across datasets or species is introduced.

## Neuron scenarios and reference counts

Seven retained checkpoints: `(1957,2), (1970,8), (1981,18), (1991,82), (1993,148), (2009,744), (2014,3200)`.

| Scenario | Window / N | Doubling | Anchored log R² | Unconstrained log R² | ≈70M mouse equivalent | ≈86B human equivalent |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Full-history fit | 1957–2014 / 7 | 5.520 years | 0.929299 | 0.980060 | ≈2094 | ≈2150 |
| Later-history fit | 1991–2014 / 4 | 4.912 years | 0.908043 | 0.958097 | ≈2085 | ≈2135 |
| Literature pace | compared against 1957–2014 / 7 | 7 years assumed | 0.670368 | Not claimed | ≈2115 | ≈2187 |

All three start at the same 2014 / 3,200 anchor. These are alternative assumptions, **not confidence bounds**. The later window is a fixed sensitivity slice using the final four selected checkpoints, not a statistically selected change point. The source itself reports roughly seven-year historical electrophysiology doubling: [Stevenson](https://stevenson.lab.uconn.edu/scaling/) and [Stevenson & Kording, 2011](https://www.nature.com/articles/nn.2731). A fit to seven selected Atlas points is not that literature estimate.

The total-neuron references were independently checked September 11, 2026:

- Mouse: Herculano-Houzel, Mota & Lent (2006), Table 1, [DOI 10.1073/pnas.0604911103](https://doi.org/10.1073/pnas.0604911103), reports 70.89 ± 10.41 million. Use approximately 70M, not an exact anatomical constant.
- Human: Azevedo et al. (2009), [DOI 10.1002/cne.21974](https://doi.org/10.1002/cne.21974), [PubMed](https://pubmed.ncbi.nlm.nih.gov/19226510/), reports 86.06 ± 8.12 billion across four adult male brains. Use approximately 86B.

The labels say **brain neuron-count equivalent**, not an achieved whole-brain recording capability. Historical mixed-species electrical recordings stop in 2014 and are not a current human-only frontier. Matching total counts does not establish spatial/temporal coverage, successful whole-brain live simultaneous recording, or feasibility. A completed anatomical connectome is different again.

## Hours scenarios

Only TUSZ has comparable release history in this snapshot. [The 2020 source, Table 1](https://isip.piconepress.com/conferences/ieee_spmb/2020/papers/p01_10.pdf) gives eight full corpus totals from April 17, 2017 through May 9, 2020: **170, 425, 504, 651, 651, 1,074, 1,074, 1,074 h**. These are overlapping release snapshots, never summed. Full totals include held-out evaluation data; they are not a measure of fully open training data or global human recording hours.

- **Historical expansion resumes:** all eight release totals, including plateaus, estimate a 1.393-year doubling time. Anchored log R² = 0.738950; unconstrained log R² = 0.829959. Continuing this rate from May 9, 2020 gives 100,000 h at ≈2029 and 100 million h at ≈2043. This assumes early expansion resumes and persists indefinitely.
- **Latest plateau continues:** the last three release values are all 1,074 h. Holding that value yields **no crossing** of either target. No doubling time or R² is invented.

Every hours date is labeled **TUSZ corpus-only**. Worldwide human-data ETA is explicitly unavailable. AJILE12, JapanEEG and nonhuman-primate POYO selections suppress the TUSZ line, diagnostics and dates; reference lines remain. Track filtering keeps the selected scenario's axes fixed and preserves source marker coordinates. All eleven source rows remain in the table.

The user's **100,000 h milestone** remains distinct from the [article's **100 million h** human-data goal](https://www.plrd.org/blog/neurotech-frontier-human-flourishing/). Corpus size does not establish current worldwide supply, unique subject-hours, access, quality or usable training data.

## Toggle motion

Expanded neuron and hours charts share an 800 ms cubic ease-in/out display-space transition. Historical marks, frontier lines, ticks, SVG viewBox height and minimum render width follow the same progress. The original height cap relaxes continuously during expansion. Incoming ticks enter from the old plot bounds and stay hidden until they have separated; model/target overlays reveal late and fade first on reversal. Source coordinates and scientific fits are not edited.

A reversal starts at the displayed progress, not an endpoint. Reduced motion snaps immediately (including preference changes during motion); unmount cancels RAF and removes its media-query listener. Settled off uses the original SVG markup and geometry. Scenario and track selection retain their existing immediate semantics; this animation is scoped to the extrapolation switch. Compact previews and tissue remain unchanged.

Enabled-only warnings, scenario selection and diagnostics sit below the chart. Both hint strings reserve one shared grid cell so narrow-screen wrapping cannot push the chart down on toggle. Physical chart-top stability and rendered sizes still require headed-browser checks; jsdom only verifies the layout structure and sizing inputs.

## Verification and evidence boundaries

The standard `npm test` glob includes:

- `extrapolation.test.mjs`: independent numeric fixtures, invalid/flat/decreasing/mixed histories, anchored first sample, bounded crossings, TUSZ-only fit with retained plateaus, unchanged source observations.
- `extrapolation-scenarios.test.mjs`: Python-corroborated OLS and anchored log R², later-window and literature crossings, flat-tail no-crossing/N/A behavior, unsupported-track suppression.
- `extrapolation-ui.test.mjs`: default-off/on/off behavior and exact untouched-base SVG hashes; scenario changes affecting real geometry; diagnostics, caveats and count-equivalent labels; filtering; unchanged canonical bytes, source counts/tables and previews; tissue preservation; modal reopen resets switch; source focus; CSS sizing.
- `extrapolation-motion.test.mjs`: deterministic fake RAF/media-query checks for both charts' intermediate geometry, easing, tick/reveal timing, render-sizing inputs, repeated reversals, exact settled-off SVG restoration, reduced-motion changes, StrictMode cleanup and stable above-chart controls.
- Existing modal/history/link/clipboard, Metrics layout and data-validation suites remain intact.

Run full tests, `npm run typecheck`, changed-file ESLint and `git diff --check`. Full-project lint has baseline issues outside this change; compare diagnostics rather than hiding them. Actual headed-browser QA must compare off/on/off against the untouched base at 1440/390/320, exercise scenario choices and unsupported tracks, check requested versus rendered width, page/modal/SVG bounds, keyboard switch and fit disclosure. Screenshots must be embedded in the PR with exact-SHA GitHub blob URLs.

Browser evidence is **local UI evidence** from a disposable clone with a loopback-only passthrough fixture. Hosted Basic Auth and the feature checkout's auth source are unchanged. Do not commit, push or deploy the local fixture. Local screenshots are not authenticated hosted verification.
