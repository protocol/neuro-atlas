import type { Metadata } from "next";
import { PlateHero } from "@/components/plate-header";
import { StarterPrompt } from "@/components/ai-starter-prompt";
import { catalog, USAGE, RULES } from "@/lib/ai/markdown";
import { queryContract } from "@/lib/ai/query";
import { NEUROFOUNDERS_MAP_URL } from "@/lib/ecosystem";

export const metadata: Metadata = {
  title: "Use with AI — Neuro Atlas",
  description: "Readable context, source-linked Markdown downloads and deterministic read-only queries for the Neuro Atlas datasets.",
};
const link = "inline-flex min-h-11 items-center rounded-sm py-2 text-sm text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

export default function AiPage() {
  return (
    <>
      <PlateHero kicker="Take the context with you" title="Use the Atlas with AI" description="Ask your own agent to explore the evidence, or download the context for a prompt. No chatbot, model account or new dataset: the same sources, in a simpler format." status="live" meta={["Read-only", `Schema v${catalog.schemaVersion}`]} stats={[{ value: String(catalog.sections.length), label: "context sections" }, { value: String(catalog.records.length), label: "exported records" }]} />
      <div className="mt-8 max-w-5xl space-y-8">
        <section aria-labelledby="ai-start">
          <h2 id="ai-start" className="mb-3 text-lg font-semibold tracking-tight">Start with the index</h2>
          <p className="max-w-3xl text-sm leading-7 text-muted">Point your agent at <a href="/llms.txt" className="text-accent underline underline-offset-4">/llms.txt</a>. It lists the smaller sections and the JSON query endpoint. For a tool without web access, download the relevant Markdown and attach or paste it yourself. The full export can be too large for a single prompt; a section is usually a better starting point.</p>
          <div className="mt-3 flex flex-wrap gap-x-6">
            <a href="/llms-full.txt?download=1" download="neuro-atlas-full.md" className={link}>Download full context (.md)</a>
            <a href="/llms-full.txt" className={link}>Read full context</a>
          </div>
          <p className="mt-2 rounded-lg border border-border bg-background p-4 text-xs leading-6 text-muted">Access remains gated. The existing site authentication applies to these routes too. An agent without access will get 401; llms.txt does not bypass the gate. Never paste credentials into a prompt or a link.</p>
        </section>

        <section aria-label="Copy an agent starter prompt"><StarterPrompt /></section>

        <section aria-labelledby="ai-sections">
          <h2 id="ai-sections" className="mb-3 text-lg font-semibold tracking-tight">Choose the evidence you need</h2>
          <div className="card divide-y divide-border">
            {catalog.sections.map(section => (
              <article key={section.id} className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  <span className="text-xs text-muted">{catalog.records.filter(r => r.section === section.id).length} records</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-muted">{section.coverage}</p>
                <div className="mt-1 flex flex-wrap gap-x-5">
                  <a href={section.markdownUrl} className={link}>Read section</a>
                  <a href={`${section.markdownUrl}?download=1`} download={`neuro-atlas-${section.id}.md`} className={link}>Download .md<span className="sr-only">: {section.title}</span></a>
                  <a href={section.canonicalUrl} className={link}>Explore in Atlas<span className="sr-only">: {section.title}</span></a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="ai-query">
          <h2 id="ai-query" className="mb-3 text-lg font-semibold tracking-tight">Filter with the read-only JSON query</h2>
          <p className="text-sm leading-7 text-muted">Plain HTTP GET at <a href="/api/ai/query" className="text-accent underline underline-offset-4">/api/ai/query</a>. Every response includes schemaVersion, canonical and source URLs, section coverage and source-relative dates. This filters records; it does not answer a natural-language question for you.</p>
          <div className="mt-3 flex flex-col items-start">
            <a href="/api/ai/query?type=round&q=neuralink&limit=10" className={`${link} max-w-full break-all`}>Rounds mentioning “neuralink” (including source URLs)</a>
            <a href="/api/ai/query?type=event&scope=broader&year=2026" className={link}>Broader-neuro events in 2026</a>
            <a href="/api/ai/query?section=performance" className={link}>Performance datasets with units and provenance</a>
          </div>
          <dl className="card mt-4 divide-y divide-border text-xs leading-6">
            {Object.entries(queryContract.parameters).map(([name, description]) => (
              <div key={name} className="grid min-w-0 gap-1 p-4 sm:grid-cols-[5rem_1fr] sm:gap-4">
                <dt className="font-mono font-semibold">{name}</dt>
                <dd className="min-w-0 break-words text-muted">{Array.isArray(description) ? description.join(", ") : description}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-6 text-muted">{queryContract.semantics}</p>
          <p className="mt-2 text-xs leading-6 text-muted">Follow next until it is null. total is the count after filtering, not the size of the neurotechnology field. Record IDs and Markdown links come with each result. Numeric and string values retain their source precision; null means unspecified, not zero.</p>
        </section>

        <section aria-labelledby="ai-limits" className="border-t border-border pt-6">
          <h2 id="ai-limits" className="mb-3 text-lg font-semibold tracking-tight">Read the limits with the numbers</h2>
          <p className="text-sm leading-7 text-muted">{RULES}</p>
          <p className="mt-3 text-xs leading-6 text-muted">{USAGE}</p>
          <p className="mt-3 text-xs leading-6 text-muted">Not exported: the removed Neurofounders directory, non-displayed provider snapshot material, internal notes, operational endpoints or placeholder chart values. The ecosystem remains a link to the <a href={NEUROFOUNDERS_MAP_URL} className="text-accent underline underline-offset-4">original Neurofounders map</a>, not a copied dataset. See <a href="/methodology" className="text-accent underline underline-offset-4">Methodology</a> for the source framework.</p>
        </section>
      </div>
    </>
  );
}
