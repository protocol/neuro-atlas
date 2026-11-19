import { atlasMetadata } from "@/lib/atlas-metadata";
import { atlasPath } from "@/lib/atlas-path";
import { NEUROFOUNDERS_MAP_URL } from "@/lib/ecosystem";
import { PlateHero } from "@/components/plate-header";
import { Abbr } from "@/components/abbr";
import { FeedbackTrigger } from "@/components/feedback/feedback-trigger";
import sourceCatalog from "@/data/methodology-sources.json";

export const metadata = atlasMetadata("/methodology", "Data sources and data gathering procedures — Neuro Atlas");

const SOURCES = [
  {
    name: "Neurofounders start-up map",
    what: "Ecosystem links directly to the startup map maintained and hosted by Neurofounders.",
    cadence: "External resource · maintained by Neurofounders",
    url: NEUROFOUNDERS_MAP_URL,
  },
  {
    name: "Q1+ 2026 BCI Market Memo",
    what: "The January–April 2026 implanted BCI memo from Neurotech Futures and PL Neuro seeded milestone and financing research. Neuro Atlas adds dated primary evidence and later events.",
    cadence: "Point-in-time memo plus verified 2026 releases",
    url: "https://neurotechnology.substack.com/p/representations2",
  },
  {
    name: "BCI Funding Index",
    what: "A screened set of implanted and implant-adjacent brain-computer interface companies, with disclosed financing rounds, investor participation, and selected regulatory markers.",
    cadence: "Baseline review: September 30, 2026 · selective later updates",
    url: "/funding",
  },
  {
    name: "PL R&D field-velocity framework",
    what: "The shared framework for field-velocity measurements, inflection points, and forecast-market mappings.",
    cadence: "Versioned snapshot · dates vary by reading",
    url: "https://www.plrd.org/",
  },
  {
    name: "Forecast markets",
    what: "Kalshi, Polymarket, Metaculus questions mapped to inflection points.",
    cadence: "External forecasts · selected questions",
    url: null,
  },
];

const SOURCE_GROUPS = {
  datasets: { title: "Datasets and registries", description: "Bibliographic and search data, trial and regulatory records, exchange rates, and research dataset releases." },
  studies: { title: "Papers, preprints, and study evidence", description: "Research publications and supporting materials behind chart observations, comparisons, and historical series." },
  disclosures: { title: "Company and institutional disclosures", description: "Company sites, investor and institution statements, and issuer releases distributed by newswires. A homepage identifies the organization; individual announcements support specific events." },
  discovery: { title: "Reporting and discovery", description: "Trade and general reporting, profiles, newsletters, and the market memo. These help find and cross-check records; individual records identify their evidence." },
  ecosystems: { title: "External ecosystem and forecast sources", description: "The independently maintained startup map and forecast questions or markets linked to selected inflection points." },
  reference: { title: "Methodology and reference", description: "Frameworks, definitions, model assumptions, and contextual references used to interpret the data." },
} satisfies Record<keyof typeof sourceCatalog, { title: string; description: string }>;

const PRINCIPLES = [
  {
    title: "Never fabricate a reading",
    body: "Readings are sourced; missing readings are labeled. Dates without confirmation stay off the time axis.",
  },
  {
    title: "Evidence at the point of use",
    body: "Deal records, event citations, and chart source notes give readers the evidence behind each view.",
  },
  {
    title: "Every reading carries provenance",
    body: "Source, observation date, and check date have distinct meanings. Derived series use versioned queries.",
  },
  {
    title: "Acronyms get tooltips",
    body: "Glossary acronyms have a short definition.",
  },
];

export default function MethodologyPage() {
  return (
    <>
      <PlateHero
        kicker="Methodology"
        title="Data sources and data gathering procedures"
        description="Where Neuro Atlas gets its data, how records are selected, and how to suggest a correction."
        stats={[]}
      />
      <section aria-labelledby="why-we-built-it" className="my-8 max-w-3xl space-y-3 text-sm leading-relaxed text-muted">
        <h2 id="why-we-built-it" className="text-base font-semibold text-foreground">Why we built Neuro Atlas</h2>
        <p>At PL Neuro, we wanted one place to follow how neurotechnology was progressing: what researchers could measure and build, which companies were reaching clinical and commercial milestones, and where capital was going. We couldn’t quite find the combination we were looking for, so we built it ourselves.</p>
        <p>This is the kind of field building we’re proud to do at PL Neuro: turning scattered evidence into a useful public resource that researchers, builders, and funders can work from – and we hope to work with the community to improve it together.</p>
      </section>
      <section aria-labelledby="data-gathering" className="mb-8">
        <h2 id="data-gathering" className="mb-3 text-base font-semibold">How data is gathered</h2>
        <div className="card space-y-3 p-5 text-sm leading-relaxed text-muted">
          <p><strong className="text-foreground">Milestones.</strong> Selected clinical, commercial, and financing events cover neurotechnology broadly. Entries cite public evidence and distinguish event, announcement, and reported dates where known. Date precision reflects the source.</p>
          <p><strong className="text-foreground">BCI Funding Index.</strong> The narrower index tracks disclosed financings of at least USD 2 million (or the qualifying local-currency equivalent) across a screened set of implanted and implant-adjacent companies. Capital means the amount raised in included rounds. Investor-associated capital is the total size of rounds the investor appears in; separately sourced portfolio relationships do not contribute to round totals. A financing can appear in both views.</p>
          <p><strong className="text-foreground">Field Velocity.</strong> Chart sources include study results, dataset releases, and reported observations. Some series come from the shared PL R&D snapshot; other charts use curated point-level evidence or validated data feeds. Units, sample scope, and observation dates are shown with the relevant chart. Forecasts are separate from observed measurements.</p>
          <p><strong className="text-foreground">Updates and limitations.</strong> We aim to review and update Neuro Atlas daily. Source publication, observation, and check dates vary by record. OpenAlex publication and citation feeds and Google Trends are refreshed on a weekly schedule when validated data is available. See the <a className="font-medium text-accent underline underline-offset-4" href="#data-disclaimer">data and errors disclaimer</a> for limitations and how to use the data.</p>
        </div>
      </section>
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
        <h2 className="mb-3 text-base font-semibold">Source overview</h2>
        <div className="card divide-y divide-border">
          {SOURCES.map((s) => (
            <div key={s.name} className="grid gap-1 p-4 sm:grid-cols-[minmax(9rem,1fr)_minmax(0,2fr)] sm:gap-x-4">
              <div className="text-sm font-semibold sm:row-span-2">
                {s.url ? (
                  <a href={atlasPath(s.url)} target="_blank" rel="noreferrer" className="hover:text-accent">
                    {s.name} ↗
                  </a>
                ) : (
                  s.name
                )}
              </div>
              <div className="text-sm leading-relaxed text-muted">{s.what}</div>
              <div className="text-xs text-muted">{s.cadence}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="source-directory" aria-labelledby="directory-heading" className="mb-8 scroll-mt-4">
        <h2 id="directory-heading" className="mb-2 text-base font-semibold">Source directory</h2>
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted">Open a category to see the linked evidence and references used in Neuro Atlas and its source reviews. Follow the citation on an individual record or chart to see what supports that observation.</p>
        <div className="card divide-y divide-border">
          {(Object.keys(SOURCE_GROUPS) as (keyof typeof sourceCatalog)[]).map((key) => {
            const { title, description } = SOURCE_GROUPS[key];
            const entries = sourceCatalog[key];
            return (
              <details id={`sources-${key}`} key={key} name="methodology-source-group" className="scroll-mt-4">
                <summary className="cursor-pointer p-4 text-sm font-semibold marker:text-muted hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
                  {title} <span className="ml-1 font-normal text-muted">({entries.length})</span>
                </summary>
                <div className="px-4 pb-4">
                  <p className="mb-3 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>
                  <ul className="grid gap-x-6 gap-y-2 border-t border-border pt-3 text-sm leading-relaxed sm:grid-cols-2">
                    {entries.map(([url, label]) => (
                      <li key={url} className="min-w-0">
                        <a href={url} className="wrap-anywhere text-foreground underline decoration-border-strong underline-offset-4 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            );
          })}
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

      <section id="contribute" aria-labelledby="contribute-heading" className="mb-8 scroll-mt-4">
        <h2 id="contribute-heading" className="mb-3 text-base font-semibold">Contribute</h2>
        <div className="card p-5">
          <p className="max-w-3xl text-sm leading-relaxed text-muted">
            We welcome corrections and new sources from the community. We plan to enable contributions through GitHub pull requests. In the meantime, use Feedback to select the part of the page you’re commenting on and include a source link and date if available.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <FeedbackTrigger className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" />
            <a href="https://github.com/protocol/neuro-atlas/pulls" target="_blank" rel="noreferrer" className="text-sm text-muted underline underline-offset-4 hover:text-foreground">View existing pull requests ↗</a>
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
              <span className="tnum font-medium text-foreground">2026-08-26</span> — Four
              plates introduced; milestone timeline (2024–2026), faceted landscape
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
