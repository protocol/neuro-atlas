# BCI communication rates — methods

## What the chart shows

The Neuro Atlas chart shows 14 communication-rate observations. **Five speech observations use 1 assumed bit/character × 5 assumed characters/word; handwriting and three text-selection/scanning observations use log2(28) bits/character.**

- **9 PL R&D estimates:** three text-selection/scanning results, handwriting, and five speech results. The two conversion models are specified below.
- **3 task-reported context rates:** Pandarinath **4.16 bits/s**, Oxley/Stentrode **0.46 bits/s**, and the Neuralink company report **8.0 bits/s**. Their task-specific bit definitions are used without text conversion.
- **2 unverified estimates:** Kennedy **≈0.24 bits/s** (paper identified, exact numerical rate unverified) and cursor control A, 2015, **≈0.90 bits/s** (source and year unverified). These approximate values are not source-verified numerical results.

The **fitted line uses only the nine converted text observations**. The other five points are labeled context and excluded from the fit. Native task metrics and unverified estimates do not determine the converted-text trend.

Years indicate publication, preprint, journal issue or company disclosure; source dates are shown per observation. Bacher uses the 2015 issue (online 2014), Stentrode the 2021 issue (online 2020), and home speech the 2025 preprint (final publication 2026). The 2015 cursor-control source and year are unverified.

## Speech: 1 assumed bit/character

The five speech estimates use **1 assumed bit/character**, with **5 assumed characters/word including spaces**:

```text
Speech: bits/s equivalent = words/minute × 5 × 1 / 60
```

The conversion reference is Stanford's [Entropy and Redundancy in English](https://cs.stanford.edu/people/eroberts/courses/soco/projects/1999-00/information-theory/entropy_of_english_9.html). It states that “some calculations place the entropy of English at around 1 bit per letter” and discusses how conditioning context and language redundancy affect entropy estimates. We adopt 1 bit/character as a **context-dependent English-entropy model**, rather than a measured property of these speech corpora. The five-character word length is a separate PL R&D assumption; the page does not establish that factor. Together they yield **5 assumed bits/word**.

## Handwriting and text selection/scanning: symbol equivalent

These four estimates use the hypothetical **28 equally likely symbols** model:

`bits per character = log2(28) = 4.807354922057604`

Twenty-six letters, a space, and one additional symbol illustrate the declared alphabet. This normalization convention describes output-text equivalents; the actual task keyboards and language correlations remain study-specific. An ideal independent-symbol information weight differs from English entropy, encoded file size and neural-channel capacity. A literal fixed-width 28-symbol code needs five binary digits per symbol.

```text
CPM result: bits/s equivalent = characters/minute × log2(28) / 60
Timing result: bits/s equivalent = log2(28) / seconds-per-letter
```

Handwriting uses **90 × log2(28) / 60 = 7.211032383086406 bits/s**.

**No additional WER/CER penalty or correction-overhead model is applied.** Bacher and Milekovic already report correct characters/minute with correction costs. Speech and handwriting retain their source-reported gross decoding pace, with accuracy/error and assistance conditions shown separately. The plotted subset therefore uses mixed conventions, as well as distinct evaluation protocols and gross-versus-correct output definitions.

## The nine converted observations

All converted values are labeled **PL R&D estimate**, with approximately qualified display values. Extra decimals below support reproducibility, not measurement precision.

| Study / year | Selected native result and task | Formula | Estimated bits/s equivalent |
|---|---|---|---:|
| [Bacher, 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4426256/#F3) | **9.4 ± 3.2 correct characters/min**, radial “keyboard ” copy task, completion off; ambiguous-key disambiguation remains. Online Nov. 10, 2014; 2015 issue used for chart year. | `9.4 × log2(28) / 60` | 0.7531522711223579 |
| [Vansteensel, 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5326682/) | **33 seconds/letter with word prediction**, ECoG brain-click/scanning interface. Printed timing selected instead of rounded “two letters/minute.” | `log2(28) / 33` | 0.14567742188053343 |
| [Milekovic/Sarma, 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6093965/#F0008) | **6.88 ± 0.33 correct characters/min**, T6 free spelling with word completion, FlashSpeller scanning/neural-switch interface. | `6.88 × log2(28) / 60` | 0.5512433643959386 |
| [Willett handwriting, 2021](https://doi.org/10.1038/s41586-021-03506-2) | **90 characters/min**, final evaluation day; **5.4% CER**, prompted copy handwriting. Gross pace is retained. | `90 × log2(28) / 60` | 7.211032383086406 |
| [Moses, 2021](https://doi.org/10.1056/NEJMoa2027540) | **15.2 WPM**, median prompted sentence decoding with language model; **25.6% WER**, 50-word vocabulary. WPM and WER have different source aggregation. | `15.2 × 5 × 1 / 60` | 1.2666666666666666 |
| [Willett speech, 2023](https://doi.org/10.1038/s41586-023-06377-x) | **62 WPM** headline mean pace; **23.8% WER** for the 125,000-word vocalized condition. The 9.1% WER result is a separate 50-word condition. | `62 × 5 × 1 / 60` | 5.166666666666667 |
| [Metzger, 2023](https://doi.org/10.1038/s41586-023-06443-4) | **78.3 WPM** median online decoding, **25.5% WER**, 1,024-word vocabulary. Larger-vocabulary offline simulation is separate. | `78.3 × 5 × 1 / 60` | 6.525 |
| [Card, 2024](https://doi.org/10.1056/NEJMoa2314132) | **31.6 WPM**, mean final five prompted-copy sessions; **2.5% WER**. | `31.6 × 5 × 1 / 60` | 2.6333333333333333 |
| [Card home use, 2025 preprint](https://www.biorxiv.org/content/10.1101/2025.06.26.661591v1.full) | **56.1 WPM** mean personal home use; no paired WER. Participant-rated sentence correctness is a different endpoint. Same participant as Card 2024. [Final publication June 15, 2026](https://doi.org/10.1038/s41591-026-04414-6). | `56.1 × 5 × 1 / 60` | 4.675 |

Bacher's **10.4-CPM “quick fox”** result uses both a different text and completion setting; it is not substituted into the selected 9.4-CPM condition. Vansteensel's unassisted **52 seconds/letter** is a separate condition. Completion-assisted output can contain multiple emitted characters per neural selection; the conversion counts output-text equivalents, not neural selections.

## Five context points, excluded from fitting

| Point | Active context value | Source and scope |
|---|---:|---|
| Kennedy & Bakay, 2000 | ≈0.24 bits/s | [Identified report](https://doi.org/10.1109/86.847815) available at metadata/abstract level; exact primary numerical rate unverified. Unverified estimate, not a paper-reported rate. |
| Cursor control A, 2015 | ≈0.90 bits/s | Unverified estimate; numerical source and publication year unverified. |
| Pandarinath, 2017 | 4.16 bits/s | [T5 9×9-grid mean, eight blocks/two days](https://doi.org/10.7554/eLife.18554); ±0.39. The 6×6 mean is 3.7 ±0.4; a 4.36 example block is not the selected mean. |
| Oxley / Stentrode, 2021 placement | ≈0.46 bits/s | [P2 author-estimated isolated motor-neuroprosthesis contribution](https://doi.org/10.1136/neurintsurg-2020-016862). Actual typing used eye tracking; hybrid result is 1.57. Online Oct. 28, 2020; 2021 issue. |
| Neuralink, 2024 | 8.0 bits/s | [May 8, 2024 company Webgrid report](https://neuralink.com/updates/prime-study-progress-update-user-experience/). Company disclosure, not independent validation. |

Task-specific native bits/s remain unconverted and separately identified. Their task information definitions remain distinct from the two modeled text-output equivalents.

## Refit and reproduce

Equal-weight unconstrained ordinary least squares of **log10(bits/s equivalent)** against year uses only rows with `fit_included=true` in the [full-precision 14-row provenance CSV](bci-study-data/chart-provenance.csv). All nine selected text observations and repeated years are retained; the five context observations remain visible but never enter that regression.

```text
log10(text-equivalent rate) = -0.4866672281088875
                            + 0.13216395418956403 × (year - 2015)
n = 9
R²(log10 rate) = 0.6581006670862894
```

The visible fitted-line key and native PNG display **R²(log10) = 0.658** and the **nine-text-point mixed-model fit**. The fitted line spans **2015–2025**, the included observations' range; earlier displayed context does not extend it. No extrapolation or confidence band is drawn.

Download [reproduce_fit.py](bci-study-data/reproduce_fit.py) beside the CSV and run:

```sh
python3 reproduce_fit.py
python3 reproduce_fit.py modified-provenance.csv
```

The dependency-free script recomputes conversions from native-rate inputs and an explicit `conversion_basis`. For `english-entropy`, `normalization_bits_per_character` supplies the assumed weight and `normalization_characters_per_word` supplies the word-length factor. For `equiprobable-alphabet`, the weight is recalculated as log2(`normalization_alphabet_size`); the bits/character column records the current derived weight. The script prints all inputs, the exact fitted subset, CSV SHA-256, full-precision coefficients, log-space R², SSE and SST. `csvPlottedBps` preserves the supplied plotted-value column for comparison, rather than determining converted rates. Changing the entropy weight, alphabet or word-length factor recalculates the fitted equivalents; the current CSV reproduces the chart. Legacy alphabet CSVs remain supported. Generic alternative rows with no conversion model can supply explicit `plotted_bps`. Selection must be explicitly `true` or `false` for every row; no coefficient is hardcoded.

To reproduce manually set `x = year - min(fitted years)`, `z = log10(rate)`; slope `b = sum((x-mean(x))*(z-mean(z)))/sum((x-mean(x))²)`, intercept `a = mean(z)-b*mean(x)`, and `R² = 1-SSE/SST` in log space. The app uses [the same OLS definition](../src/lib/log-linear-fit.ts), independently replayed by this script.

This is a **mixed-convention descriptive fit** to nine selected text observations: five speech English-entropy estimates and four symbol-equivalent estimates. It summarizes a heterogeneous subset with different tasks, participants, errors, assistance, summary statistics and gross/correct output definitions. It is not a common performance benchmark, causal scaling law, measured neural information capacity, or forecast.

Current study inputs, modality-specific conversions and fit membership are defined in [bci-bitrate.ts](../src/data/bci-bitrate.ts) and the full-precision CSV.
