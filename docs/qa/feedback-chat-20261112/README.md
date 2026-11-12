# Feedback chat and Milestones — verified local UI

Runtime revision: `b386df48b84bf3571bb91938cbca9a3eeaf71246`.
Base: `05a314c3889836230d179d7bb5b1f626b6804193`.

## Requested user-facing result

- Feedback is grouped with Contribute via PR, using the same styles in each responsive placement. The fixed corner launcher is removed.
- Launch enters hover/click element selection, without the old floating instruction/General page/Back card. A picked element opens one compact, growing chat field.
- Enter sends; Shift+Enter adds a newline and IME composition does not submit. A confirmed save replaces the field with **Thanks for your feedback. It’s under review. Check back soon.** It stays until dismissed or New feedback is chosen.
- Close, Escape and Done clear the selected element. Retained unsent text requires a new explicit selection on reopening.
- Milestones’ collapsed stage controls no longer leave tall invisible stacks in layout. The intro is the supplied shorter paragraph; the entire Memo cut comparison, including its numbers, is removed. Scientific records and the remaining sourced capital panel are unchanged.

## Evidence and limits

`verification.json` records 1,162 passing standard tests, typecheck, mounted production build, zero new changed-source ESLint errors, and zero production dependency vulnerabilities. Two existing MilestoneTimeline ESLint findings were reproduced on the base and retained: synchronous time initialization and the lane-layout accumulator. This is not an all-repository lint-clean claim.

The independent original review found two retry/focus defects; native testing found a disabled-field focus loss. All three were reproduced before fixing. A bounded independent closure ran 78 test executions, including the original adversarial probes and new-target/route/note protections. `review-ledger.md` disposes of each original ID exactly once; exact-final native evidence closes the source review’s remaining conditional runtime gate.

`native-results.json` comes from **actual headed Chrome + the actual Next app and public HTTP route**, at 1440, 390 and 320px, with **only Linear and the loopback proxy gate synthetic**. It verifies failed-save retention and Enter-only identical-key/body retry, persistent confirmation, exit deselection, native chart activation suppression and layered Escape, and same-mounted 390×400 available-height clamping. The last simulates software-keyboard space; it is not physical-phone touch certification.

Additional final-revision native probes cover same-node retry after sibling/class changes and a real successful local HTTP response deliberately held at the client-delivery boundary until after Close. That hidden completion preserves focus on unrelated page work. `actions-native-results.json` checks matching computed styles for the landing actions at all three widths; sidebar/header pairs are in the main native report. `dark-native-results.json` records actual dark text contrast and light-theme restoration.

All screenshots are **local Next development renders**, not hosted captures. Synthetic notes are labeled as such. No live Linear issue, account grant, paid model, background worker, publisher, scheduler, hosting setting, merge or production release was created by these replays. Existing no-login Linear logging and site auth/noindex remain separate and unchanged. A code-only hosted Preview without the Production-only backend connection is not a new live intake acceptance.

## Captures

- `before-milestones-1440.png`, `before-milestones-390.png`: unchanged base, showing oversized collapsed filter layout.
- `milestones-1440.png`, `milestones-390.png`, `milestones-320.png`: final intro/filter/timeline layout; no Memo cut.
- `composer-1440.png`, `composer-320.png`: one-field anchored chat, no helper paragraph.
- `success-1440.png`, `success-320.png`: persistent in-place confirmed acknowledgment.
- `chart-success-1440.png`: confirmation above an unchanged underlying native chart.
- `actions-home-1440.png`, `actions-home-320.png`: relocated matching action cluster.
- `composer-dark-1440.png`: actual dark styling.
- `composer-keyboard-390.png`: same mounted composer after 390×400 resize.

## Recorded replay

`run-fixture.mjs` creates a disposable exact-Git snapshot, copies private physical dependencies, applies a loopback Host/runtime guard and injects only the synthetic Linear boundary. It does not change repository auth or use a real credential. The fixed ports are task-owned loopback 35641/35642. Its output/fixture root is `/opt/data/tmp/atlas-feedback-chat-20261112`; move aside a prior task fixture only after stopping its exact process and proving its port closed.

```sh
node docs/qa/feedback-chat-20261112/run-fixture.mjs "$PWD" b386df48b84bf3571bb91938cbca9a3eeaf71246 candidate 35641
# In the owned browser-harness window, after exact-source HTTP readiness:
ATLAS_QA_RUN=unique-synthetic-run browser-harness < docs/qa/feedback-chat-20261112/native-qa.py
browser-harness < docs/qa/feedback-chat-20261112/actions-qa.py
```

The replay uses an explicitly unique synthetic note suffix when rerun so it does not mistake prior fixture records for a new execution. It asserts same-operation retry identity separately. Stop only the task’s fixture processes and close only its recorded browser targets afterward. `sha256.json` binds the initial copied evidence bytes; the evidence commit must have no runtime/test/config/dependency delta from the runtime pin above.
