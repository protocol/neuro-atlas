# Sources and methodology — visual and interaction evidence

## Scope

Rebuild the existing `/neuro-atlas/methodology` page and relocate its discovery to the shared footer. Source directory: 587 unique links across six categories. Chart-specific citations retain their support relationships. No chart data, refresh backend, access/consent policy, or graph URL migration is changed.

## Runtime revision

The screenshots were captured from the local production build of `34e31522b1746467f5d8d63b2a8572488c9f8058`, built with `NEXT_PUBLIC_BASE_PATH=/neuro-atlas`, the public PL Neuro origin, and preview noindex. Later test/evidence-only commits retain identical runtime sources and assets.

- Build ID: `rcMH9eVPXwnKbXJjRZ7LR`.
- Methodology HTML SHA-256: `acf440a39befb842cc1dbc85a1482f7e8cf1703cc218aef8b23cfe3e6ad2112b`.
- Served page matched its built HTML exactly; all 13 referenced static JS/CSS/preload assets matched build bytes.

## Native browser checks

Actual Chrome, viewport-emulated pointer/keyboard input at 1440, 768, 390, and 320 pixels, light and dark:

- Short title with no subtitle; Principles, Status legend, and Changelog removed.
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
