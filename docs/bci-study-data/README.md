# BCI source-study data and original-figure provenance

## Original figure recovered

The exact underlying 14-mark chart was publicly posted by [Sumner L Norman on June 22, 2026](https://x.com/SumnerLN/status/2069192808016273813). Its [original-size published JPEG](https://pbs.twimg.com/media/HLc_CpXaIAA-nFr?format=jpg&name=orig) matches the supplied photograph's labels, four marker classes, seven cursor circles including four anonymous marks, five speech squares, handwriting diamond, Stentrode triangle and overlays. The slide adds its title/footer; the published raster establishes figure provenance, not presenter identity.

**The original numeric table and plotting code have not been recovered.** The current chart now uses **2 paper-reported rates, 6 derived estimates from paper/preprint inputs, 1 company report and 5 retained image estimates**. Every point identifies its basis; the [14-row current-chart provenance CSV](chart-provenance.csv) shows reported input versus calculation versus image coordinate. The original 14 image-derived coordinates remain archived unchanged in the source ledger. See the [active chart method](../bci-bitrate.md) and [four anonymous-point candidates](anonymous-point-candidates.md).

## Downloadable data

| File | Scope | Interpretation |
|---|---|---|
| [Current chart provenance](chart-provenance.csv) | All 14 displayed observations, with explicit evidence labels | Actual plotted values, source-native input, calculation, retained image value and candidate links. Five speech estimates use a declared 5-bits/word convention; handwriting uses the authors' separate empirical approximation. |
| [Anonymous-point candidate audit](anonymous-point-candidates.md) | Four unconfirmed assignments, with alternatives | Candidate papers and their actual native results exist; they are not confirmed identities or extra paper-backed chart points. |
| [Identified slide-study results](identified-slide-study-results.csv) | 10 labeled report records; nine have a source-native numeric rate, Kennedy's rate is blank | Native rate/unit/task/error and original source URL. These are not 10 comparable measured bps values. Four anonymous slide marks are not assigned here. |
| [Historical primary results](historical-primary-results.csv) | 19 printed outcomes from six historical studies | Multiple participants, tasks and measures; no sum, common normalization or proven anonymous-slide assignment. |
| [Historical retrospective comparisons](historical-retrospective-results.csv) | Eight later-author comparison rows | Explicitly separate from original primary-study measurements. Their printed source/column and limitations travel with the numbers. |

The historical files overlap in studies/participants with the identified-study table and one another. Row counts describe records, not independent studies, participants or additional points to append to the chart.

## Newly recovered historical tables

- [Gilja et al. 2015, Supplementary Table 1, PDF pages 1–2](https://static-content.springer.com/esm/art%3A10.1038%2Fnm.3953/MediaObjects/41591_2015_BFnm3953_MOESM47_ESM.pdf): printed T6 **0.93** and T7 **0.92 Fitts bits/s**. The table subtracts hold time. Its primary [task definition](https://pmc.ncbi.nlm.nih.gov/articles/PMC4805425/#S3) uses a particular target-distance/width convention. These are not error-corrected random-grid bitrates, and resemblance to anonymous 2015 marks does not prove an assignment.
- [Jarosiewicz et al. 2015, Figure 3C](https://pmc.ncbi.nlm.nih.gov/articles/PMC4765319/): defines extrapolated bitrate from correct selections/minute and eight radial-keyboard targets. The printed overall **15.0/14.6 correct selections/minute** means include sessions to which that radial-only conversion does not apply; no blanket conversion is made here.
- [Pandarinath et al. 2017, Table 1](https://doi.org/10.7554/eLife.18554.021): later comparative Jarosiewicz average **0.59 bps**, with participant values **0.93/0.64/0.58/0.19**, and Vansteensel **0.21-bps ITR**. These remain retrospective rows, not newly recovered exact values from the earlier original studies or proof of the photo's identities.
- [Vansteensel et al. 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5326682/#S10): primary **52 seconds/letter**, **33 seconds/letter with word prediction**. Preserve prediction and task conditions. The approximate low 2016 photo mark is not thereby identified.
- [Milekovic et al. 2018, Table 3 and appendix](https://pmc.ncbi.nlm.nih.gov/articles/PMC6093965/): primary **3.07/6.88 correct characters/minute**, a scanning speller with word completion, plus a useful original comparison table. This is a neural-switch task, not automatically the unidentified cursor circle in 2018.
- [Nuyujukian et al. 2018](https://doi.org/10.1371/journal.pone.0204566): participant-specific selections/minute and effective characters/minute are retained separately; no exact 0.53-bps result was recovered.

## Kennedy remains unresolved numerically

The [2000 original report](https://doi.org/10.1109/86.847815) was recovered at metadata/abstract level; its full numerical table was unavailable. [An investigator follow-up](https://ecl.cc.gatech.edu/sites/default/files/publications/C.34-Moore-CHI-2001.pdf) documents EMG-switch or dwell selection. The [2002 Wolpaw review](https://www.cs.cmu.edu/~tanja/BCI/BCIreview.pdf) reports approximately three letters/minute/about 15 bits/minute for **hybrid neuronal plus residual EMG control**. That secondary approximate hybrid figure is not silently promoted to an exact primary pure-BCI rate.

## Speech and handwriting

The six original native speech/handwriting rates and task/error/date pairings are in the identified-study CSV and [main source audit](../bci-bitrate.md#study-native-evidence). The active chart labels handwriting **Author estimate** (the separate technical report's **≈6.18-bps empirical approximation**, based on the observed **90 characters/minute**) and five speech values **Atlas-calculated** (reported WPM × **5 assumed information bits/word** ÷ 60, no error adjustment). Those explicit selections do not recover the original figure's formula and are not measured neural ITR.

## Independent reconstruction is not the original dataset

[ITR Atlas](https://tangemicioglu.com/projects/itr-atlas/) and its [public source](https://github.com/tangemicioglu/itr-atlas) led to the original posted figure. It independently re-derives scores using explicit, sometimes different conventions; it is not Sumner Norman's original 14-row dataset. Its scores have not been substituted into this chart.

## Remaining gaps

Original numeric table/code, four anonymous-study assignments, Kennedy's exact original bitrate, the original language-to-bitrate convention, and band/statistical construction remain open. No outreach, access grant, recurring collection, merge or production publication is authorized by this research task.
