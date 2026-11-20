# Implant data link — discussion proposal

A source-backed proposal for one Field velocity metric. **Docs and data only. Not a production metric and not for merge as-is.** No app route, navigation, canonical `data/` file, generated `src/data/` file, package file or setting is changed.

## The question

Atlas tracks channel counts, recording hours and communication rates. It does not yet track what limits a wireless implant as channel count grows: the data the electrodes generate against the data the link through the skin can carry, and the power that link costs.

The sources themselves name this as a limit:

- WIMAGINE (2015): "The bottleneck of the WIMAGINE acquisition system is the wireless data rate."
- Neuralink's compression challenge page (archived 2024): the implant "generates ~200Mbps of eletrode data ... and can transmit ~1Mbps wirelessly."
- Even-Chen et al. (2020): channel count "is constrained by the power budget of the implantable system."

## Proposed chart

Log-log scatter. X: recording channels. Y: bit/s. Two marker types per device: the generated rate (derived, hollow) and the stated link rate (reported, filled), joined by a vertical line. Wired systems show the generated rate only. Power is in the evidence panel, not on an axis, because the published numbers cover different scopes.

No line is fitted and no improvement factor is claimed.

## Evidence contract

- `implant-data-link.data.json` holds nine records from a fixed 2026-11-20 snapshot. Every record carries its source URLs, an access date and quoted excerpts. Table rows are marked as table rows. A value without an excerpt has a `*_basis` or qualifier field that says so.
- **Reported and derived values are separate fields.** `raw_rate_bit_s_derived` is channels × sample rate × bits, computed here, payload only. Where a source states its own generated rate, the wording is kept in `raw_rate_reported` and the number in `raw_rate_bit_s_reported`.
- **Unknown stays unknown.** Five records lack a confirmed bit depth or channel count, so their derived rate is `null`. Nothing is filled in.
- Qualifiers stay attached: approximate values ("~1Mbps"), upper bounds ("up to 100 Mbps"), and secondary sources. A stated requirement ("< 10mW") sits in its own `requirement` field and is not a power observation.
- Of 9 records, 4 have a derived generated rate, 5 have a generated rate (derived or reported), 5 have a stated link rate, and only 3 have both. The gaps are part of the finding.

Check: `python3 docs/implant-data-link-proposal/check.py` (standard library; recomputes each derived value and fails on a missing source, scope or qualifier).

## Known gaps, for maintainers to judge

1. **Borton 2013**: bit depth is left unknown because Table 1 was not read with its headers. The sample rate comes from a later review table (Schwarz et al. 2014). The generated rate is the paper's own "neural data (24 Mbps)".
2. **Simeral 2021**: link rate is left unknown. The main text does not state it and Supplemental Table SI was not read. A university news release gives 48 Mbps "from 200 electrodes", which does not match the 192 channels of the paper, so it is context only.
3. **Neuralink N1** values are a company statement on a web page that now returns 404; an archived copy is cited. The power figure is a stated requirement and is not stored as a measurement.
4. **Summit RC+S**: the table and the body text give different streaming configurations. The table value is used.
5. **Synchron**: channel count is not in the main text read here.
6. Devices in different classes (intracortical spikes, ECoG, LFP) sit on one plot. A class filter may be better than one view.

## Discussion decisions

1. Is a derived payload rate acceptable beside reported rates if the formula and factors are shown?
2. Should company web statements appear, or only papers and regulator records?
3. Should power be plotted once scopes can be matched (implant total, radio only, per channel)?

## Licensing

Excerpts are short quotations for attribution. Each source keeps its own terms. No source data set is copied.
