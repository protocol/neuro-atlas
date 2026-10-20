"use client";

import { useLayoutEffect, useState } from "react";
import { DRAFT_CHART_LINKS } from "@/data/draft-chart-links";
import { usePerformanceHash, revealDraftTarget } from "@/lib/field-velocity/navigation";
import { DRAFT_CHARTS, DRAFT_CHART_CATEGORIES } from "@/data/draft-charts";
import { DRAFT_CHART_EVIDENCE } from "@/data/draft-chart-observations";
import { DraftChartsSection } from "./draft-charts-section";
import { VelocityInstrumentsSection } from "./velocity-instruments-section";
import SNAPSHOT from "@/data/field-velocity/neurotech.snapshot.json";
import RECORDS from "@/data/velocity/neurotech_records.json";
import TRENDS from "../../../public/data/google-trends/google-trends.json";

// Search retained views by their source metadata as well as their visible titles.
const supplementaryText = [
  JSON.stringify(SNAPSHOT.measurementSeries.filter(series => series.id === "tissue-mapped")),
  "", "",
  JSON.stringify([SNAPSHOT.measurementSeries.filter(series => series.id === "neural-recording-hours"), SNAPSHOT.records.filter(row => row.instrument === "performance_curves"), "Simultaneously recorded neurons Channel count frontier"]),
  "", "",
  JSON.stringify([SNAPSHOT.records.filter(row => ["idea_vintage", "latency_compression"].includes(row.instrument)), RECORDS, TRENDS, "Idea vintage Latency compression Google Trends Public attention Revealed commitments Markets"]),
].map(text => text.toLocaleLowerCase());

const summaries = [
  "Mapped tissue, connectome size and acquisition throughput.",
  "Mapping economics, reconstruction quality and proofreading effort.",
  "Preservation, sectioning loss and validated molecular labels.",
  "Implanted interfaces, recording capability and neural data supply.",
  "Paired datasets, comparative cohorts, open data and reuse.",
  "Model fidelity, simulation counts, NeuroAI and demonstrated applications.",
  "Pace, attention, commitments and markets — context, not scientific benchmarks.",
];
export type MetricReferences = { mapping: React.ReactNode; recording: React.ReactNode };
export function MetricsSection({ performance, references }: { performance: React.ReactNode; references?: MetricReferences }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const hash = usePerformanceHash();
  useLayoutEffect(() => {
    const reveal = () => {
      const anchor = hash.slice(1);
      const legacy = anchor.replace(/^metric-/, "draft-");
      const link = DRAFT_CHART_LINKS.find(link => link.id === legacy || link.panels.some(panel => panel.id === legacy));
      const candidate = DRAFT_CHARTS.find(chart => chart.title === link?.title);
      const card = [...document.querySelectorAll<HTMLElement>("[data-performance-card], [data-trends-card]")].find(card => card.dataset.performanceCard === anchor || `google-trends-${card.dataset.trendsCard}` === anchor);
      const parent = card?.closest('[id^="metric-category-"]');
      const category = candidate?.category ?? (parent ? [...DRAFT_CHART_CATEGORIES, "Field context"][Number(parent.id.split('-').at(-1))] : undefined);
      if (category) { setQuery(""); setExpanded(previous => new Set(previous).add(category)); }
    };
    reveal();
    window.addEventListener("atlas-metric-reveal", reveal);
    return () => window.removeEventListener("atlas-metric-reveal", reveal);
  }, [hash]);
  useLayoutEffect(() => revealDraftTarget(hash.slice(1)), [hash, expanded, query]);
  const term = query.trim().toLocaleLowerCase();
  const matches = DRAFT_CHARTS.filter(chart => JSON.stringify([chart, DRAFT_CHART_EVIDENCE[chart.title]]).toLocaleLowerCase().includes(term));
  const categories = [...DRAFT_CHART_CATEGORIES, "Field context"];
  const supplementaryMatch = (index: number) => !!supplementaryText[index] && supplementaryText[index].includes(term);
  const categoryMatch = (category: string, index: number) => matches.some(chart => chart.category === category) || supplementaryMatch(index);
  const matchingCategories = categories.filter(categoryMatch).length;
  return <section className="metrics-index" aria-label="Metrics catalog">
    <p className="pc-intro">Explore source-backed measurements by category. Each panel retains its own units, scope and comparability limits; evidence gaps are not inferred measurements.</p>
    <div className="metrics-tools">
      <label htmlFor="metrics-search">Search metrics, panels, species or datasets</label>
      <input id="metrics-search" type="search" value={query} onInput={event => setQuery(event.currentTarget.value)} placeholder="Try H01, mouse, recording hours…" />
      <button type="button" data-clear-metrics onClick={() => setQuery("")}>Clear search</button>
      <button type="button" data-expand-metrics onClick={() => { setQuery(""); setExpanded(new Set(categories)); }}>Expand all</button>
      <button type="button" data-collapse-metrics onClick={() => { setQuery(""); setExpanded(new Set()); }}>Collapse all</button>
    </div>
    <p role="status">{term ? matchingCategories ? `${matchingCategories} matching categories · matching curated metrics and reference/context groups shown. Clear search to toggle categories.` : "No metrics match. Try a different title, species or dataset, or clear search." : "Six scientific categories · Field context"}</p>
    {[...DRAFT_CHART_CATEGORIES, "Field context"].map((category, index) => {
      const charts = DRAFT_CHARTS.filter(chart => chart.category === category);
      const count = charts.reduce((sum, chart) => sum + DRAFT_CHART_EVIDENCE[chart.title].plots.length, 0);
      const timelines = charts.filter(chart => DRAFT_CHART_EVIDENCE[chart.title].timeline).length;
      const gaps = charts.filter(chart => DRAFT_CHART_EVIDENCE[chart.title].status !== "plotted").length;
      const matched = categoryMatch(category, index);
      const open = term ? matched : expanded.has(category);
      return <section key={category} className="metric-category card" data-metrics-category={category} hidden={!!term && !matched}>
        <h2><button type="button" disabled={!!term} id={`metric-category-${index}-toggle`} data-metric-toggle={category} aria-expanded={open} aria-controls={`metric-category-${index}`} onClick={() => setExpanded(previous => { const next = new Set(previous); if (next.has(category)) next.delete(category); else next.add(category); return next; })}>
          <span aria-hidden="true">{open ? "−" : "+"}</span> {category}
          {charts.length > 0 && <small>{count} numeric panels{timelines > 0 ? ` · ${timelines} timeline` : ""} · {gaps} evidence gaps{index === 0 && references ? " · 1 reference view" : index === 3 && references ? " · 2 reference views + channel placeholder" : ""}</small>}
          {index === 6 && <small>Pace · attention · commitments · markets</small>}
        </button></h2>
        <p className="metric-category-summary">{summaries[index]}</p>
        <div id={`metric-category-${index}`} hidden={!open} aria-labelledby={`metric-category-${index}-toggle`}>
          {category === "Field context" ? <VelocityInstrumentsSection performance={performance} /> : <DraftChartsSection category={category} query={term} />}
          {index === 0 && <div hidden={!!term && !supplementaryMatch(index)}>{references?.mapping}</div>}
          {index === 3 && <div hidden={!!term && !supplementaryMatch(index)}>{references?.recording}</div>}
        </div>
      </section>;
    })}
  </section>;
}
