# Field Velocity: clarity review and implementation

## Design bar

Use editorial-chart discipline: a shared left edge, explicit type roles, quiet gridlines, real legend symbols, and a clear separation between measurements and supporting notes. Keep the existing white / PL R&D blue identity, equal-height preview cards, chart order, scientific qualifiers, stable links, and the three grouped sharing actions. The preview may change aspect ratio; the enlarged chart and its export stay separate.

## Critique → changes

1. **Too much unused space inside otherwise consistent cards.** Each card previously inherited the tallest natural body on the page, but smaller previews did not use the resulting space. Keep that equal-height shell, allocate its spare height to the preview, and recompute vertical plot coordinates. Labels and marker radii keep their screen-space sizes. Growth shows more rows in its existing scroll viewport. Waffle cells and Sankey layouts reflow within the allotted preview area.
2. **Unexplained index badges in compact plots.** Numbered callouts have a key only in enlarged charts. Remove those badges and leaders from previews; retain every observation, overlap rings, legends, and visible qualifiers. Enlarged annotations and exports remain unchanged.
3. **Machine-like axis precision.** Compact split–merge and other linear axes used fractional subdivisions such as 7.8311. Place round tick landmarks inside the unchanged measurement domain instead of rounding a label at an incorrect position. Use compact scientific notation for very small preview ticks. Exact source values remain in inspection and tables.
4. **Several types of small gray information compete.** Keep the reading sequence legend → qualified values → supporting mechanics/scope, and separate supporting scope with a quiet rule. Keep supporting type at 12px. No qualification or dataset string is truncated or removed.
5. **The catalog feels too much like a control panel.** Group the global utilities, quiet their styling, disable an empty Clear search, and distinguish 18px section headings from 16px chart titles. Search remains the primary control. Chart actions use the site's pill language: one uniform footer Copy link on previews; one predictable Copy link / Copy chart / Download PNG row immediately below enlarged-chart headings, with Copy chart receiving the subtle blue emphasis.
7. **An inherited annual-image export collision.** Native Download PNG exposed both dual-axis titles being flattened to the same left anchor by export normalization. Group the two semantic axis headings so their original left/right positions survive sanitization; preserve all scientific marks and other export styling.

6. **Inflection evidence roles are too subordinate.** Move the existing Adoption proxy / Data supply / other role labels immediately above their measurement links at readable 12px. Keep signal, evidence scope, and external forecast disclosures distinct; give disclosure summaries a larger hit area without new button chrome. Preserve all content and ordering.

## Implementation boundaries

- No source-data, methodology, chart inventory, visibility, authentication, deployment configuration, or automatic-refresh changes.
- Spare height is subtracted from observed content before recomputing the common natural maximum, avoiding an equalizer/expansion feedback loop.
- Preview fill is restricted to the Metrics catalog; isolated and enlarged renderers retain their existing geometry.
- Hidden peers remain measurable, inert, and outside the visible rail flow, so search and collapse do not change unrelated chart sizes.
- Native replay and hosted preview status are recorded separately. A local loopback-only QA fixture is not a hosted authentication test and is never committed.
