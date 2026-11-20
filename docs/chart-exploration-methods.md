# Chart exploration models

Each standalone chart page uses the existing chart renderer and underlying source table. Visibility affects plotted marks and interactive trend inputs; source downloads remain evidence for the complete original chart. The fixed descriptive fits previously shown on the standalone charts remain in their default views. After a legend change they are suppressed; the opt-in extrapolation uses the visible eligible observations.

## Conditional extrapolation

For BCI, the eligible selection is the existing nine mixed-convention text-equivalent inputs. Paper-/company-reported native task bitrates, image-derived context and sensory scenarios never enter this model. See [BCI provenance and conversions](bci-bitrate.md). Acquisition efficiency uses the two existing Table A1 input sets independently; PEEM is prospective, mesoSPIM is distinct from expansion microscopy, and the citation mismatch on the ExA-SPIM author estimate remains visible. There is no pooled optical/EM frontier.

Each displayed conditional model uses equal-weight OLS of log₁₀(y) against year, the visible eligible input count and date window, and a ten-year dashed continuation of that fit. At least three eligible finite positive observations, nonzero year span, and a positive nonflat slope are required. Log-space R² describes the historical fit, not confidence in the continuation. No target crossings or completion dates are produced.

## Sensory context

The standalone BCI chart’s sensory switch is off by default. Enabling it adds a dotted horizontal reference at exactly 8,750,000 bits/s on the same logarithmic y-axis, with a wrapped “Eye → brain ≈9 Mb/s · animal-scaled human retinal scenario” label. Only this view expands the display domain and plot height to keep the reference and original BCI marks readable; the reference label reserves space clear of numbered study badges. Turning the switch off restores the original plot geometry. Filtering, conditional refits and all-hidden/reset states retain the reference independently of observation visibility; source rows, downloads and model inputs remain unchanged. The unfiltered sensory-only view retains the merged native image export with its plotted reference and source assumptions. Filtered/refit/model combinations that are not supported remain link-only with explicit guidance.

[Koch et al. (2006), Results, “How Much the Eye Tells the Brain”](https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/) estimates approximately 875,000 bits/s for guinea-pig optic-nerve output, summing individual channel information under independence. Its methods use ex vivo retinal recordings with naturalistic movies. The human scenario scales by approximately 1,000,000 human retinal ganglion cells / 100,000 guinea-pig axons (also described in the [Penn release](https://www.eurekalert.org/news-releases/468943)), yielding 8,750,000 bits/s, displayed as ≈9 Mb/s. This assumes cross-species transfer of the per-cell information rate and omits correlations. It is not a direct human measurement, a capacity limit, or a BCI fit input or target. No auditory number or separate eye/ear comparison panel is added.

See [connectomics brain-scale models](connectomics-brain-scale.md) for the separate tissue, image capacity and acquisition-budget scenarios.

## URL continuity and legacy hours

Typed, chart-scoped `chartHidden`, `chartModel` and `chartBaseline` selections restore the rendered view; recording measurements retain `recordingView`. Old fragment aliases and merged `brainScale`/`extrapolation` tokens are translated to the same chart and validated state, preserving repeated unrelated navigation queries. Copy link and image footers sanitize unrelated queries. Defaults are never rewritten on mount.

The merged recording-hours coverage chart remains the default, including bars, participant counts and averages. The older component-only `extrapolation=neural-recording-hours` link restores the existing historical TUSZ scenario as an explicit compatibility view (one chart, unchanged source and fit method). Its switch returns to the current coverage chart. This compatibility view does not introduce a new default scenario control or unpersisted alternative-model/track controls.
