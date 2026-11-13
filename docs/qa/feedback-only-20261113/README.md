# Feedback-only actions and folded Milestones panel

Runtime revision: `358d6811ec421c0d245893bf7000041aa56da5c4`.
Base: `5015d2cc27a2c63babbdc0ad93d975724a25b84b`.

## Requested result

- No top-right Contribute via PR or Feedback actions, and no contribution CTA in the desktop sidebar or landing hero.
- One visible Feedback action: bottom-left desktop sidebar; left-aligned mobile footer, not a duplicate mobile header action.
- Milestones opens with its summary side panel folded. The existing Panel opener and Fold control still work.
- Feedback intake/controller/selection, scientific data, site launch/password gate and hosting settings are unchanged. The ordinary GitHub link in the footer and methodology's explanatory PR link remain; they are not the removed CTA buttons.

## Verification

The complete standard suite exercised 1,237 cases: 1,233 passed and four tests failed because they still assumed an initially open summary rail or a footer with no buttons. Those test expectations were updated to exercise the real Panel opener and explicitly allow only the functional mobile Feedback trigger, without removing the original capital/grant, date/layout or exact disclaimer assertions. A final exact-test-revision rerun of all affected/adjacent modules passed **65/65**, including all four prior failures. This is complete-suite coverage plus an affected-module rerun, not a claim that the first full-suite invocation was green. The initial slower resource-limited run was interrupted and is not acceptance evidence.

Typecheck, the mounted Next16.4.6 Turbopack production build and production dependency audit passed (zero production vulnerabilities). Changed-source lint has no new findings; the same two timeline errors at lines148/186 were independently reproduced on base and candidate. Independent review and native acceptance are documented alongside this file.

Final test revision: `a5da575e524d3506d789601c6e715bd149714b1b`; its entire delta from the captured runtime is test-only. Final evidence packaging adds no runtime/config/dependency changes. `verification.json` retains the exact first-run outcomes and final closure rather than hiding them.

## Native evidence

`results.json` records actual Next development app + headed Chrome checks across Milestones, Field Velocity, BCI Funding Index and landing at 1440, 390 and 320px (12 route/width cases). Each has one responsive visible Feedback trigger, zero contribution CTAs, no header/hero Feedback duplicate and no horizontal overflow. Actual clicks additionally exercise Milestones open/fold and Feedback → picker → selected element → compact composer → Escape at all three widths. No feedback was submitted.

The fixture is an isolated exact-Git snapshot, with a loopback-only synthetic gate and Linear peer. No source/hosted auth was changed and no live provider record was written. Captures are **local development renders, not hosted screenshots**. Next's development-only portal is hidden for clean captures; product UI is unchanged. The first capture set remains in the task's private evidence directory; these final captures also wait for the synthetic feedback-config check to settle.

- `milestones-1440.png`: header actions absent; bottom-left Feedback; collapsed summary rail.
- `milestones-expanded-1440.png`: existing manual summary access retained.
- `milestones-390.png`: narrow Milestones header/layout without duplicate actions.
- `feedback-footer-320.png`: sole narrow-layout trigger, left-aligned below the content.
- `feedback-composer-1440.png`: retained Feedback trigger opens the existing selection/composer flow.

## Replay

`run-fixture.mjs` is the exact adapted fixture launcher used here, fixed to task-owned loopback ports45731/45732 and private physical dependencies. Create its parent `/opt/data/tmp/atlas-feedback-only-20261113` before launch; do not overwrite an active fixture. Existing fixtures must first be stopped and their port confirmed closed. It applies no hosted/source-auth change.

```sh
node docs/qa/feedback-only-20261113/run-fixture.mjs "$PWD" 358d6811ec421c0d245893bf7000041aa56da5c4 candidate 45731
# In an owned browser-harness window, after the exact-source HTTP health check:
ATLAS_ACTIONS_QA_OUT=/opt/data/tmp/atlas-feedback-only-replay browser-harness < docs/qa/feedback-only-20261113/native-qa.py
```

The output's `browser-targets.json` journals temporary browser ownership; cleanup closes only those targets and verifies all pre-existing ones survive. It is local housekeeping, not repository evidence. The replay retains the executed assertions and makes only its output directory reusable. No production deploy, merge, environment/access change, scheduler or proposal automation is part of this PR.
