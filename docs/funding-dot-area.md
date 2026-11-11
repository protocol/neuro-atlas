# Financing dot area

The BCI Funding Index company timeline displays each indexed financing as a circle, replacing the previous width-scaled capsule. The company, stage, and investor navigation and company-detail source links remain available.

## Size calculation

Let `a` be an event's indexed `amountUsdM`, and `M` the largest positive, finite `amountUsdM` in the complete source index:

```text
diameter(a) = 40 × sqrt(a / M) pixels
area(a)     = π × 20² × a / M square pixels
```

Area is directly proportional to the indexed USD amount. Four times the financing produces twice the diameter and four times the area. The largest indexed round has a 40px diameter. All positive amounts use the same formula, with no additive offset, minimum visible diameter, rounding, or per-event cap. Filtering companies retains the complete-index scale.

The size key appears above the company list, outside the horizontal year scroller. It uses the same calculation for $10M, $100M, and the largest indexed round; examples above the source maximum are omitted and duplicates removed. A constant 65% blue fill reveals overlaps. Quantitative circles have no stroke or shadow that could add a fixed amount to their encoded area.

The transparent interaction target is at least 24px wide and tall, independently of the visible circle. Hover and keyboard focus reveal the source amount, date, stage, and existing financing note. Escape dismisses the tooltip. Activating a company or financing opens the existing company detail, including direct source links.

## Source scope

Sizing uses the existing indexed USD amounts, including their documented historical FX estimates. Original native-currency labels, approximate-value qualifiers, notes, event dates, founding provenance, regulatory markers, and selective-review coverage remain intact. No data acquisition, FX conversion, company-roster change, or source refresh accompanies this presentation change.

The canonical ingestion screen continues to exclude undisclosed amounts and retains its $2M threshold. If a renderer input is missing a usable positive amount, it receives an unscaled hollow diamond and a matching conditional key entry. That defensive state does not add undisclosed rounds to the canonical index or assign a monetary area to them.

## Regression checks

```sh
node --import tsx --test tests/funding-dot-area.test.mjs tests/funding-legibility.test.mjs
```

The tests cover area ratios, fractional values, the shared size key, filter invariance, original source readouts, defensive unknown-amount symbols, independent hit targets, hover/focus/Escape, and company-detail source access. Existing founding, provenance, index-generation, regulatory-marker, and tooltip tests cover adjacent behavior.
