# Remove Neuralink brand context from field engagement

Owner request: remove the “Neuralink · brand context” chart from Neuro Atlas’s field-engagement section.

## Scope

- Remove that card from the actual `/field-velocity#metrics` page composition.
- Remove its Google Trends metadata from engagement search so the removed chart does not leave an empty search match.
- Preserve the field-wide Google Trends chart, citation/translation latency, implanted-participant chart, other Neuralink evidence, and all source datasets/refresh logic.
- An old `#google-trends-neuralink` page hash no longer opens that chart.

## Evidence

The baseline is production source `f8c94214e392a121f1dbb80e0c6bf9776fc2bdc3`.

Screenshots are native headed-Chrome captures of loopback-served Next production HTML and built assets. They are not authenticated production screenshots. Production authentication was not modified. Mobile captures use viewport emulation, not a physical phone. The ordinary hosted route returned HTTP 401 with Basic authentication and noindex; successful hosted content access is not claimed.

- `before-1440.png`: original start of the engagement rail.
- `after-1440.png`, `after-390.png`, `after-320.png`: retained charts and layout after removal.
- `after-end-1440.png`: right end of the engagement rail; the participant chart follows translation latency with no Neuralink brand-context card or empty tile.
- `native-results.json`: exact remaining rail inventory, collapse/reopen, retained Google Trends modal and obsolete-hash checks.

The removal regression was observed failing because the original rail included `neuralink`, then passing after the scoped removal. Existing full-page inventory/deep-link tests were reconciled; reusable Google Trends component, data, and export tests still retain their original Neuralink coverage.
