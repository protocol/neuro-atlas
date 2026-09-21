# Neuro Atlas

An interactive atlas of the brain-computer interface field — milestones, capital, velocity, landscape, and the people building it. Neobank-grade UI, light and dark mode.

**Status:** taking shape. The atlas includes Milestones, the BCI Funding Index, Field velocity, and Methodology. Ecosystem links to the [Neurofounders startup map](https://www.neurofounders.co/resources/start-up-map), rather than hosting a copy of their directory. Canonical Atlas data lives in `data/` (CSV/JSON with provenance); `scripts/generate-derived.mjs` builds the `src/data/*.json` the app consumes.

## Stack

The Field velocity plate now includes [shared performance curves](docs/performance-curves.md): selected neuron-recording, mapped-tissue and recording-hours evidence from a validated, pinned PL R&D export. See that guide for source provenance, refresh/parity commands, counting limits and QA.

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com) — design tokens in `src/app/globals.css`
- [next-themes](https://github.com/pacocoursey/next-themes) — class-based light/dark with system default

## Develop

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

```
src/
  app/
    layout.tsx        # Root layout + ThemeProvider
    page.tsx          # Dashboard shell (placeholder modules)
    globals.css       # Design tokens (light/dark), card primitive
  components/
    site-header.tsx   # Sticky header + theme toggle
    theme-provider.tsx
    theme-toggle.tsx
    stat-card.tsx     # Headline metric card
    placeholder-panel.tsx
```

## Design language

- Surfaces: soft neutral background, white/near-black cards, 1px borders, `rounded-2xl`-ish radii, restrained shadows
- Accent: neural violet (`--accent`)
- Numbers: always tabular (`.tnum`)
- All tokens are CSS variables — restyle in one file

## Deploy

Hosted on Vercel. After the transfer to [protocol/neuro-atlas](https://github.com/protocol/neuro-atlas), verify the existing project's GitHub App access and Git connection before relying on automatic main/PR deployments.

See [Contributing](CONTRIBUTING.md) for source/units/provenance and tests, and [PLRD hosting](docs/plrd-hosting.md) for opt-in `/neuro-atlas`, canonical metadata, the existing hosted Basic-auth gate, launch and rollback. Root hosting remains the default. This change alone does not authorize public launch or change production settings.
