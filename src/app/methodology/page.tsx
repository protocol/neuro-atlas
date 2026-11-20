import { atlasMetadata } from "@/lib/atlas-metadata";
import { atlasPath } from "@/lib/atlas-path";
import { FeedbackTrigger } from "@/components/feedback/feedback-trigger";
import sourceCatalog from "@/data/methodology-sources.json";
import { SourceLinkMark, SourceBrandStrip } from "@/components/source-brand";
import { sourceBrandForUrl } from "@/data/source-brands";
import { sourceContextsForUrl } from "@/lib/source-context";

export const metadata = atlasMetadata("/methodology", "Sources & methodology — Neuro Atlas");

const SOURCE_GROUPS = {
  datasets: { title: "Datasets and registries", description: "OpenAlex publications and reference data; Google Trends search interest; ClinicalTrials.gov and FDA records; historical recording compilations, research dataset releases, and exchange-rate records." },
  studies: { title: "Papers, preprints, and study evidence", description: "Research publications and supporting materials behind chart observations, comparisons, and historical series." },
  disclosures: { title: "Company and institutional disclosures", description: "Company sites, investor and institution statements, and issuer releases distributed by newswires. A homepage identifies the organization; individual announcements support specific events." },
  discovery: { title: "Reporting, curation, and discovery", description: "The initial Milestones data was compiled from Neurotech Futures’ BCI Market Memo. Notables and trade/general reporting support discovery; the EM Datasets compilation shared by Forrest Collman guides connectomics curation." },
  ecosystems: { title: "External ecosystem and forecast sources", description: "The Neurofounders startup map and selected Kalshi, Polymarket, and Metaculus questions linked to inflection points. Forecast links lead to the platforms’ own current questions." },
  reference: { title: "Methodology and reference", description: "The PL R&D field-velocity framework, OpenAlex and Google Trends definitions, source-selection methods, conversion assumptions, and contextual references." },
} satisfies Record<keyof typeof sourceCatalog, { title: string; description: string }>;

export default function MethodologyPage() {
  return (
    <>
      <header className="-mx-5 -mt-5 rounded-t-2xl border-b border-border bg-[#101217] px-5 py-8 text-white sm:-mx-7 sm:-mt-7 sm:px-7 sm:py-10 lg:-mx-9 lg:-mt-9 lg:px-9">
        <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-tight tracking-[-0.045em]">Sources &amp; methodology</h1>
      </header>
      <section aria-labelledby="why-we-built-it" className="my-8 max-w-3xl space-y-3 text-sm leading-relaxed text-muted">
        <h2 id="why-we-built-it" className="text-base font-semibold text-foreground">Why we built Neuro Atlas</h2>
        <p>At PL Neuro, we wanted one place to follow how neurotechnology was progressing: what researchers could measure and build, which companies were reaching clinical and commercial milestones, and where capital was going. We couldn’t quite find the combination we were looking for, so we built it ourselves.</p>
        <p>This is the kind of field building we’re proud to do at PL Neuro: turning scattered evidence into a useful public resource that researchers, builders, and funders can work from – and we hope to work with the community to improve it together.</p>
      </section>
      <section aria-labelledby="data-gathering" className="mb-8">
        <h2 id="data-gathering" className="mb-3 text-base font-semibold">How data is gathered</h2>
        <div className="card space-y-3 p-5 text-sm leading-relaxed text-muted">
          <p><strong className="text-foreground">Milestones.</strong> The initial data was compiled from the <a href="https://neurotechnology.substack.com/p/representations2" className="underline underline-offset-4">January–April 2026 BCI Market Memo</a> by Neurotech Futures and PL Neuro. The timeline now includes selected clinical, commercial, and financing events across neurotechnology. Entries cite public evidence and distinguish event, announcement, and reported dates where known. Date precision reflects the source.</p>
          <p><strong className="text-foreground"><a className="underline underline-offset-4" href={atlasPath("/funding")}>BCI Funding Index.</a></strong> The narrower index tracks disclosed financings of at least USD 2 million (or the qualifying local-currency equivalent) across a screened set of implanted and implant-adjacent companies. Capital means the amount raised in included rounds. Investor-associated capital is the total size of rounds the investor appears in; separately sourced portfolio relationships do not contribute to round totals. A financing can appear in both views.</p>
          <div id="field-velocity-methodology" className="space-y-3">
            <p><strong className="text-foreground">Field Velocity.</strong> Chart sources include study results, dataset releases, and reported observations. Some series come from the shared <a href="https://www.plrd.org/" className="underline underline-offset-4">PL R&amp;D</a> snapshot; other charts use curated point-level evidence or validated data feeds. Units, sample scope, and observation dates are shown with the relevant chart. Forecasts are separate from observed measurements.</p>
            <p>We’ve contacted and corresponded with many of the original researchers around the world. We’re grateful for their feedback, which helps us represent their work accurately, and for the research that makes this resource so valuable. Please use <a href="#contribute" className="font-medium text-accent underline underline-offset-4">Feedback</a> to flag any missing credit or references so we can add them.</p>
          </div>
          <p><strong className="text-foreground">Updates and limitations.</strong> We aim to review and update Neuro Atlas daily. Source publication, observation, and check dates vary by record. OpenAlex publication and citation feeds and Google Trends are refreshed on a weekly schedule when validated data is available. See the <a className="font-medium text-accent underline underline-offset-4" href="#data-disclaimer">data and errors disclaimer</a> for limitations and how to use the data.</p>
        </div>
      </section>
      <section id="source-directory" aria-labelledby="directory-heading" className="mb-8 scroll-mt-4">
        <h2 id="directory-heading" className="mb-2 text-base font-semibold">Source directory</h2>
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted">Open a category to see source links, including retained research and methodology references. Each record or chart’s own citations show which evidence supports that observation.</p>
        <div className="card divide-y divide-border">
          {(Object.keys(SOURCE_GROUPS) as (keyof typeof sourceCatalog)[]).map((key) => {
            const { title, description } = SOURCE_GROUPS[key];
            const entries = sourceCatalog[key];
            return (
              <details id={`sources-${key}`} key={key} name="methodology-source-group" className="scroll-mt-4">
                <summary className="cursor-pointer p-4 text-sm font-semibold marker:text-muted hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
                  {title} <span className="ml-1 font-normal text-muted">({entries.length} links)</span>
                  <span className="mt-1 block max-w-3xl font-normal leading-relaxed text-muted">{description}</span>
                  <SourceBrandStrip group={key} />
                </summary>
                <div className="px-4 pb-4">
                  <ul className="grid gap-x-6 gap-y-3 border-t border-border pt-3 text-sm leading-relaxed sm:grid-cols-2">
                    {entries.map(([url, label]) => {
                      const brand = sourceBrandForUrl(url);
                      const contexts = sourceContextsForUrl(url);
                      const context = contexts[0];
                      return (
                        <li key={url} className="min-w-0">
                          <a data-source-link href={url} className="flex items-start gap-2 text-foreground underline decoration-border-strong underline-offset-4 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                            <SourceLinkMark brand={brand} />
                            <span className="min-w-0 wrap-anywhere">{label}</span>
                          </a>
                          {context && (
                            <div className={`${brand?.wordmark ? "ml-16" : "ml-9"} mt-0.5 flex flex-wrap items-center gap-x-2 text-xs leading-5 text-muted`}>
                              <a data-source-context href={atlasPath(context.href)} aria-label={`See in context: ${context.label}`} title={context.label} className="underline decoration-border-strong underline-offset-4 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">See in context</a>
                              {contexts.length > 1 && <span data-source-context-more title={contexts.slice(1).map(item => item.label).join("; ")}>+ {contexts.length - 1} more</span>}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section id="contribute" aria-labelledby="contribute-heading" className="mb-8 scroll-mt-4">
        <h2 id="contribute-heading" className="mb-3 text-base font-semibold">Contribute</h2>
        <div className="card p-5">
          <p className="max-w-3xl text-sm leading-relaxed text-muted">
            We welcome corrections, new sources, and code improvements from the community. Fork Neuro Atlas and open a pull request on GitHub; contributions are reviewed before they are merged. Or use Feedback without a GitHub account to select the part of the page you’re commenting on and include a source link and date if available.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <FeedbackTrigger className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" />
            <a href="https://github.com/protocol/neuro-atlas/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Contribute on GitHub ↗</a>
            <a href="https://github.com/protocol/neuro-atlas/pulls" target="_blank" rel="noreferrer" className="text-sm text-muted underline underline-offset-4 hover:text-foreground">View existing pull requests ↗</a>
          </div>
        </div>
      </section>

    </>
  );
}
