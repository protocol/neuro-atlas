# BCI source data and reproducible text conversions

## Active chart

The [current method](../bci-bitrate.md) uses **1 assumed bit/character × 5 assumed characters/word including spaces** for five speech observations, a context-dependent English-entropy model referenced to Stanford’s [Entropy and Redundancy in English](https://cs.stanford.edu/people/eroberts/courses/soco/projects/1999-00/information-theory/entropy_of_english_9.html). Handwriting and three text-selection/scanning observations retain **log2(28) ≈ 4.8 bits/character**. Handwriting stays at **90 × log2(28) / 60 ≈ 7.211 bits/s**. Bacher, Vansteensel, and Milekovic/Sarma are now explicit named study selections in place of three image-derived heights. These selections do not establish the original figure author's anonymous-paper assignments.

The chart still displays all **14 reference IDs/year placements**: nine converted text estimates, three native task/company bitrates, and two remaining image estimates. The mixed-convention descriptive regression fits only the nine converted text points; the other five observations are marked context/excluded. Error and assistance conditions remain distinct; no extra WER/CER discount is applied. All nine conversions say **PL R&D estimate**.

## Download and reproduce

| File | Scope |
|---|---|
| [Current provenance CSV](chart-provenance.csv) | All 14 actual plotted values, reported native inputs, conversion parameters, source dates/URLs, original photo values, and explicit `fit_included=true/false`. |
| [Independent Python reconstruction](reproduce_fit.py) | Standard library only. Prints all observations, the nine fitted rows, input hash, exact OLS coefficients and log-space R²/SSE/SST. Accepts a modified CSV for sensitivity checks. |
| [Current methods](../bci-bitrate.md) | Speech entropy and retained symbol models, five-character word assumption, selected task/participant/statistic, source links, fitted cohort and limits. |
| [Original anonymous-point candidate audit](anonymous-point-candidates.md) | Historical attribution research for four unnamed original dots. The latter three have now been adopted as named selections in our chart, not confirmed original assignments. |
| [Identified slide-study results](identified-slide-study-results.csv) | Earlier native-rate inventory for 10 labeled report records; Kennedy's numerical rate is blank. Source evidence, not current plotted-value authority. |
| [Historical primary results](historical-primary-results.csv) | 19 printed outcomes from six studies; multiple participants/tasks/measures, not additional independent points to append. |
| [Historical retrospective comparisons](historical-retrospective-results.csv) | Eight later-author comparison rows, separate from original primary measurements. |

Download the CSV and script into the same folder, then run `python3 reproduce_fit.py`. Every row needs an explicit lowercase `true` or `false` selection. The active CSV declares `conversion_basis`: `english-entropy` uses `normalization_bits_per_character` and `normalization_characters_per_word`; `equiprobable-alphabet` recomputes the weight from `normalization_alphabet_size`. The weight column records the current derived weight for alphabet rows. The script recalculates converted rates independently of `plotted_bps`, so modified weights, alphabets and word lengths support sensitivity checks. The script derives coefficients from selected inputs rather than hardcoding the displayed result.

## Primary sources for the three adopted selections

- [Bacher Results/Figure 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC4426256/#F3): **9.4 ± 3.2 correct characters/min**, radial “keyboard ” copy task with word completion off. Ambiguous-key disambiguation remains. The **10.4 ± 2.4** “quick fox” task changes both text and completion setting, so it is not a clean treatment comparison. Online 2014; 2015 issue/year placement retained.
- [Vansteensel Results](https://pmc.ncbi.nlm.nih.gov/articles/PMC5326682/): **33 seconds/letter with word prediction**, selected instead of the rounded two-letters/minute headline; ECoG brain-click scanning interface. The unassisted 52-second condition remains separate.
- [Milekovic/Sarma Results/Figure 8](https://pmc.ncbi.nlm.nih.gov/articles/PMC6093965/#F0008): T6 **6.88 ± 0.33 correct characters/min** in free spelling **with word completion**; FlashSpeller scanning/neural-switch task.

Current estimates are respectively approximately **0.753**, **0.146**, and **0.551 bits/s equivalent**. Correct-character rates already include correction costs; the coding rule is not an additional accuracy model.

## Archived original figure

The [Sumner Norman post](https://x.com/SumnerLN/status/2069192808016273813) and [original-size JPEG](https://pbs.twimg.com/media/HLc_CpXaIAA-nFr?format=jpg&name=orig) establish figure provenance. The original table/code, conversion equation and band method remain unavailable.

[src/data/bci-bitrate.source.json](../../src/data/bci-bitrate.source.json) preserves the original 14 photographed coordinates, quotations/calibration and traced-line history unchanged. [The candidate ledger](../../src/data/bci-bitrate.candidates.json) remains archival attribution research. The current active study selections and values live in [bci-bitrate.ts](../../src/data/bci-bitrate.ts) and the current CSV.

The upper 2015 mark remains an image estimate with Gilja/Jarosiewicz candidates. Kennedy's relevant [2000 paper](https://doi.org/10.1109/86.847815) is identified, but its exact primary bitrate remains unresolved. Neither graphical context point enters the current text fit.

The current speech-only revision replaces the preceding log2(28)-per-character speech model. Its explicit entropy and word-length assumptions yield five assumed bits/word. The older author-issued corrected-typing handwriting model remains historical context; the active handwriting symbol equivalent is unchanged. Historical evidence and QA retain their original meanings. No outreach, monitoring, merge or production release is part of this update.
