# BCI communication rates — one text conversion

## What the chart shows

The chart keeps 14 reference observation IDs and year placements, but now uses **one declared text-to-bit-equivalent rule for all nine text observations**. It explicitly selects Bacher, Vansteensel, and Milekovic/Sarma results in place of three anonymous image heights. These are named, source-backed selections for this reconstruction; the original author's intended anonymous-paper assignments remain unconfirmed.

- **9 PL R&D estimates:** three text-selection/scanning results, handwriting, and five speech results. All use the same 28-symbol convention below.
- **3 task-reported context rates:** Pandarinath **4.16 bits/s**, Oxley/Stentrode **0.46 bits/s**, and the Neuralink company report **8.0 bits/s**. Their original task-specific bit definitions remain intact.
- **2 image-estimated context points:** Kennedy **≈0.24 bits/s** (paper identified, exact numerical result unverified) and the upper 2015 anonymous mark **≈0.90 bits/s** (Gilja/Jarosiewicz candidates). Their image coordinates are explicit context, not source-verified rates.

The **fitted line uses only the nine converted text observations**. The other five points are labeled context and excluded from the fit. This keeps native task metrics and remaining graphical estimates from determining the converted-text trend.

## Why approximately 4.8 bits per character?

For a hypothetical alphabet of **28 equally likely symbols**, the information needed to identify one independent symbol is:

`bits per character = log2(28) = 4.807354922057604`

Twenty-six letters, a space, and one additional symbol illustrate the declared alphabet. It is a **shared normalization convention**, not a claim that all studies used those exact keyboard targets, that natural-language characters are independent/equiprobable, or that English actually carries 4.8 new information bits per character. Language correlations and predictive completion can reduce the information supplied by the user's neural signal.

It is also distinct from file storage: an 8-bit character encoding assigns eight storage bits per character. A literal fixed-width binary code for 28 symbols needs five bits per symbol; 4.807 is the ideal information weight under the stated uniform model. Here the aim is a fixed **28-symbol text-output equivalent**, not encoded file size or measured neural-channel capacity.

### The same formulas everywhere

```text
CPM result: bits/s equivalent = characters/minute × log2(28) / 60
WPM result: bits/s equivalent = words/minute × 5 × log2(28) / 60
Timing result: bits/s equivalent = log2(28) / seconds-per-letter
```

**Five characters per word, including word-separating spaces, is an assumed normalization factor**, not a measured average from each spoken corpus. It yields **24.03677461028802 assumed bits per word**. A different common alphabet or word-length factor changes the estimates; the CSV and script allow sensitivity checks.

**No additional WER/CER penalty or correction-overhead model is applied.** Bacher and Milekovic already report correct characters/minute with correction costs; discounting them again would double-count errors. Speech and handwriting retain their source-reported decoding pace, with accuracy/error and assistance conditions shown separately. Thus the conversion is uniform, while the underlying evaluation protocols and gross-versus-correct output definitions still differ.

## The nine converted observations

All converted values are labeled **PL R&D estimate**, with approximately qualified display values. Extra decimals below support reconstruction, not measurement precision.

| Study / reference-year placement | Selected native result and task | Formula | Estimated bits/s equivalent |
|---|---|---|---:|
| [Bacher, 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4426256/#F3) | **9.4 ± 3.2 correct characters/min**, radial “keyboard ” copy task, completion off; ambiguous-key disambiguation remains. Online Nov. 10, 2014; 2015 issue used for chart year. | `9.4 × log2(28) / 60` | 0.7531522711223579 |
| [Vansteensel, 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5326682/) | **33 seconds/letter with word prediction**, ECoG brain-click/scanning interface. Printed timing selected instead of rounded “two letters/minute.” | `log2(28) / 33` | 0.14567742188053343 |
| [Milekovic/Sarma, 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6093965/#F0008) | **6.88 ± 0.33 correct characters/min**, T6 free spelling with word completion, FlashSpeller scanning/neural-switch interface. | `6.88 × log2(28) / 60` | 0.5512433643959386 |
| [Willett handwriting, 2021](https://doi.org/10.1038/s41586-021-03506-2) | **90 characters/min**, final evaluation day; **5.4% CER**, prompted copy handwriting. Gross pace is retained. | `90 × log2(28) / 60` | 7.211032383086406 |
| [Moses, 2021](https://doi.org/10.1056/NEJMoa2027540) | **15.2 WPM**, median prompted sentence decoding with language model; **25.6% WER**, 50-word vocabulary. WPM and WER have different source aggregation. | `15.2 × 5 × log2(28) / 60` | 6.089316234606298 |
| [Willett speech, 2023](https://doi.org/10.1038/s41586-023-06377-x) | **62 WPM** headline mean pace; **23.8% WER** for the 125,000-word vocalized condition. The 9.1% WER result is a separate 50-word condition. | `62 × 5 × log2(28) / 60` | 24.838000430630952 |
| [Metzger, 2023](https://doi.org/10.1038/s41586-023-06443-4) | **78.3 WPM** median online decoding, **25.5% WER**, 1,024-word vocabulary. Larger-vocabulary offline simulation is separate. | `78.3 × 5 × log2(28) / 60` | 31.367990866425867 |
| [Card, 2024](https://doi.org/10.1056/NEJMoa2314132) | **31.6 WPM**, mean final five prompted-copy sessions; **2.5% WER**. Uses the source aggregate rather than the reference image's 33-WPM label. | `31.6 × 5 × log2(28) / 60` | 12.659367961418356 |
| [Card home use, 2025 preprint](https://www.biorxiv.org/content/10.1101/2025.06.26.661591v1.full) | **56.1 WPM** mean personal home use; no paired WER. Participant-rated sentence correctness is a different endpoint. Same participant as Card 2024. [Final publication June 15, 2026](https://doi.org/10.1038/s41591-026-04414-6). | `56.1 × 5 × log2(28) / 60` | 22.474384260619296 |

Bacher's **10.4-CPM “quick fox”** result uses both a different text and completion setting; it is not substituted into the selected 9.4-CPM condition. Vansteensel's unassisted **52 seconds/letter** is a separate condition. Completion-assisted output can contain multiple emitted characters per neural selection; the conversion counts output-text equivalents, not neural selections.

### Superseded text models

The previous chart used five assumed bits/**word** for speech and an author-issued empirical correction-overhead approximation for handwriting (**16.06 correct WPM / 2.6 ≈ 6.18 bits/s**). Neither determines the current plotted text values. The [Stanford authors' report](https://stacks.stanford.edu/file/druid:jx921pv3255/TechnicalReport01_GPT_BCIs-2021-05-20.pdf) remains useful historical context; the current handwriting calculation uses the same log2(28)-per-character rule as every other text result.

## Five context points, excluded from fitting

| Point | Active context value | Source and scope |
|---|---:|---|
| Kennedy & Bakay, 2000 | ≈0.24 bits/s | [Relevant original report](https://doi.org/10.1109/86.847815) identified at metadata/abstract level; exact primary numerical result unverified. Value is an image estimate. |
| Upper anonymous cursor dot, 2015 | ≈0.90 bits/s | Image estimate. Candidate [Gilja Fitts 0.93/0.92](https://static-content.springer.com/esm/art%3A10.1038%2Fnm.3953/MediaObjects/41591_2015_BFnm3953_MOESM47_ESM.pdf) or [Jarosiewicz](https://pmc.ncbi.nlm.nih.gov/articles/PMC4765319/), T6 0.93 in [later comparison](https://doi.org/10.7554/eLife.18554.021); assignment remains unconfirmed. |
| Pandarinath, 2017 | 4.16 bits/s | [T5 9×9-grid mean, eight blocks/two days](https://doi.org/10.7554/eLife.18554); ±0.39. The 6×6 mean is 3.7 ±0.4; a 4.36 example block is not the selected mean. |
| Oxley / Stentrode, 2021 placement | ≈0.46 bits/s | [P2 author-estimated isolated motor-neuroprosthesis contribution](https://doi.org/10.1136/neurintsurg-2020-016862). Actual typing used eye tracking; hybrid result is 1.57. Online Oct. 28, 2020; 2021 issue. |
| Neuralink, 2024 | 8.0 bits/s | [May 8, 2024 company Webgrid report](https://neuralink.com/updates/prime-study-progress-update-user-experience/). Company disclosure, not independent validation; exact original image statistic unresolved. |

Task-specific native bits/s remain unconverted and separately identified. Uniform text coding does not equate their task information definitions with emitted-text equivalents.

## Refit and reproduce

Equal-weight unconstrained ordinary least squares of **log10(bits/s equivalent)** against reference-year placement uses only rows with `fit_included=true` in the [full-precision 14-row provenance CSV](bci-study-data/chart-provenance.csv). All nine selected text observations and repeated years are retained; the five context observations remain visible but never enter that regression.

```text
log10(text-equivalent rate) = -0.5876903668979486
                            + 0.2168451146451006 × (year - 2015)
n = 9
R²(log10 rate) = 0.8469690315566175
```

The visible fitted-line key and native PNG display **R²(log10) = 0.847** and the **nine-text-point fit**. The fitted line spans **2015–2025**, the included observations' range; earlier displayed context does not extend it. No extrapolation or confidence band is drawn.

Download [reproduce_fit.py](bci-study-data/reproduce_fit.py) beside the CSV and run:

```sh
python3 reproduce_fit.py
python3 reproduce_fit.py modified-provenance.csv
```

The dependency-free script recomputes text conversions from the native-rate and normalization columns, then prints all inputs, the exact fitted subset, CSV SHA-256, full-precision coefficients, log-space R², SSE and SST. `csvPlottedBps` preserves the supplied plotted-value column for comparison. Editing the alphabet or word-length factor recalculates the fitted equivalents; the current CSV exactly reproduces the chart. Generic alternative rows without normalization parameters can instead supply explicit `plotted_bps`. Selection must be explicitly `true` or `false` for every row; no coefficient is hardcoded. To reconstruct manually set `x = year - min(fitted years)`, `z = log10(rate)`; slope `b = sum((x-mean(x))*(z-mean(z)))/sum((x-mean(x))²)`, intercept `a = mean(z)-b*mean(x)`, and `R² = 1-SSE/SST` in log space. The app uses [the same OLS definition](../src/lib/log-linear-fit.ts), independently replayed by this script.

This is a **descriptive fit to selected reported communication results under one coding convention**. Different tasks, participants, errors, assistance, reported summary statistics and gross/correct output definitions remain. It is not a causal scaling law, an error-standardized leaderboard, measured neural information capacity, or forecast.

## Reference figure and archived evidence

The reference was recovered in [Sumner Norman's June 22, 2026 post](https://x.com/SumnerLN/status/2069192808016273813) and its [original-size image](https://pbs.twimg.com/media/HLc_CpXaIAA-nFr?format=jpg&name=orig). Original numeric table/code, conversions and band method remain unavailable. Source-backed selections need not coincide with that image's heights.

[src/data/bci-bitrate.source.json](../src/data/bci-bitrate.source.json) remains an unchanged archive of 14 photographed coordinates, source quotations and calibration; [the original candidate ledger](../src/data/bci-bitrate.candidates.json) remains historical attribution research. Active selections, common conversion and fit membership live in [bci-bitrate.ts](../src/data/bci-bitrate.ts) and the provenance CSV. Historical QA stays separate from the current method.

## Surface and authority

The chart stays under **Human interfaces and recordings**, `#bci-information-transfer-over-time`, with five-year year ticks, native point inspection, accessible history/focus, copy and PNG controls. The standalone image carries concise named observation keys, values/units, conversion basis and fit/context membership; long method notes stay on site.

This is an update to PR112. Access/launch configuration, packages, frozen historical acceptance inventory, recurring jobs, merge and production publication remain unchanged.
