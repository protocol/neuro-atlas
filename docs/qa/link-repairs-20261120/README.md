# Link-repair QA — November 20, 2026

## Revision and scope

Repair implementation rebased onto `f5102f1af60fc86f39050e89b015d90d67f024fb` (the same-day source-context, pop-out layout and chart-toggle PRs). Runtime/data revision tested: `8aa2d889b8e2d2079606823ae29bf50fc3d24bb3`. This final evidence update changes only this README and actual screenshots, not application code or data.

- **204 affected/integration tests passed, zero failed**, on the rebased branch. Includes Funding data/UI, institutional labels, financial source-audit scope, historical issue baselines, methodology exact inventory, source-context behavior, historical recording, and the new active-citation negative regression.
- `NEXT_PUBLIC_BASE_PATH=/neuro-atlas npm run build` passed on the rebased branch, including its TypeScript check.
- Changed-file ESLint and `git diff --check` passed. The earlier standalone `npm run typecheck` also passed; the rebased build is the later type-check evidence.
- A full-repository concurrency-2 test run **did not complete** within its explicit 600-second limit (exit 124); it is not a green full suite. An earlier exploratory run was manually stopped while work was still changing. Neither is represented as successful.
- Independent review reproduced and closed both initial findings: stale singleton participant-evidence expectations, and an overly broad alias exception. Final independent focused replay: **22/22 passed**. Those repaired files are byte-identical after rebase; new upstream source-context integration was checked separately within the 204 tests. This is a scoped code review, not universal source-access certification.

## Actual browser replay

The screenshots are from the **local production build**, served with the real `/neuro-atlas` base path. They are not a hosted preview or production deployment.

- The rebased methodology page rendered **575 external directory entries**, matching the exact current catalog URL set. The prior 587-entry audit is historical: 23 old entries were removed and 11 new ones added, including 13 non-citation fixture identifiers removed and the additional SEC primary document added.
- Science's April 2025 financing visibly uses the SEC index plus a distinct Khosla participation source. The card says “Reported Apr 14, 2025” and identifies a filing date, **not an established closing date**.
- NeuCyber's working institutional destination visibly says **“Institutional profile (CIBR)”**, not “Visit company website.”
- The updated source directory retains upstream “See in context” links and the non-exhaustive logo-wall treatment.
- Task-owned tabs were closed and other browser tabs were verified preserved. Local QA server stopped after inspection.

## Limitations

The prior audit's 90 unverified/access-limited source URLs have not been certified working or arbitrarily rewritten. Correct abstracts/landing pages do not prove unrestricted full text. SEC clients may still encounter access controls; the funding snapshot includes paywalled material. No large dataset was downloaded. No route/fragment/redirect, public visibility, account access, merge, production deployment or scheduled process was changed.
