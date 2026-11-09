# Notables #65 — reviewed financing and historical FX evidence

These are genuine headed-Chrome captures of isolated local production builds, **not live production or a hosted-authentication test**. Hosted anonymous requests still return 401 with noindex. The final PR leaves access, base-path and noindex sources unchanged.

## Source binding

- Baseline: `592c039b6bf21198e177bafe0f81e267b4415ff7` (current `main` when reviewed).
- Captured candidate app/data: `675ce445adad05c135c01b88741bd3abf44dc16e`.
- Final validation correction: `88401a1` removes unsupported earlier-business-day FX acceptance. It changes only the generator helper and its tests; the captured app/data/public source is byte-identical. Regeneration produces the same 49 generated/logo files. A final unmodified-auth production build validates that revision separately.
- Loopback origins: baseline `http://127.0.0.1:35791/neuro-atlas`, candidate `http://127.0.0.1:35794/neuro-atlas`.
- Only a disposable detached QA tree replaces its proxy with an explicit-QA-flag/raw-Host guarded loopback fixture. Wrong Host returns 401. No fixture goes into the PR; the application source is unchanged in that copy.

## Matched captures and assertions

- `before-timeline-1440.png` / `after-timeline-1440.png` and their `390` counterparts show the actual horizontally scrolled Milestone timeline. All six reviewed source links are absent on baseline and exactly once on candidate at both widths.
- Candidate 2026 summary: **15 rounds raised · 1 grant**, with $1,209.507350514536m financing before the existing $1.2b display rounding. Grants are classified from the event, not a missing USD amount; disclosed grants stay out of financing totals and the cumulative line.
- `after-neuroxess-tooltip-1440.png` / `390.png` show the real hovered NeuroXess Series B marker. Its native **RMB 700m**, approximately **$105m** historical estimate, Fed **CNY 6.6662 per USD on October 28, 2026**, and **announcement-date fallback; actual investment date undisclosed** are visible. This is not an issuer-reported USD amount.
- `before-neuroxess-funding-1440.png` / `after-neuroxess-funding-1440.png` and `390` counterparts show the native Funding index company dialog. Series B is present once only on candidate, alongside the retained 2022 financing. Both views derive the same conversion from one pinned observation. They are separate view totals, not additive datasets.
- Coherence’s $45m Series A, the other four qualified milestone events and sole indication correction remain protected by exact-source/exact-delta tests; all original baseline hashes are unchanged. No implant-count or other Field Velocity chart is updated.

## Verification

- Fresh frozen `npm ci`, typecheck and production build with the real `/neuro-atlas` prefix passed.
- Full suite: **1,117 tests passed**, zero failures/cancellations/skips, with bounded worker concurrency. The first unbounded default run exhausted its test workers and was replaced by a complete successful replay; it was not called passing.
- Focused RED→GREEN regressions prove native/undisclosed rounds are not grants; disclosed grants stay excluded; both generated views use pinned historical FX; missing/future/stale/duplicate/contradictory metadata and unsupported previous-business-day claims fail closed.
- Re-running data generation is deterministic across 49 generated/logo files. Historical USD values and global coverage/as-of dates were not silently advanced.
- Native browser replay passed eight before/after × width × surface states, plus both tooltips; screenshots were opened and visually inspected. Positive hosted login was not exercised.

No merge, auto-merge or production promotion is part of this PR. The actual investment day is still unknown. This change does not claim a retrospective audit of legacy conversions.
