# BCI bitrate chart — reported results and explicit estimates

## Current chart

The rebuilt chart preserves the reference figure's **14 observation identities/year placements**, while replacing nine image-derived y-values with explicit report-based selections:

- **2 paper-reported rates:** Pandarinath T5 9×9-grid mean **4.16 bits/s**; Oxley/Stentrode P2 **0.46 bits/s**, an author-estimated isolated motor-neuroprosthesis contribution rather than the hybrid eye-tracker result.
- **6 derived estimates from paper/preprint inputs:** five speech rates converted with a declared **5 information bits/word** convention, plus the handwriting authors' separate empirical bitrate approximation.
- **1 company-reported rate:** Neuralink **8.0 bits/s**.
- **5 remaining image estimates:** Kennedy (paper identified, numerical result unverified) plus four anonymous marks with linked candidate papers.

Every numbered observation key, source inspection and exported PNG states **Paper-reported**, **Paper-reported estimate**, **PL R&D estimate**, **Author estimate**, **Company-reported** or **Image estimate**. The [14-row provenance CSV](bci-study-data/chart-provenance.csv) records every displayed value, reported input, calculation, original image value, source and candidate status. This is not a recovered original 14-row dataset.

## Original figure and archived digitization

The same underlying chart was recovered in [Sumner L Norman's June 22, 2026 post](https://x.com/SumnerLN/status/2069192808016273813), with its [original-size published raster](https://pbs.twimg.com/media/HLc_CpXaIAA-nFr?format=jpg&name=orig). The original numeric table/code and conversion choices remain unavailable. The photograph is not redistributed.

`src/data/bci-bitrate.source.json` preserves all original image-derived observations, source-native quotations, calibration and traced-line samples unchanged. Its observation coordinates are an **archived reconstruction**, not the current nine report-based selections. The original method rectified the photograph to 2,200 × 1,400 pixels, then transformed manually selected pixel centers to year and log10(bits/s), rounding years to integers and rates to two significant digits. Screen distortion and manual selection make those values approximate, not uncertainty-calibrated.

The selected native results need not equal the original figure's chosen statistic. In particular, the chart now explicitly selects the 4.16-bits/s 9×9-grid result rather than the image's approximate 3.5; it does not claim the original author used that condition. Reference-year placement remains distinct from source publication date.

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


## Explicit text-rate calculations

### Five speech estimates

`estimated bits/s = paper-reported words/minute × 5 assumed information bits/word ÷ 60`

The working assumptions are one information bit per character and five characters per word, consistent with the explicitly declared [independent ITR Atlas convention](https://tangemicioglu.com/itr-atlas/methodology/). Extending a five-character typing convention to these spoken-word counts is a PL R&D assumption, not a measured corpus average. We apply **no WER adjustment**: each paper's error measure, vocabulary and task remain separate. This gross-rate illustration is not a reproduction of ITR Atlas's error-discounted strictest-bound rankings.

| Study | Reported WPM | PL R&D-estimated bits/s |
|---|---:|---:|
| Moses 2021 | 15.2 | 1.266667 |
| Willett speech 2023 | 62 | 5.166667 |
| Metzger 2023 | 78.3 | 6.525000 |
| Card 2024 | 31.6 | 2.633333 |
| Card home-use preprint 2025 | 56.1 | 4.675000 |

These are **information-rate proxies**, not encoded bytes or measured neural-channel ITR. One byte is eight bits; an assumed one-byte/character text encoding is a different quantity. The original chart's formula has not been recovered. Home-use speech has no same-task WER in this source selection; missing error is not zero error.

### Source-authored handwriting estimate

The [Stanford author technical report, version 2.7, May 20, 2021](https://stacks.stanford.edu/file/druid:jx921pv3255/TechnicalReport01_GPT_BCIs-2021-05-20.pdf) explicitly approximates handwriting bitrate as **16.06 correct WPM ÷ 2.6 correct WPM per bit/s ≈ 6.18 bits/s**. This model uses the 90-CPM, 5.4%-CER final-day result, five characters/word and modeled backspace overhead. The source's rounded intermediate 16.06 is retained in the calculation; extra runtime decimals are arithmetic, not measurement precision.

This is labeled **Author estimate**, not a measured ITR in the Nature paper, and not the same model as the speech proxy. It is preferred here over introducing a new symmetric-character-channel model solely to resemble the image. The original study remains linked as the input source and the separate technical report as the calculation source.

## Four anonymous points: candidate papers exist

The labels **Cursor control A–D · source unconfirmed** mean the four blue cursor/grid-control dots with no study name attached in the original figure. The letters identify those dots, not extra studies or verified reports. The four assignments remain unconfirmed, but they are no longer presented as having no source leads. Their inspections and data rows provide named, linked candidates with the actual native result and mismatch:

- **2015 upper (~0.90 image bits/s):** possible [Gilja 2015](https://static-content.springer.com/esm/art%3A10.1038%2Fnm.3953/MediaObjects/41591_2015_BFnm3953_MOESM47_ESM.pdf), **0.93/0.92 Fitts bits/s**, excluding hold time. Equally plausible alternative: [Jarosiewicz 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4765319/), with T6 **0.93 bits/s** printed in [Pandarinath's later comparison](https://doi.org/10.7554/eLife.18554.021), not a newly recovered original-2015 numerical row.
- **2015 lower (~0.76):** possible [Bacher 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4426256/), **9.4 correct characters/min without prediction**, **10.4 with completion**. Exact plotted bps not recovered.
- **2016 (~0.16):** possible [Vansteensel 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5326682/), **52 seconds/letter**, **33 with prediction**, rounded headline two letters/min. Neural-click/scanning task, not literal 2D cursor control.
- **2018 (~0.53):** possible [Milekovic/Sarma 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6093965/), **6.88 correct characters/min with completion**. Numerical/year lead, but a scanning neural-switch task. [Nuyujukian 2018](https://doi.org/10.1371/journal.pone.0204566) is a cursor-task alternative, reporting **24.0/13.6/30.8 effective characters/min with completion**.

Year/rate resemblance is not an identity proof. Candidate bps calculations, where shown in source notes, are explicitly illustrative assumptions and **are not substituted for these five image coordinates**. The [candidate ledger](../src/data/bci-bitrate.candidates.json) retains confidence and limitations; a candidate never occupies the confirmed `sourceUrl` field.

## Fitted line and comparability

The olive line remains an equal-weight, unconstrained ordinary least-squares fit of log10(bits/s) against reference year, recomputed from the **actual 14 currently displayed values**, including repeated years. It is labeled **Log-linear fit · 14 mixed-evidence points**.

`log10(rate) = -0.929472 + 0.060277 × (year − 2000)`; `n = 14`; `R²(log10 rate) = 0.455330`. The on-chart and native-image line key shows **R²(log10) = 0.455**. This is goodness of fit in log space, not the fraction of raw-rate variance explained or evidence of a causal scaling law.

### Reproduce or question the fit

Download the [full-precision 14-point CSV](bci-study-data/chart-provenance.csv) and [standard-library Python reconstruction](bci-study-data/reproduce_fit.py), keep them in the same folder, and run:

```sh
python3 reproduce_fit.py
# Or try alternative point selections/assumptions in a copy of the CSV:
python3 reproduce_fit.py modified-provenance.csv
```

The script prints every fitted input, the CSV SHA-256, full-precision coefficients, log-space R², residual sum of squares (SSE), and total sum of squares (SST). No fitted coefficients are hardcoded. For each row set `x = reference_year − 2000`, `z = log10(plotted_bps)`, compute `b = Σ((x−mean(x))(z−mean(z))) / Σ((x−mean(x))²)` and `a = mean(z) − b·mean(x)`; then `R² = 1 − Σ((z−a−b·x)²) / Σ((z−mean(z))²)`. All 14 observations have equal weight; repeated years are retained. Fit endpoints are the minimum/maximum observed reference years, not extrapolations. The script centers at the input's minimum year (2000 for this CSV).

The CSV links each source, reports the original native input and the exact active conversion, flags candidate assignments, and keeps the original photo estimate separately. Native-source quotations and image calibration are preserved in [the archived ledger](../src/data/bci-bitrate.source.json); [the actual app fitting function](../src/lib/log-linear-fit.ts) is also public. Estimator choices and heterogeneous tasks remain open to challenge, not silently treated as equivalent measurements.

The fit is descriptive only. Cursor grid achieved bitrate, Fitts throughput, author-estimated switch ITR, language-model-assisted speech proxies and modeled handwriting output are not a common experimental benchmark. Conversion assumptions can change the fitted line. No causal scaling claim, forecast, confidence band or original-model recovery is made. The domain remains 2000–2025; no original speech/typing benchmark lines are added.

## Implementation and acceptance

The chart remains under **Human interfaces and recordings**, at `#bci-information-transfer-over-time`. Existing source-table, native point inspection, keyboard/history, copy and PNG controls are retained. Candidate links are labeled **assignment unconfirmed**, separate from verified calculation-method links. The standalone image retains a concise, numbered identity/value/unit/evidence-basis key, PL R&D brand and Atlas link; long source/method notes remain on site rather than being restored as image footnotes.

No access/launch configuration, historical acceptance inventory, recurring job, merge or production publication is changed. The current work remains an unmerged update to PR112.
