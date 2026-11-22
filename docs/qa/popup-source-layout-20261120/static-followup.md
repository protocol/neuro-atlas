# Static definition sections — follow-up Nov. 20

Lukas asked what the floating “14 displayed marks: 9 PL R&D…” paragraph represented and whether Definition and comparability should be non-collapsible to match the right-hand side.

## Outcome

- Chart pop-outs use a named static **Definition and comparability** section and a matching heading, not an expanded disclosure. Source notes remain static. The long **Data and sources** table remains expandable.
- The BCI paragraph was chart-coverage metadata: nine PL R&D text-equivalent estimates included in the fitted line, with five excluded context observations. The same facts, more precisely qualified, remain in the existing Source notes scope (two paper-reported native-task rates, one company rate, two approximate source-unverified rates). The redundant floating paragraph is removed, not the qualifications or data.
- Other curated charts/timelines retain their unique summary inside the definition section. Inline historical/gallery definitions retain their previous closed disclosures.

## Verification

Runtime source `1d208452b680f3ebdc3d359da56d5b8889547a15`. `fe4381759aa2401d19d2be3e36af1f54249a2976` adds only a scoped test assertion and evidence; no runtime delta.

- Two new static-section regressions failed against the old disclosure and passed after the change.
- Complete updated focused suite: **82 passed, zero failed**, in `static-focused-tests.log`. It includes existing scientific-data/export/provenance and modal/history contracts.
- Clean production build, typecheck and edited-TSX lint passed.
- Updated native replay: **30 cases** across five chart families and six widths, `static-browser-report.json`. Checks static definition sections, absence of a summary/collapse affordance, no orphan BCI summary, preserved source coverage and data rows; retains prior layout, table, Escape and URL/reload checks.
- Parent inspected desktop/mobile pixels. Independent bounded review passed `231bea9...1d20845`: accessible section/heading, no unique BCI qualifier lost, non-modal disclosures preserved. One old test selected the first shared heading class; its selector is now scoped to the right-hand Source notes heading, then the full focused suite passed.

The `static-*.png` files are actual localhost production-build browser captures. Prior screenshots/reports in this folder remain historical evidence from the earlier expanded-but-collapsible version; the PR body points to the latest static captures.

No scientific data, export implementation, chart URL or auth/deployment configuration changed. PR #137 remains a review/preview handoff, not production authorization. Physical-phone touch is not claimed; the table still intentionally scrolls horizontally on narrow screens.
