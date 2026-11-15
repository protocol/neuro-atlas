# BCI bitrate chart — reference reconstruction and source audit

## What this chart is

**A visual reconstruction of the 14 observations in a photographed “Bitrate Scaling” slide. Every plotted year and bitrate is approximate.** The original numeric table, plotting code, language-to-bitrate conversion and fit construction were not recovered.

The reconstruction keeps all 14 visible marks: seven cursor/grid circles, one endovascular triangle, five speech squares and one handwriting diamond. Four cursor circles have no legible author label and remain unidentified. Source papers support the separate study-native results below; their values have not been substituted for the photographed coordinates.

The photograph is not redistributed. `src/data/bci-bitrate.source.json` records its SHA-256, rectification corners, manual axis control points, pixel centers, coordinate transform, rounding policy and per-mark source reconciliation. The reference image is required to reproduce the digitization independently; the ledger alone is not the original experimental dataset.

## Original published figure and study-native data

The same underlying chart was recovered in [Sumner L Norman’s June 22, 2026 post](https://x.com/SumnerLN/status/2069192808016273813), with its [original-size published raster](https://pbs.twimg.com/media/HLc_CpXaIAA-nFr?format=jpg&name=orig). This establishes the figure’s provenance; it does not recover the numeric table or original plotting code. The [source-study data package](bci-study-data/README.md) includes separately sourced native measurements, primary historical tables, retrospective comparison rows and remaining gaps. None has been silently substituted for the approximate plotted values.

## Digitization

1. Rectify the photographed screen to a 2,200 × 1,400-pixel plane using four manually selected corners.
2. Select visible year ticks and log-axis ticks (0.1, 0.5, 1, 5, 10 and 50 bits/s).
3. Fit a projective transform from rectified pixel centers to `year − 2000` and `log10(bits/s)`. For `q = H × [pixelX, pixelY, 1]`, recover `year = 2000 + q[0]/q[2]` and `bits/s = 10^(q[1]/q[2])`. The rectification destination corners are `(0,0), (2200,0), (2200,1400), (0,1400)`.
4. Transform each of the 14 visually selected marker centers. Round years to the nearest integer and bitrates to two significant digits; retain `≈` everywhere.
5. Keep category and symbol identity from the slide. Never infer an anonymous mark’s paper from its resemblance to a published result.

Perspective distortion, screen curvature, blurred ticks and manual center selection limit accuracy. Two significant digits are display rounding, not measurement precision or a calibrated confidence interval. The y-axis is deliberately labeled **Approximate slide rate**. Native article dates and rates are retained separately in inspection and the source table.

## Study-native evidence

| Visible slide label | Verified source-native result | Source/date and qualification |
|---|---|---|
| Kennedy & Bakay | Relevant neurotrophic-electrode computer-control report identified; exact bitrate unresolved. | [Kennedy et al., 2000](https://doi.org/10.1109/86.847815). Metadata/abstract only; full paper not recovered. |
| Pandarinath et al., ReFIT-KF/grid | T5 9×9-grid mean **4.16 ± 0.39 bits/s**, eight blocks across two days. The 6×6 condition is 3.7 ± 0.4 bits/s; 4.36 is one example video block. | [Pandarinath et al., 2017](https://doi.org/10.7554/eLife.18554). The slide’s selected condition/statistic remains unconfirmed. |
| Neuralink PRIME, Webgrid 30×30 | Company reported **8.0 bits/s** in May 2024. An October 2026 article retrospectively cites a previous 10.39-bits/s record without dating its achievement. | [May 8, 2024 update](https://neuralink.com/updates/prime-study-progress-update-user-experience/); [October 1, 2026 update](https://neuralink.com/updates/pretraining-on-50000-hours/). The exact slide value/date/grid combination remains unresolved; company claims are not independent validation. |
| Synchron Stentrode | Estimated isolated motor-neuroprosthesis contribution: P1 **0.32**, P2 **0.46 bits/s**. Hybrid eye-tracker results: 1.08 and 1.57 bits/s. | [Oxley et al.](https://doi.org/10.1136/neurintsurg-2020-016862), online October 28, 2020; February 2021 issue. Actual typing used eye-tracking. Hybrid results must not be relabeled as motor-neuroprosthesis-only rates. |
| Willett handwriting, 90 cpm | Final evaluation day **90 characters/min**, **5.4% CER**; overall headline accuracy 94.1% is a different aggregation. | [Willett et al., May 12, 2021](https://doi.org/10.1038/s41586-021-03506-2). Prompted copy task; free responses separately reached 73.8 characters/min with 8.54% CER. |
| Moses & Chang, 50-word speech | **15.2 words/min** median; **25.6% WER** with the language model, restricted 50-word vocabulary. | [Moses et al., July 14, 2021](https://doi.org/10.1056/NEJMoa2027540). Prompted sentence decoding; 12.5 correct words/min is separately reported. |
| Willett speech, 62 WPM | Headline mean pace **62 words/min**; **23.8% WER** for the 125,000-word vocalized condition. | [Willett et al., August 23, 2023](https://doi.org/10.1038/s41586-023-06377-x). The 9.1% WER result belongs to a 50-word condition; do not combine it with the large vocabulary. |
| Metzger & Chang, 78 WPM | Median **78.3 words/min**, **25.5% WER**, 1,024-word online vocabulary. | [Metzger et al., August 23, 2023](https://doi.org/10.1038/s41586-023-06443-4). The larger 39,378-word result is an offline simulation. |
| Card & Stavisky, 33 WPM / 2.5% WER | Final five copy-task sessions: **31.6 words/min**, **2.5% WER**. | [Card et al., August 14, 2024](https://doi.org/10.1056/NEJMoa2314132). Retain the slide label as a slide label, not an exact source aggregate. |
| Card & Stavisky, 56 WPM / home use | Preprint mean **56.1 words/min** personal use; 92.3% of sentences self-rated at least mostly correct. | [Version 1 preprint, posted July 7, 2025](https://www.biorxiv.org/content/10.1101/2025.06.26.661591v1.full); [final paper, June 15, 2026](https://doi.org/10.1038/s41591-026-04414-6). Self-rated sentence correctness is not WER; prompted copy results are separate. |
| Four anonymous cursor marks | No verified identity. | Two near 2015, one near 2016 and one near 2018. All remain explicit unresolved slide observations. |

### Author handwriting approximation

A separate [Stanford technical report, version 2.7, May 20, 2021](https://stacks.stanford.edu/file/druid:jx921pv3255/TechnicalReport01_GPT_BCIs-2021-05-20.pdf) estimates handwriting bitrate as approximately **6.18 bits/s** from `16.06 corrected words/min ÷ 2.6 corrected words/min per bit/s`. That estimate assumes five characters/word and modeled backspace correction. It is neither a measured neural information rate nor proof of the slide’s conversion. It is retained as source context, not used to overwrite the reconstructed mark.

## Comparability and deliberate omissions

Cursor achieved bitrate, symmetric-choice ITR, language-model-assisted speech rate and handwriting output use different tasks, error treatments and priors. A common bits/s display does not establish equal measurement meaning. No new WPM/CPM-to-bps formula is introduced, and no fitted scaling law is claimed.

## Descriptive fitted trendline

On request, the olive line is now an **equal-weight ordinary least-squares fit of log10(bits/s) against year using all 14 approximate observations**, including repeated years. It replaces the earlier visually traced line. The source values themselves are unchanged. The fit is computed from the actual rendered observations by `src/lib/log-linear-fit.ts`, with an unconstrained intercept:

`log10(rate) = −0.935756 + 0.060227 × (year − 2000)`

`n = 14; R²(log10 rate) ≈ 0.460082`.

The line is labeled **Log-linear fit · 14 approximate points** in preview, detail and native image exports. It is drawn only over observed years, 2000–2025. R² describes the scatter of these reconstructed points in log space; it is not forecast confidence or proof of comparable task performance. The original slide's numerical table and fit method remain unavailable. No confidence band or forecast is displayed.

The earlier eight-pixel visual trace is preserved under `referenceTrendline` in the source ledger as an explicitly archived reconstruction; it no longer determines the displayed line.

The shaded band and dashed speech/typing benchmarks remain omitted: their numerical inputs and statistical meaning are unverified. The rebuilt plot preserves the observations, category colors and marker distinctions.

A related [Meyer and Zamani review](https://doi.org/10.1088/1741-2552/ae6dfd) and its author code were checked. Its available repository concerns recording-channel counts; it is not the source of this 14-point chart.

## Implementation and review scope

The chart is additive under **Human interfaces and recordings**, with stable fragment `#bci-information-transfer-over-time`. Native source inspection, source-table access, keyboard dismissal/history, Copy link, Copy chart and Download PNG use existing Atlas controls. Shared images retain a concise numbered observation key with `≈` values, PL R&D branding and the Neuro Atlas link. Access, launch settings and production publication are unchanged. This is a manually curated reconstruction; no recurring refresh is configured.
