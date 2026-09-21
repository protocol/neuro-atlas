# Local integration evidence — September 18, 2026

Real headed-Chrome captures of two locally running Next applications; not hosted deployment proof. Atlas runtime: `f7a85ae26b85976e5fe8c914ff39e8df36d5adbd`, in an isolated loopback-only fixture with the Basic-auth proxy omitted. That fixture is not included in either PR. PLRD captures precede the middleware-only mixed-case cookie correction at `89ccfc0`; visible UI is identical. The correction receives a separate upstream privacy replay.

The static Neurotech card image (`public/images/neuro-atlas-preview.png` in PLRD) is a genuine local Atlas interface screenshot at that Atlas runtime revision. It is not live data or a copied/editable dataset.

Local paired QA covered prefix root/deep routes; JS/CSS/fonts/logos; retained PL Neuro Website link plus separate Atlas link; 1440/390/320px layout; browser Back/reload; chart hash/deep-link/modal/Escape; funding search and company detail. See PR verification for final native tests/build and upstream Cookie/Authorization probe results.

Hosted paired validation remains a launch prerequisite: reconnect the existing Vercel project to the transferred repository; deploy exact-SHA prefixed Atlas preview; pair with PLRD preview; resolve anonymous access separately. No merge, production configuration, auth change, permanent redirect, or collaborator invitation is included.

## Old links at cutover

Preserve page-to-page links after the new public route is verified: old `/milestones` → `https://www.plrd.org/neuro-atlas/milestones`; likewise `/funding`, `/field-velocity`, and `/methodology`. Preserve query strings and browser fragments; legacy `/regulatory-landscape` maps to Milestones. Keep `/ecosystem`'s current external destination unless separately changed. Use temporary redirects during validation; distinguish direct legacy-host traffic from the internal proxy hop to avoid loops. Test both paths before permanent redirects. These PRs do not activate the cutover redirects.
