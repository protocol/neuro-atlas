# Public visitor feedback — native UI evidence

**Runtime/source:** `b487c27e709d4193e9028d10023626d24ef1e68e`. The evidence-only commit that adds this directory does not change app, tests, dependencies, site gate, or chart code.

These captures show the **actual Atlas Next app** mounted at `/neuro-atlas` on a disposable task-owned loopback fixture (`next dev --webpack`). The actual public config/POST route and committed server factory ran over HTTP; only the external Linear boundary was synthetic. The copied fixture replaced only its local proxy with a strict loopback/Host/revision gate and injected synthetic provider configuration. No real key, OAuth, external provider request, model, worker, proposal, GitHub write or site-auth change occurred in this replay.

## Observed results

- Desktop 1440px, mobile 390px and 320px: one field, existing structural element picker, no visitor sign-in/popup/history/account controls; anchored composer remains in bounds.
- Picking the actual chart Close button does not activate it; the chart and native modal remain behind the composer. Copy link / Copy chart / Download PNG are retained.
- Forced provider failure preserves the draft, request key and complete body. Explicit retry returns 202 only after actual handler read/create/read against the synthetic peer, creating one record.
- Success clears the field and pin; a separate note gets a new key. Native Tab focus remains in the composer, and the same mounted 390px composer clamps into a 400px keyboard-sized viewport.
- Three widths passed; six deliberately synthetic records, **zero actual external provider calls**. `native-results.json` has measured geometry and boundaries.
- The first replay attempt caught a **harness false positive**, not an app defect: its broad text regex matched “account” inside the test note. The corrected assertion checks actual UI controls, not user-entered prose. No save had occurred in that failed attempt.

## Images

- `public-composer-1440.png`, `public-composer-390.png`, `public-composer-320.png` — no-login single-field composer.
- `public-retry-390.png` — retained draft after deliberately failed synthetic save.
- `public-saved-390.png` — native top-layer toast after the synthetic peer's readback; **not** proof of a real Linear save.
- `public-keyboard-390.png` — same mounted composer at 390×400.

The dev renderer reported tiny SVG floating-point hydration-attribute differences in unchanged chart code. The separate exact-source production build passed; these are local development captures, not a hosted production visual claim.

## Separate gates and limits

At the runtime pin: parent standard `npm test` **1,139/1,139 passed**, typecheck, production build, changed-source lint and production audit passed. Independent exact-head functional/security review passed, with no material findings (55 focused tests plus 12 independently authored adversarial tests reported by the reviewer).

A separate real native MCP storage probe (PLR-108) established Linear's fenced-Markdown canonical form; it was canceled and read back after the probe. Real backend/provider acceptance in Vercel's own secret environment and an actual hosted browser submission are distinct from these captures. A blank/error hosted baseline was not explained or counted as sign-in/website acceptance. No source password was used or gate weakened to make this replay pass.
