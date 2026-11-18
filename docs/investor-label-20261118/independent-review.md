*PASS — bounded review of `7df838c` against `cd6c3da`. No material corrections.*

- *Exact display label:* `Protocol Labs (incl. PLC Neuro)` in `data/funding-index/investor-groups.json:3`. Source members remain `Protocol Labs`, `PLC Neurotech`, `PL Capital` (`:4`).
- *Label-only parity:* recursive comparison found exactly one generated-data change: `/investors/1/name`. Actual generator replay, with filesystem writes intercepted in memory, reproduced the complete committed funding JSON byte-for-byte. Rounds, evidence, portfolio disclosures, builder, and UI component are unchanged.
- *No special showcase:* unchanged `src/components/funding-index-dashboard.tsx:380–415` renders the shared top-24 leaderboard with uniform rows. UI tests exercise a genuinely mounted component and check exact label, unchanged counts, uniform styling, and no portfolio showcase (`tests/funding-feedback-ui.test.mjs:155–203`); assertions were strengthened, not weakened.
- *Tests:* both data/grouping files executed: *14 passed, 0 failed*. Mounted UI execution was blocked by missing `tsx` in this isolated checkout; full suite/build/native verification remains the parent’s gate.

*Explanation is supported:*
- `portfolio-disclosures.json:7,15–37` records ten selected companies across BCIs, NeuroAI, and connectomics; six map into the existing roster.
- Three listed companies have attributed rounds: Synchron, Science, Merge. The fourth is *Neurosoft*, absent from that selected list (`rounds.csv:6,19,28,43`; private report `:50–84`).
- Echo, Paradromics, and Precision are already indexed, but sufficiently verified exact family-round attribution remains unresolved—not disproven (private report `:88–110`).
- EON, Hemispheric, Integral Neuro, and Netholabs are absent from the *current selected roster*. That is not a scientific judgment that they are non-BCI.

Safe central explanation: *“Four counts source-supported financing participations in Neuro Atlas’s selected BCI index, not total portfolio investments. It is three companies on the PLC page plus Neurosoft—not four of the page’s ten. Portfolio membership alone cannot establish participation in a particular financing, and incomplete disclosure does not establish nonparticipation.”*

No files modified or created; final worktree status clean.