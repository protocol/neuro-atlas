# BCI source data and reproducible text conversions

## Chart and conversion models

The Neuro Atlas [chart method](../bci-bitrate.md) uses **1 assumed bit/character × 5 assumed characters/word including spaces** for five speech observations, a context-dependent English-entropy model referenced to Stanford’s [Entropy and Redundancy in English](https://cs.stanford.edu/people/eroberts/courses/soco/projects/1999-00/information-theory/entropy_of_english_9.html). Handwriting and three text-selection/scanning observations use **log2(28) ≈ 4.8 bits/character**. Handwriting uses **90 × log2(28) / 60 ≈ 7.211 bits/s**.

The chart displays **14 observations**: nine converted text estimates, three native task/company bitrates, and two unverified estimates. The mixed-convention descriptive regression fits only the nine converted text points; the other five observations are marked context/excluded. Error and assistance conditions remain distinct; **no extra WER/CER discount** is applied. All nine conversions are labeled **PL R&D estimate**. These are modeled output equivalents, not measured neural information rates or a common performance benchmark.

Years indicate publication, preprint, journal issue or company disclosure; source dates are shown per observation. Bacher uses the 2015 issue (online 2014), Stentrode the 2021 issue (online 2020), and home speech the 2025 preprint (final publication 2026). Cursor control A is shown at 2015 with an unverified source and year.

## Download and reproduce

| File | Scope |
|---|---|
| [Full-precision chart CSV](chart-provenance.csv) | All 14 plotted values, reported native inputs, conversion parameters, source dates/URLs, and explicit `fit_included=true/false`. |
| [Independent Python replay](reproduce_fit.py) | Standard library only. Prints all observations, the nine fitted rows, input hash, exact OLS coefficients and log-space R²/SSE/SST. Accepts a modified CSV for sensitivity checks. |
| [Chart methods](../bci-bitrate.md) | Speech entropy and symbol models, five-character word assumption, selected task/participant/statistic, source links, fitted cohort and limits. |

Download the CSV and script into the same folder, then run `python3 reproduce_fit.py`. Every row needs an explicit lowercase `true` or `false` selection. The CSV declares `conversion_basis`: `english-entropy` uses `normalization_bits_per_character` and `normalization_characters_per_word`; `equiprobable-alphabet` recomputes the weight from `normalization_alphabet_size`. The weight column records the derived weight for alphabet rows. The script recalculates converted rates independently of `plotted_bps`, so modified weights, alphabets and word lengths support sensitivity checks. The script derives coefficients from selected inputs rather than hardcoding the displayed result.

## Text-selection/scanning sources

- [Bacher Results/Figure 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC4426256/#F3): **9.4 ± 3.2 correct characters/min**, radial “keyboard ” copy task with word completion off. Ambiguous-key disambiguation remains. The **10.4 ± 2.4** “quick fox” task changes both text and completion setting, so it is not a clean treatment comparison. Online 2014; 2015 issue used for chart year.
- [Vansteensel Results](https://pmc.ncbi.nlm.nih.gov/articles/PMC5326682/): **33 seconds/letter with word prediction**, selected instead of the rounded two-letters/minute headline; ECoG brain-click scanning interface. The unassisted 52-second condition is separate.
- [Milekovic/Sarma Results/Figure 8](https://pmc.ncbi.nlm.nih.gov/articles/PMC6093965/#F0008): T6 **6.88 ± 0.33 correct characters/min** in free spelling **with word completion**; FlashSpeller scanning/neural-switch task.

The estimates are respectively approximately **0.753**, **0.146**, and **0.551 bits/s equivalent**. Correct-character rates already include correction costs; the coding rule is not an additional accuracy model.

## Unverified estimates

Kennedy & Bakay is shown at **≈0.24 bits/s**. The relevant [2000 paper](https://doi.org/10.1109/86.847815) is identified at metadata/abstract level, but its exact primary numerical rate is unverified. Cursor control A is shown at **≈0.90 bits/s**; its numerical source and publication year are unverified. Neither approximate point enters the text-equivalent fit.
