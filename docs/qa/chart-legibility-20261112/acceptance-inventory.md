# Field Velocity chart legibility — acceptance inventory

**24 current visible charts.** Derived from the actual route and reconciled with the parent’s native baseline at `05a314c`. Native before/after and PNG acceptance are pending parent QA; this worker used no browser, service, publish action, or messages.

## Common presentation contract

- Fixed-size observations: 5px preview / 6px expanded radii (curve/publication use actual SVG CTM). Draft/event viewBoxes reflow in measured content pixels. Overlap rings keep source centers; they do not encode magnitude.
- Dense weekly Trends samples retain 2.5px / 7px focus; waffle area and Sankey count scales are untouched.
- Annual guides: integer calendar years / UTC January 1 in the exact existing domain, 1px non-scaling stroke, no pointer interception. Percentage/error/energy/category axes never gain year guides.
- Broader desktop/medium columns: `(100% - 1rem) / 1.25` rather than `/ 1.65`; mobile retains the existing 24px next-card peek. Native horizontal scroll/order/focus remain.
- Shorter natural previews: draft plotting region 200px instead of 232px, event stage spacing 72px instead of 100px, Trends 238px instead of 270px. Rail curve previews reflow at measured content width rather than magnifying a fixed 360×220 frame. One maximum-content outer-card height remains.
- Font roles remain 16px preview titles, 18px modal titles, 12px labels/supporting text. No scientific values, source dates, scales, units, source tables, or original methodology are changed.

## Per-chart checklist

Checked boxes mean implementation/source regression coverage, **not** completed native visual acceptance. Every criterion is explicitly applicable or not applicable.

### 1. Neurotech search terms
Identity: `google-trends-neurotech` · renderer: trends

- [x] **Point size — Not applicable.** Dense weekly line samples deliberately retain 2.5 CSS-pixel radii and 7px inspection emphasis; no scatter-sized dilation.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Applies.** Preserve term-specific weekly paths and missing-value gaps; do not connect different terms.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 2. Citation latency
Identity: `idea_vintage` · renderer: curve

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Applies.** Connect successive reliable annual medians within idea_vintage only; hollow under-indexed points remain separate. No fitted trend is added.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 3. Latency compression
Identity: `latency_compression` · renderer: curve

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Not applicable.** Different preclinical/device pathways and clinical endpoints are not a repeated series.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 4. Implanted BCI participants over time
Identity: `revealed_commitments` · renderer: curve

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Applies.** Connect only the five explicitly cumulative Neuralink checkpoints, identical to the recipient chart. Other program/clinical/review cohorts remain separate; preserve mixed date bases and overlapping-cohort caveats.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 5. Neurotech papers per year
Identity: `publication-output` · renderer: publication

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Applies.** Preserve neurotech-count and science-index series paths separately; keep the four-domain range band.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 6. Publication growth by group
Identity: `publication-growth` · renderer: publication

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Not applicable.** Growth percentage is the x-axis, not calendar time.
- [x] **Series connections — Not applicable.** Existing lollipop stems encode growth from zero, not a time trajectory. Do not join category rows.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking. Preserve internal scrolling and the count/area geometry.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 7. Researchers by publication sector
Identity: `researcher-sectors` · renderer: publication

- [x] **Point size — Not applicable.** Preserve 100-square area/count encoding; squares are not fixed-size scatter dots.
- [x] **Annual guides — Not applicable.** A 100-square publication-sector composition, not a temporal axis.
- [x] **Series connections — Not applicable.** Each square remains one percent of the sector composition; there is no longitudinal line.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking. Preserve internal scrolling and the count/area geometry.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 8. Researchers’ first and latest affiliations
Identity: `researcher-sector-changes` · renderer: publication

- [x] **Point size — Not applicable.** Preserve count-proportional ribbon widths and node heights; not a fixed-size point chart.
- [x] **Annual guides — Not applicable.** Origin/destination people-count Sankey, not a temporal axis.
- [x] **Series connections — Not applicable.** Preserve the actual count-scaled Sankey ribbons, not arbitrary point-to-point lines.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking. Preserve internal scrolling and the count/area geometry.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 9. Neural recording hours — selected datasets
Identity: `metric-recording-hours` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Applies.** Add only the eight named TUSZ release checkpoints. Releases overlap; do not sum them or connect the other four datasets.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 10. Selected chronic intracortical recipients
Identity: `metric-panel-neuralink-cumulative` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Applies.** Add only five Neuralink cumulative-recipient checkpoints. BrainGate and Paradromics remain separate cohorts.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 11. Simultaneous neural recordings
Identity: `simultaneously-recorded-neurons` · renderer: curve

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied. Single-day recording views do not invent an annual span.
- [x] **Series connections — Not applicable.** Selected studies/session-quality definitions are independent, even within a measurement view.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 12. Selected public image/resource footprints
Identity: `metric-panel-public-data-size` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Not applicable.** Different projects/resources, storage definitions, and dates must not be pooled or connected.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 13. Selected tissue-volume checkpoints
Identity: `metric-panel-tissue-cm3` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Not applicable.** Species and preparation colors do not make different tissue projects a longitudinal series.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 14. Selected published connectomes — neuron counts
Identity: `metric-panel-largest-connectome-neurons` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Not applicable.** Different connectomes, preparations and scope; no line inferred from species.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 15. Selected published maps — synapse counts
Identity: `metric-panel-largest-connectome-synapses` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Not applicable.** Different maps, detection scopes and completeness criteria; no pooled trend.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 16. Selected EM acquisition rates
Identity: `metric-panel-acquisition-rates` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Not applicable.** FIB-SEM and autoTEM rates are different protocols/resolutions, not a longitudinal series.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 17. Selected structure–function matches
Identity: `metric-panel-paired-manual` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Not applicable.** Different projects and manual/EM-assisted matching scope; not a repeated dataset series.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 18. Estimated acquisition cost per 10M voxels — optical and EM
Identity: `metric-panel-acquisition-economics` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Not applicable.** Optical/EM are categories, not technique identities; all acquisition-technique points remain unconnected, including prospective PEEM.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 19. Human and mouse cortex: split–merge error trade-offs
Identity: `metric-panel-connectomics-roboem-human-split-merge` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Not applicable.** Split error versus merge error is a non-temporal scatterplot.
- [x] **Series connections — Not applicable.** Shared preparations do not make method/threshold scatter observations a chronology.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 20. Reported project proofreading effort
Identity: `metric-panel-proofreading-effort` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Not applicable.** Different project completeness targets and work-year conventions; no joined trend.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 21. PATHFINDER v1: axon tracing benchmark
Identity: `metric-panel-pathfinder-nerl` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Not applicable.** One axon-tracing benchmark checkpoint; no series to join.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 22. NeuroAI performance–cost frontier
Identity: `metric-panel-neuroai-imagenet` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Not applicable.** Performance versus energy is a non-temporal, piecewise linear scatterplot.
- [x] **Series connections — Not applicable.** Keep model variants and non-spiking baseline as scatter observations; no invented temporal frontier.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 23. FlyVis: correct contrast preference
Identity: `metric-panel-flyvis-contrast` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Not applicable.** Two model/ensemble observations at one publication year, not successive releases.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.

### 24. Selected application events
Identity: `metric-panel-application-events` · renderer: draft

- [x] **Point size — Applies.** Use shared 5 CSS-pixel preview / 6px expanded fixed-size marks. Overlap rings keep original centers and remain a visibility device, not a magnitude encoding.
- [x] **Annual guides — Applies.** Thin 1px non-scaling vertical January 1 / integer-year divisions use the exact existing date/year projection, behind data marks. No new date precision is implied.
- [x] **Series connections — Not applicable.** Events in categorical stages are not one continuous outcome series.
- [x] **Wider ratio — Applies.** Broader desktop/medium rail columns use (100% - 1rem) / 1.25; mobile keeps its 24px next-card peek. Natural plot reflow and one measured outer-height contract remain; no label shrinking.
- [ ] Parent native QA: settled desktop/narrow geometry, no clipping, source interaction, actual image readability.
