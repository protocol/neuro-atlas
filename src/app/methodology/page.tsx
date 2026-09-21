import { atlasMetadata } from "@/lib/atlas-metadata";
import { atlasPath } from "@/lib/atlas-path";
import { NEUROFOUNDERS_MAP_URL } from "@/lib/ecosystem";
import { PlateHero } from "@/components/plate-header";
import { Abbr } from "@/components/abbr";

export const metadata = atlasMetadata("/methodology", "Methodology — Neuro Atlas");

const SOURCES = [
  {
    name: "Neurofounders start-up map",
    what: "External directory maintained by Neurofounders. Ecosystem links to their original startup map; Atlas does not host a copy of the directory.",
    cadence: "External resource · maintained by Neurofounders",
    url: NEUROFOUNDERS_MAP_URL,
  },
  {
    name: "Q1+ 2026 BCI Market Memo",
    what: "2026 milestone events, deals, and ecosystem firms, Jan–Apr 2026. By Neurotech Futures & PL Neuro; enriched here with primary-source dates.",
    cadence: "Point-in-time (Apr 2026)",
    url: "https://neurotechnology.substack.com/p/representations2",
  },
  {
    name: "BCI Funding Index",
    what: "A screened 25-company capital plate: sourced financings of $2m+, investor participation, and selected regulatory markers. Independently sourced, not a replacement ecosystem census.",
    cadence: "Source review through 2026-09-07",
    url: "/funding",
  },
  {
    name: "PL R&D field-velocity framework",
    what: "The five velocity instruments, neurotech readings, inflection points, and forecast-market mappings.",
    cadence: "Inherited from plrd.org · per-reading measuredAt/checkedAt",
    url: "https://www.plrd.org/",
  },
  {
    name: "Forecast markets",
    what: "Kalshi, Polymarket, Metaculus questions mapped to inflection points.",
    cadence: "Live pulls coming soon",
    url: null,
  },
];

const PRINCIPLES = [
  {
    title: "Never fabricate a reading",
    body: "Every metric is live, or it is honestly marked unwired (a named candidate metric plus its blocker) or not applicable (a reason). Dates without confirmation sit in a 'date TBD' shelf instead of being faked onto an axis.",
  },
  {
    title: "Measurement with a feed underneath",
    body: "Every plate is a measurement whose drill-down is its evidence: the deal table under Capital, the event sources under Milestones, the article stream under future plates. The feed is the footnote apparatus, never the product.",
  },
  {
    title: "Every reading carries provenance",
    body: "Sources, observation date (measuredAt) and pipeline-run date (checkedAt) travel with each number. Queries behind derived series get frozen and versioned — a changed query is a new series, not a silent update.",
  },
  {
    title: "Acronyms get tooltips",
    body: "Any acronym from the glossary rendered in this UI carries its expansion and a one-line definition on hover — like FIH, BDD, or IDE. The glossary is a data file, not hardcoded strings.",
  },
];

export default function MethodologyPage() {
  return (
    <>
      <PlateHero
        kicker="How this is built"
        meta={["Versioned"]}
        title="Methodology"
        description="What each reading means, where the data comes from, and how to contribute. The methodology is versioned: when a method changes, the change is logged here."
        status="live"
        stats={[
          { value: String(SOURCES.length), label: "named sources" },
          { value: String(PRINCIPLES.length), label: "working principles" },
        ]}
      />
      <section className="mt-8 mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Principles</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="card p-5">
              <h3 className="text-sm font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {p.title === "Acronyms get tooltips" ? (
                  <>
                    Any acronym from the glossary rendered in this UI carries its expansion
                    and a one-line definition on hover — like <Abbr term="FIH" />,{" "}
                    <Abbr term="BDD" />, or <Abbr term="IDE" />. The glossary is a data
                    file, not hardcoded strings.
                  </>
                ) : (
                  p.body
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Data sources</h2>
        <div className="card divide-y divide-border">
          {SOURCES.map((s) => (
            <div key={s.name} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-4">
              <div className="w-56 shrink-0 text-[13px] font-semibold">
                {s.url ? (
                  <a href={atlasPath(s.url)} target="_blank" rel="noreferrer" className="hover:text-accent">
                    {s.name} ↗
                  </a>
                ) : (
                  s.name
                )}
              </div>
              <div className="flex-1 text-xs leading-relaxed text-muted">{s.what}</div>
              <div className="shrink-0 text-[11px] text-faint">{s.cadence}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Status legend</h2>
        <div className="card flex flex-wrap gap-x-8 gap-y-3 p-5 text-xs text-muted">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-positive" /> Live — real data, sourced and dated
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-warning" /> Partial — some readings live, gaps named
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full border border-border-strong" /> Coming soon — metric named, pipeline not built
          </span>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Contribute</h2>
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-muted">
            This atlas is built in the open. The data layer is CSV and JSON with
            provenance fields. Corrections with a primary source beat opinions; a dated number with a
            link beats both.
          </p>
          <div className="mt-4">
            <a
              href="https://github.com/protocol/neuro-atlas/pulls"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
              </svg>
              Open a Pull Request on GitHub ↗
            </a>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Changelog</h2>
        <div className="card p-5">
          <ul className="space-y-2 text-xs leading-relaxed text-muted">
            <li>
              <span className="tnum font-medium text-foreground">2026-09-11</span> — Ecosystem now links directly to the Neurofounders startup map. Removed the copied directory, derived dataset, and Neurofounders-sourced logos from the current source tree. The independently sourced funding and milestone records remain unchanged.
            </li>
            <li>
              <span className="tnum font-medium text-foreground">2026-09-10</span> — Reconciled Milestones with the BCI Funding Index: added NeuCyber ($29m government backing), Neurosoft Bioelectronics ($7.5m seed), and Science Corp PRIMA CE mark. Added an interactive &apos;BCI only&apos; vs &apos;All neurotech&apos; scope filter to the Milestone timeline and updated header copy to accurately reflect neural interfaces and broader neurotechnology. Added community GitHub Pull Request contribution buttons across plates and navigation.
            </li>
            <li>
              <span className="tnum font-medium text-foreground">2026-09-07</span> — Milestone year columns and the BCI Funding Index now label capital as amount raised. Neuralink $650m is a Series E raise, not a valuation or market cap; year heroes sum sourced round sizes, with Naveen’s $260m / $322m / $653m memo cut kept as a labeled comparison.
            </li>
            <li>
              <span className="tnum font-medium text-foreground">2026-09-07</span> — Funding plate hero title is BCI Funding Index (no leading “The”); shared title type is slightly smaller and no longer force-balances onto two lines, so every tab stays one line.
            </li>
            <li>
              <span className="tnum font-medium text-foreground">2026-09-07</span> — Plate heroes top-align title and stats across tabs; nav and home directory label the capital plate BCI Funding Index.
            </li>
            <li>
              <span className="tnum font-medium text-foreground">2026-09-07</span> — Shared dark plate hero (title + stats) on Milestones, Ecosystem, Funding index, Field velocity, and Methodology. Funding-index regulatory markers use a real hover tooltip instead of the native title attribute.
            </li>
            <li>
              <span className="tnum font-medium text-foreground">2026-08-24</span> — v0.2:
              plates introduced; milestone timeline (Jan–Apr 2026), faceted landscape
              explorer, velocity instruments, capital partials. Announcement dates
              added to 10 of 28 milestone rows from primary sources.
            </li>
            <li>
              <span className="tnum font-medium text-foreground">2026-08-24</span> — v0.1:
              shell, theming, data ingest (Neurofounders, market memo, field velocity).
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
