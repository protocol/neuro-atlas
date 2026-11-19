# Chart exploration models

The dashboard uses the existing chart renderers and underlying source tables. Visibility affects plotted marks and interactive trend inputs; source downloads remain evidence for the complete original chart. The fixed descriptive fits previously shown on the standalone charts remain in their default views. After a legend change they are suppressed; the opt-in extrapolation uses the visible eligible observations.

## Conditional extrapolation

For BCI, the eligible selection is the existing nine mixed-convention text-equivalent inputs. Paper-/company-reported native task bitrates, image-derived context and sensory scenarios never enter this model. See [BCI provenance and conversions](bci-bitrate.md). Acquisition efficiency uses the two existing Table A1 input sets independently; PEEM is prospective, mesoSPIM is distinct from expansion microscopy, and the citation mismatch on the ExA-SPIM author estimate remains visible. There is no pooled optical/EM frontier.

Each displayed conditional model uses equal-weight OLS of log₁₀(y) against year, the visible eligible input count and date window, and a ten-year dashed continuation of that fit. At least three eligible finite positive observations, nonzero year span, and a positive nonflat slope are required. Log-space R² describes the historical fit, not confidence in the continuation. No target crossings or completion dates are produced.

## Sensory context

[Koch et al. (2006), Results, “How Much Information Does the Eye Send the Brain?”](https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/) estimates approximately 875,000 bits/s for guinea-pig optic-nerve output, summing individual channel information under independence. Its methods use ex vivo retinal recordings with naturalistic movies. The human scenario scales by approximately 1,000,000 human retinal ganglion cells / 100,000 guinea-pig axons (also described in the [Penn release](https://www.eurekalert.org/news-releases/468943)), yielding 8,750,000 bits/s, displayed as ≈9 Mb/s. This assumes cross-species transfer of the per-cell information rate and omits correlations. It is not a direct human measurement, a capacity limit, or a BCI fit input or target. The auditory entry carries no number: no verified direct measurement of whole human auditory-nerve information rate was identified for this comparison.

See [connectomics brain-scale models](connectomics-brain-scale.md) for the separate tissue, image capacity and acquisition-budget scenarios.
