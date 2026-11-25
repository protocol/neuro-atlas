# Neuron reference-line visual evidence

These are actual browser screenshots of the local production build at runtime
`634296415d74d33172ca90e2398bbe0a5663988e`, not design mocks or production captures.
The source revision `bf0352fc774228df14cee47ba6af67383a0e6cdc` has an empty
runtime/assets/package/config delta from that verified runtime; later changes are
test compatibility only. The local loopback-only auth fixture is confined to the
disposable QA checkout and is not present in this branch.

- `desktop.png`: 1440px full modal and source disclosure.
- `mobile.png`: 390px full modal.
- `compact-320.png`: 320px compact card, at initial card scroll position.
- `native-export.png`: actual existing Download PNG callback, not a screenshot.

Native checks covered 1440/390/320px, the three approximate anatomical labels,
all ten observation IDs, common log-axis mapping, no new compact ancestor clipping,
source links and selected-data JSON, tooltip Escape before modal Escape, canonical
and retained legacy links, Copy link, repeated unrelated query values, native
trigger focus restoration and Back/Forward. Responsive-pointer emulation is not
a physical-phone touch test.

All ten scientific observations and the raw archive are unchanged; all 14 other
numeric chart definitions, card/modal renderings and registered exports match the
independently captured main-branch baseline.

The existing 320px full-modal header crops the rightmost export action; that
unchanged baseline limitation is outside this neuron-reference-line change.
No merge or production deployment is included.

## Automated results

At source revision `bf0352fc774228df14cee47ba6af67383a0e6cdc`:

- Standard test glob: 1,669 tests, 1,633 pass, 36 fail (exit 1).
- Independently executed main baseline: 1,659 tests, 1,623 pass, 36 fail.
- Exact failure-name and assertion-diagnostic comparison: zero introduced failures,
  zero changed diagnostics; all 36 failures are byte-identical to baseline.
- New neuron-reference tests: 10/10 pass. Parent replay of the affected test group:
  54 tests, 51 pass, three identical inherited baseline failures.
- Typecheck, changed-source ESLint and normal production build pass.
- Original historical scientific goldens were not refreshed.

The full suite is **not green**; the existing failures are reported rather than
hidden or repaired by an unrelated change.
