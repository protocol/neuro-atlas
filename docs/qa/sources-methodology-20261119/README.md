# Sources and methodology — visual and interaction evidence

## Scope

Rebuild the existing `/neuro-atlas/methodology` page and relocate its discovery to the shared footer. Source directory: 587 unique links across six categories. Chart-specific citations retain their support relationships. No chart data, refresh backend, access/consent policy, or graph URL migration is changed.

## Runtime revision

The screenshots were captured from the local production build of `471e5497b58b7f70e6fba7dcfbcca32779688115`, built with `NEXT_PUBLIC_BASE_PATH=/neuro-atlas`, the public PL Neuro origin, and preview noindex. Later test/evidence-only commits retain identical runtime sources and assets.

- Build ID: `78EGiHWEB3dLSMdExMtlF`.
- Methodology HTML SHA-256: `3500127395a896eb36405a1037e7d98fec59560635149e26279eb98cc5549c0c`.
- Served page matched its built HTML exactly; all 13 referenced static JS/CSS/preload assets matched build bytes.

## Native browser checks

Actual Chrome, viewport-emulated pointer/keyboard input at 1440, 768, 390, and 320 pixels, light and dark:

- Short title with no subtitle; Principles, Status legend, and Changelog removed.
- Researcher correspondence/accuracy acknowledgment, thanks for the underlying research, and missing-credit invitation linked to the existing contribution/Feedback action. Three cited studies use verified full titles in the directory.
- Exact href/label equality for all 587 catalog links; six expandable source categories.
- Four footer link groups; Neurotech Futures, Neurofounders, and Learn more in the sources group.
- Logo and “by PL Neuro” attribution; preserved disclaimer and legal links.
- Native footer Learn more navigation, disclaimer anchor, category expansion, and Feedback open/Escape. No feedback submitted.
- Three home tiles, responsive wrapping; desktop/mobile navigation; no duplicate old methodology entry in the home body.
- Shared footer on home, Milestones, Funding, Field velocity, and methodology.
- Existing graph hash/pop-out still opens and closes. New chart paths remain a separately documented proposal.
- Existing `/ecosystem` redirect behavior retained, including prefixed/legacy/slash variants and repeated query keys.

These are local production-build captures, not screenshots of a hosted or live release. Physical-device touch and real feedback submission were not exercised.

## Captures

- `methodology-1440-light.png`: rebuilt page, desktop.
- `methodology-390-light.png`: compact title and intro, mobile.
- `footer-1440-dark.png`: four-column source discovery and disclaimer.
- `footer-390-dark.png`: responsive footer.
- `sources-expanded.png`: expanded source directory.
- `home-1440.png`: remaining primary exploration tiles after source relocation.

- `source-directory-overview.png`: all six categories and contribution guidance.
- `researcher-acknowledgment.png`: Field Velocity credit and missing-reference invitation.

## Test receipts

The complete 1,497-case run had 1,496 passing cases and one obsolete requirement that methodology keep its old shared hero. The test-only correction retains shared-hero coverage for the three data plates and adds the requested compact title/no-subtitle contract; its isolated replay passed. A second all-files-except-unchanged-chart-sharing run had 1,472 passing cases and one untouched analytics-history assertion failure; that assertion passed in the first run and the isolated replay. Neither failed aggregate is relabeled as green. Every affected page/footer/source/header contract passed again after the final researcher copy. Production build, typecheck, changed-file lint, and the final native production-build replay passed. This update changes no analytics or chart renderer/export implementation.
