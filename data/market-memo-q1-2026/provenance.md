# Provenance — Q1+ 2026 BCI Market Memo

## Where the data actually comes from

There is **no public machine-readable dataset** behind the infographic. The chain is:

1. **Primary sources** — public deal/milestone announcements (BusinessWire, GlobeNewswire, MassDevice, Bloomberg, Wired, Sixth Tone, company newsrooms). Linked per-row in `milestones.csv` where the memo post cites them.
2. **Neurotech Notables** — Naveen Rao's biweekly tracking column on [neurotechnology.substack.com](https://neurotechnology.substack.com/t/notables). Issues **#46–#53** itemize the Jan–Apr 2026 deals that feed this memo. Prior-year baselines come from his [2024](https://neurotechnology.substack.com/p/2024-funding-snapshot) and [2025 Funding Snapshot](https://neurotechnology.substack.com/p/2025-snapshot) reports ($4.8b across 140 neurotech deals in 2025; $1.46b implanted-BCI).
3. **Patchwise Labs' internal database** — the actual tracking layer ("200+ global neurotech startups... history, leadership, clearances, patents, trials"). Not public.
4. **The memo** — [Representations #2](https://neurotechnology.substack.com/p/representations2) (Neurotech Futures × PL Neuro), which renders the tally as the infographic committed here.

## Corrections / context from the memo text (beyond the infographic)

- **$650m+** on the visual = **$653m** exactly; author projects ~$2b full-year 2026 BCI funding at this pace (YTD = 45% of 2025's $1.46b with 2 months left in H1).
- **Penumbra $14b** = Boston Scientific's acquisition, reported at **$14.5b**; author explicitly flags it as "not a 'BCI' play" but a neural-access bet.
- **Synchron's $200m Series D closed Nov 2025** — outside the memo window; the tracked milestone is the pivotal trial start.
- **MintNeuro–Motif partnership (May 1, 2026)** was omitted from the visual as out-of-window; added to `milestones.csv` as an extra flagged row.
- **Post-memo additions (reviewed 2026-09-30)** sit on the same lanes only when a company release names the date. Added: Paradromics Connect-One personal-device expansion (2026-08-26), CorTec’s second Breakthrough Device Designation (announced 2026-08-31), Paradromics real-time speech in Connect-One (2026-09-14), and Precision Neuroscience’s $250m Series D (2026-09-24). The Series D’s $430m total-raised figure is cumulative and is not plotted. Newsletter-only items without a dated company release were left off.
- **China**: StairMed + Gestala + Axoft raises crossed $100m combined — the memo calls out breadth of Chinese investor types as the trend to watch.

## Getting the real underlying data

The author invites methodology questions at **naveen@patchwiselabs.com** — and the memo is produced in collaboration with **PL Neuro**, so the partnership channel is the natural route to the underlying deal spreadsheet if we want it. Alternative: scrape Notables #46–#53 for the itemized deal list (each issue links every deal).
