import { createHash } from "node:crypto";
import funding from "@/data/funding-index.json";
import milestones from "@/data/milestones.json";
import capital from "@/data/capital.json";
import snapshot from "@/data/field-velocity/neurotech.snapshot.json";
import provenance from "@/data/field-velocity/neurotech.snapshot.json.provenance.json";
import instruments from "@/data/velocity/instruments.json";
import legacy from "@/data/velocity/neurotech_records.json";
import hypotheses from "@/data/velocity/neurotech_inflection_points.json";
import markets from "@/data/velocity/neurotech_market_signals.json";
import glossary from "@/data/acronyms.json";
import { parseFeed } from "@/lib/field-velocity/schema";
import { selectPerformance, selectPace } from "@/lib/field-velocity/performance";
import { visible, hasHiddenConstituent, publicFields, publicDefinition, publicMethodology, publicRecord } from "./public-data";

export type JsonObject = Record<string, unknown>;
export type ContextRecord = {
  id: string;
  section: string;
  type: string;
  title: string;
  canonicalUrl: string;
  markdownUrl: string;
  sourceUrls: string[];
  unit: string | null;
  evidence: string;
  coverage: string;
  dates: JsonObject;
  data: JsonObject;
};
export type ContextSection = {
  id: string;
  title: string;
  canonicalUrl: string;
  markdownUrl: string;
  coverage: string;
  dates: JsonObject;
  metadata: JsonObject;
};
export const SCHEMA_VERSION = 1;
export const atlasSources = { funding, milestones, capital, snapshot, provenance, instruments, legacy, hypotheses, markets, glossary };
export type AtlasSources = typeof atlasSources;

function key(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function identity(type: string, parts: unknown[]): string {
  return `${type}-${createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 20)}`;
}
function record(section: ContextSection, type: string, id: string, title: string, data: JsonObject,
  options: Partial<Pick<ContextRecord, "sourceUrls" | "unit" | "evidence" | "dates" | "coverage">> = {}): ContextRecord {
  return {
    id, section: section.id, type, title, canonicalUrl: section.canonicalUrl,
    markdownUrl: `/ai/records/${id}.md`, sourceUrls: [], unit: null,
    evidence: "observation", coverage: section.coverage, dates: section.dates, data, ...options,
  };
}
export function buildCatalog(sources: AtlasSources = atlasSources) {
  const f = sources.funding;
  const fundingSection: ContextSection = {
    id: "funding", title: "BCI Funding Index", canonicalUrl: "/funding", markdownUrl: "/ai/sections/funding.md",
    coverage: "Screened BCI index, not a census. Sourced amount raised, not valuation or market cap. Publicly disclosed indexed rounds, not exhaustive funding-to-date. Investor associated capital is the full value of rounds with participation, not that investor’s check size; never sum across investors.",
    dates: { asOf: f.summary.asOf, meaning: "Source review cutoff, not a live update." },
    metadata: { summary: publicFields(f.summary, "excludedBelowThreshold selectedCompanies indexedRounds regulatoryMilestones observedCapitalUsdM firstYear lastYear asOf"), methodology: publicFields(f.methodology, "thresholdUsdM scope coverage") },
  };
  const records: ContextRecord[] = [];
  for (const c of f.companies) records.push(record(fundingSection, "company", `company-${c.slug}`, c.name, c, { sourceUrls: c.website ? [c.website] : [], evidence: "reference" }));
  const names = new Map(f.companies.map(c => [c.slug, c.name]));
  for (const r of f.rounds) records.push(record(fundingSection, "round", identity("round", [r.companySlug, r.announcedOn, r.stage, r.sourceUrl]), `${names.get(r.companySlug)} — ${r.stage} — ${r.announcedOn}`, r, {
    sourceUrls: [r.sourceUrl], unit: "USD millions", dates: { dataDate: r.announcedOn, datePrecision: r.datePrecision, dateBasis: "announcement", asOf: f.summary.asOf },
  }));
  for (const m of f.milestones) records.push(record(fundingSection, "regulatory", identity("regulatory", [m.companySlug, m.announcedOn, m.marker, m.sourceUrl]), `${names.get(m.companySlug)} — ${m.marker} — ${m.announcedOn}`, m, {
    sourceUrls: [m.sourceUrl], dates: { dataDate: m.announcedOn, datePrecision: m.datePrecision, dateBasis: "announcement", asOf: f.summary.asOf },
  }));
  for (const i of f.investors) records.push(record(fundingSection, "investor", `investor-${key(i.name)}`, i.name, i, { evidence: "derived", unit: "associated round capital: USD millions; roundCount and companyCount: counts", sourceUrls: [...new Set(f.rounds.filter(r => r.investors.includes(i.name)).map(r => r.sourceUrl))] }));
  const timeline: ContextSection = {
    id: "milestones", title: "Neuro-wide milestone timeline", canonicalUrl: "/milestones", markdownUrl: "/ai/sections/milestones.md",
    coverage: "Selected BCI and broader neurotechnology events, not a census. Overlaps the Funding Index but also includes partnerships, clinical and commercial events outside its screen. Timeline amountUsdM is event-specific: acquisition enterprise value is not a financing round. Notes retain conditional proceeds, philanthropic commitments, conversions and rounding. Do not sum this lane with the sourced rounds or treat announced agreements as completed transactions.",
    dates: { first: sources.milestones.filter(visible).map(m => m.date).filter(Boolean).sort().at(0) ?? null, last: sources.milestones.filter(visible).map(m => m.date).filter(Boolean).sort().at(-1) ?? null, meaning: "Source announcement dates with per-event precision; an unknown date remains null, not today." },
    metadata: { attribution: "Q1+ 2026 BCI Market Memo — Neurotech Futures & PL Neuro, enriched with primary sources; 2024–2025 regulatory digests and Funding Index reconciliation." },
  };
  for (const m of sources.milestones) records.push(record(timeline, "event", identity("event", [m.slug, m.date, m.stage, m.sourceUrl]), `${m.company} — ${m.activity} — ${m.date ?? "date TBD"}`, m, {
    sourceUrls: m.sourceUrl ? [m.sourceUrl] : [], unit: m.amountUsdM == null ? null : "USD millions (event-specific; see note)",
    dates: { dataDate: m.date, datePrecision: m.datePrecision, dateBasis: "announcement" },
  }));
  const memo: ContextSection = {
    id: "memo-capital", title: "Memo capital comparison", canonicalUrl: "/milestones", markdownUrl: "/ai/sections/memo-capital.md",
    coverage: "Memo chart comparison series, separate from sourced rounds and not recomputed from timeline events. 2024 and 2025 are full-year comparison bases; 2026 is January–April only. Do not annualize, combine with round totals, or interpret these bars as valuations.",
    dates: { window: "2024–2026; 2026 January–April only", asOf: null },
    metadata: { attribution: "Q1+ 2026 BCI Market Memo — Neurotech Futures & PL Neuro", sourceUrl: "https://neurotechnology.substack.com/p/representations2" },
  };
  for (const c of sources.capital) records.push(record(memo, "memo-capital", `memo-capital-${c.year}`, `${c.year} memo capital`, c, {
    sourceUrls: [String(memo.metadata.sourceUrl)], unit: "USD millions", dates: { year: c.year, window: c.note },
  }));
  const feed = parseFeed(sources.snapshot);
  const performance = selectPerformance(feed);
  const pace = selectPace(feed);
  const snapshotMeta = {
    providerCommit: sources.provenance.providerCommit, sha256: sources.provenance.sha256,
    exportGeneratedAt: sources.provenance.exportGeneratedAt, mode: sources.provenance.mode,
    dateMeaning: "Export packaging time, not an observation date or a live refresh.",
  };
  const perf: ContextSection = {
    id: "performance", title: "Performance and data supply", canonicalUrl: "/field-velocity", markdownUrl: "/ai/sections/performance.md",
    coverage: "Selected source observations, not a live feed or a global growth rate. Tissue volume bases and species are not interchangeable. Data-hours are a resource stock, not hours times channels; overlapping corpora must not be summed. Preserve track definitions, qualifiers, access restrictions, date basis and precision. No extrapolated points are exported. Channel count frontier is an unwired UI placeholder, not a dataset. The provider’s adoption series is not displayed in Atlas and is excluded.",
    dates: { asOf: null, meaning: "Per-reading measuredAt, checkedAt, and per-point data dates below; no universal data cutoff." },
    metadata: { snapshot: snapshotMeta, definition: publicDefinition(performance.definition), methodology: publicMethodology(performance.methodology) },
  };
  for (const m of performance.measurements) records.push(record(perf, "measurement", `measurement-${m.id}`, m.title, m, {
    unit: m.unit, coverage: `${perf.coverage} ${m.coverage} ${m.caveat}`,
    sourceUrls: [...new Set(m.tracks.flatMap(t => t.points.map(p => p.sourceUrl)))], dates: { checkedAt: m.checkedAt, meaning: "Review date, not the observation date. Each point retains its own date basis and precision." },
  }));
  const velocity: ContextSection = {
    id: "velocity", title: "Pace and commitments", canonicalUrl: "/field-velocity", markdownUrl: "/ai/sections/velocity.md",
    coverage: "Shared Idea vintage and Latency compression readings, with earlier Atlas commitments and markets extracts kept separate. Idea-vintage reliable=false points are incomplete, not confirmed declines. Latency uses four modalities, not a field-wide census. The older commitments record mixes a historical count and a 10,000-by-2030 aspirational milestone: the milestone is a hypothesis, not an observation or a fitted projection. Preserve its source-relative cutoff and cohort caveats; cumulative recipients are not an active installed base. Unwired means unavailable, not zero.",
    dates: perf.dates,
    metadata: { snapshot: snapshotMeta, definitions: pace.definitions.filter(visible).map(publicDefinition), methodology: publicMethodology(pace.methodology), legacyDefinitions: sources.instruments.instruments.filter(i => ["revealed_commitments", "markets"].includes(i.id)).filter(visible).map(publicDefinition) },
  };
  for (const r of [performance.record, ...pace.records]) {
    const section = r.instrument === "performance_curves" ? perf : velocity;
    records.push(record(section, "reading", `reading-${key(r.instrument)}`, r.metric ?? r.candidateMetric ?? r.instrument, r, {
      unit: r.instrument === "performance_curves" ? "neurons" : "years", evidence: r.state === "reading" ? "observation" : r.state,
      dates: { measuredAt: r.measuredAt ?? null, checkedAt: r.checkedAt ?? null, window: r.window ?? null, meaning: "Series x is the source year. measuredAt is the source observation cutoff; checkedAt is review, not a fresh observation." },
      sourceUrls: r.sources?.map(s => s.url) ?? [],
    }));
  }
  for (const r of sources.legacy.records.filter(r => ["revealed_commitments", "markets"].includes(r.instrument))) {
    const data = Object.fromEntries(Object.entries(r).filter(([k]) => k !== "upstreamTodo"));
    records.push(record(velocity, "legacy-reading", `legacy-${key(r.instrument)}`, r.metric ?? r.candidateMetric ?? r.instrument, data, {
      unit: r.instrument === "revealed_commitments" ? "participants (historical count); future milestone is not observed" : null,
      evidence: r.state === "reading" ? "mixed" : "unwired", sourceUrls: r.sources?.map(s => s.url) ?? [],
      dates: { measuredAt: r.measuredAt ?? null, checkedAt: r.checkedAt ?? null, window: r.window ?? null },
    }));
  }
  const expectations: ContextSection = {
    id: "expectations", title: "Hypotheses and forecast mappings", canonicalUrl: "/field-velocity", markdownUrl: "/ai/sections/expectations.md",
    coverage: "Inflection points are hypotheses, not achieved milestones or observed outcomes. Market questions are proxy mappings, not live probabilities or endorsements. Market pricing and term-structure aggregation are unwired in the Atlas UI. A valuation question is not a financing observation. No simulated or extrapolated series.",
    dates: { asOf: null, meaning: "Undated mappings; no live price retrieval." }, metadata: { explainer: publicDefinition(sources.instruments.inflectionExplainer) },
  };
  for (const h of sources.hypotheses.points) records.push(record(expectations, "hypothesis", `hypothesis-${key(h.title)}`, h.title, h, { evidence: "hypothesis" }));
  for (const m of sources.markets.mappings) records.push(record(expectations, "market-mapping", `market-${key(m.title)}`, m.title, m, { evidence: "forecast-mapping", sourceUrls: [m.primary?.url, m.fallback?.url].filter((u): u is string => Boolean(u)) }));
  const terms: ContextSection = {
    id: "glossary", title: "Acronyms and regulatory terms", canonicalUrl: "/methodology", markdownUrl: "/ai/sections/glossary.md",
    coverage: "The UI tooltip glossary. A BDD or IDE is not a commercial marketing approval. Inclusion and regulatory markers do not imply endorsement.", dates: { asOf: null }, metadata: {},
  };
  for (const [term, definition] of Object.entries(sources.glossary)) records.push(record(terms, "glossary", identity("glossary", [term]), term, definition, { evidence: "reference" }));
  const publicCompanies = new Set(f.companies.filter(visible).map(c => c.slug));
  const fundingHasHidden = [...f.companies, ...f.rounds, ...f.milestones, ...f.investors].some(r => !visible(r));
  // Aggregate values cannot safely outlive a hidden constituent.
  if (fundingHasHidden) fundingSection.metadata.summary = { withheld: "Source contains non-public constituents; aggregate omitted." };
  const publicRecords = records.filter(r => visible(r.data))
    .filter(r => !["reading", "legacy-reading", "measurement"].includes(r.type) || !hasHiddenConstituent(r.data))
    .filter(r => !["round", "regulatory"].includes(r.type) || publicCompanies.has(String(r.data.companySlug)))
    .filter(r => r.type !== "investor" || !fundingHasHidden).map(publicRecord);
  if (new Set(publicRecords.map(r => r.id)).size !== publicRecords.length) throw new Error("Duplicate context record identity");
  return { schemaVersion: SCHEMA_VERSION, sections: [fundingSection, timeline, memo, perf, velocity, expectations, terms], records: publicRecords };
}
