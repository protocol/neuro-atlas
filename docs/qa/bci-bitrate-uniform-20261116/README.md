# Uniform BCI text-equivalent conversion — native acceptance

## Requested artifact

A working **BCI communication rates over time** chart, using selected Bacher, Vansteensel, and Milekovic/Sarma study results and a single disclosed text conversion. The chart may differ from the reference image. The existing canonical fragment remains `#bci-information-transfer-over-time`.

## Actual result

Runtime **245c254574fb7def0513810086adae8013c588d1**. Subsequent evidence-only commits preserve that runtime and its tests.

- All **14** reference IDs/year placements remain visible. **9** text observations use `log2(28) ≈4.8` assumed bits/character; speech additionally assumes five characters/word, including spaces. These are **PL R&D estimates** of text-output equivalents.
- Three selected inputs: Bacher **9.4 correct CPM**; Vansteensel **33 seconds/letter with prediction**; Milekovic/Sarma T6 **6.88 correct CPM with completion**. Their rates are approximately **0.753 /0.146 /0.551 bits/s equivalent**. Original-author anonymous-dot assignments remain separate historical uncertainty.
- **5 context observations are excluded from fitting:** two unresolved image estimates, two paper task-specific rates and one company task-specific rate. Each exclusion is visible in the native image key.
- Equal-weight OLS over the **9 converted text points**, observed years **2015–2025**, gives **R²(log10) =0.847** (full value approximately0.8469690315566176). Full-precision inputs, native-rate conversion and fit replay are linked from the chart at the matching immutable method/data/source commit `e1182fc9e3efa6aadbd9e924818f50c8b64cd620`.
- Underlying tasks, error measures, gross/correct output and predictive assistance remain explicitly qualified. This is a descriptive selected-result fit.

## Executed verification

- Exact pre-method integration baseline: **1,294/1,294** full tests passed. Method implementation at `8d64fdfca3c9cb2947996fe73cf7e4eeb89269df`: **1,304/1,304** full tests passed, concurrency4, exit0.
- Independent review **PASS**, no P0/P1 or security/logic findings. Four located P2 copy issues were closed with focused checks: reader error labels, reported timing precision, private comparison control-task wording and private comparison subtitle scope. Code-review portability/tolerance suggestions were also implemented.
- Final copy-closure pass: **34/34** focused BCI/fitter/replay tests, typecheck, scoped ESLint and two production builds passed. All14 numeric/source/fit-selection fields, nine-point fit, conversion parameters and image annotations are exactly reconciled to the full-suite method revision. Final native PNG pixels are identical to the independently reviewed original candidate.
- Actual headed Chrome at **1440/390/320px**: exact new title,14 plotted marks/rows/keys, six five-year labels, nine-point fit/R²/current method link, native inspection of all three newly selected papers, remaining unconfirmed-candidate links, empty resting tooltip, Copy link readback, Copy chart, real Download PNG, Escape/focus and Back/Forward passed.
- Additional320px native click opened **Data and sources** and verified the actual displayed4.8-bits/character and five-characters/word explanation. The final Moses popup visibly reads **25.6% word error rate** with no internal field suffix.
- Real Download PNG and clipboard PNG **2400×2974**; actual pixels inspected. **14 served JS/CSS/font assets** byte-match the pinned fixture build. Runtime header/build identity and source/fit invariants recorded.
- Task-owned browser tabs closed, preexisting tabs preserved, task server stopped and port verified closed.

## Evidence and boundary

`bci-bitrate-native-export.png` is the actual native app download, not a replot or screenshot substitute. `chart-desktop.png`, `chart-390.png`, `chart-320.png`, the source/estimate images and `uniform-method-320.png` show the real local surface. JSON files record the exact displayed model, independent replay, served assets, clipboard/native receipts and copy-only closure. `artifacts.json` binds hashes.

Captures are **local loopback-fixture verification**. The local-origin footer is intentional. The disposable proxy is opt-in, raw-Host-restricted, noindex, uncommitted and outside this branch. Hosted authenticated interaction is a separate boundary; the existing access/launch gate remains intact. Historical source/candidate/photo ledgers, the frozen Nov.12 acceptance inventory, packages and actual authentication are unchanged. No merge or production publication is part of this update.
