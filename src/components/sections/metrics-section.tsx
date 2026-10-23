"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { DRAFT_CHART_LINKS, canonicalMetricAnchor } from "@/data/draft-chart-links";
import { usePerformanceHash, revealDraftTarget } from "@/lib/field-velocity/navigation";
import { DRAFT_CHARTS, DRAFT_CHART_CATEGORIES } from "@/data/draft-charts";
import { METRIC_CHART_EVIDENCE as DRAFT_CHART_EVIDENCE, METRIC_CHART_CATEGORIES, RETIRED_METRIC_PLOT_IDS, isVisibleMetric, metricCategoryFor } from "@/data/metric-chart-visibility";
import { DraftChartsSection } from "./draft-charts-section";
import { VelocityInstrumentsSection } from "./velocity-instruments-section";
import SNAPSHOT from "@/data/field-velocity/neurotech.snapshot.json";
import TRENDS from "../../../public/data/google-trends/google-trends.json";

// Search retained views by their source metadata as well as their visible titles.
const supplementaryText = [
  JSON.stringify(SNAPSHOT.measurementSeries.filter(series => series.id === "tissue-mapped")),
  "", "",
  JSON.stringify([SNAPSHOT.measurementSeries.filter(series => series.id === "neural-recording-hours"), SNAPSHOT.records.filter(row => row.instrument === "performance_curves"), "Simultaneously recorded neurons"]),
  "", "",
  JSON.stringify([SNAPSHOT.records.filter(row => row.state === "reading" && ["idea_vintage", "latency_compression", "revealed_commitments"].includes(row.instrument)), TRENDS, "Idea vintage Latency compression Google Trends Public attention Revealed commitments"]),
].map(text => text.toLocaleLowerCase());

const summaries = [
  "Mapped tissue, connectome size and acquisition throughput.",
  "Reconstruction quality and proofreading effort.",
  "",
  "Implanted interfaces, recording capability and neural data supply.",
  "Paired structure–function datasets and open data.",
  "Model fidelity, NeuroAI and demonstrated applications.",
  "Pace, public attention and revealed commitments.",
];
export type MetricReferences = { mapping: React.ReactNode; recording: React.ReactNode };
export function MetricsSection({ performance, references }: { performance: React.ReactNode; references?: MetricReferences }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const pendingReveal = useRef<string | null>(null);
  const cancelReveal = useRef<(() => void) | undefined>(undefined);
  const hash = usePerformanceHash();
  useLayoutEffect(() => {
    const reveal = () => {
      const anchor = hash.slice(1);
      pendingReveal.current = anchor;
      const legacy = anchor.replace(/^metric-/, "draft-");
      const link = DRAFT_CHART_LINKS.find(link => link.id === legacy || link.panels.some(panel => panel.id === legacy));
      const candidate = DRAFT_CHARTS.find(chart => chart.title === link?.title);
      const card = [...document.querySelectorAll<HTMLElement>("[data-performance-card], [data-trends-card]")].find(card => card.dataset.performanceCard === anchor || `google-trends-${card.dataset.trendsCard}` === anchor);
      const parent = (card ?? document.getElementById(anchor))?.closest('[id^="metric-category-"]');
      const category = (candidate ? metricCategoryFor(candidate) : undefined) ?? (parent ? [...DRAFT_CHART_CATEGORIES, "Field context"][Number(parent.id.split('-').at(-1))] : undefined);
      if (category) { setQuery(""); setExpanded(previous => new Set(previous).add(category)); }
    };
    reveal();
    window.addEventListener("atlas-metric-reveal", reveal);
    return () => {
      window.removeEventListener("atlas-metric-reveal", reveal);
      cancelReveal.current?.();
      cancelReveal.current = undefined;
    };
  }, [hash]);
  useLayoutEffect(() => {
    const anchor = pendingReveal.current;
    const target = anchor ? document.getElementById(anchor) : null;
    if (!anchor || !target || target.closest("[hidden]")) return;
    // A navigation intent survives category revelation, not later browsing actions.
    pendingReveal.current = null;
    cancelReveal.current?.();
    cancelReveal.current = revealDraftTarget(anchor);
  }, [hash, expanded, query]);
  const term = query.trim().toLocaleLowerCase();
  const matches = DRAFT_CHARTS.filter(chart => isVisibleMetric(chart) && JSON.stringify([chart, DRAFT_CHART_EVIDENCE[chart.title]]).toLocaleLowerCase().includes(term));
  const categories = [...METRIC_CHART_CATEGORIES, "Field context"];
  const supplementaryMatch = (index: number) => !!supplementaryText[index] && supplementaryText[index].includes(term);
  const categoryMatch = (category: string, index: number) => matches.some(chart => chart.category === category) || supplementaryMatch(index);
  const matchingCategories = categories.filter(category => categoryMatch(category, [...DRAFT_CHART_CATEGORIES, "Field context"].indexOf(category))).length;
  return <section className="metrics-index" aria-label="Metrics catalog">
    <p className="pc-intro">Browse measurements by category, or search for a metric, species or dataset.</p>
    <div className="metrics-tools">
      <label htmlFor="metrics-search">Search metrics, panels, species or datasets</label>
      <input id="metrics-search" type="search" value={query} onInput={event => setQuery(event.currentTarget.value)} placeholder="Try H01, mouse, recording hours…" />
      <button type="button" data-clear-metrics onClick={() => setQuery("")}>Clear search</button>
      <button type="button" data-expand-metrics onClick={() => { setQuery(""); setExpanded(new Set(categories)); }}>Expand all</button>
      <button type="button" data-collapse-metrics onClick={() => { setQuery(""); setExpanded(new Set()); }}>Collapse all</button>
    </div>
    <p role="status">{term ? matchingCategories ? `${matchingCategories} matching categories · matching curated metrics and reference/context groups shown. Clear search to toggle categories.` : "No metrics match. Try a different title, species or dataset, or clear search." : `${METRIC_CHART_CATEGORIES.length} scientific categories · Field context`}</p>
    {[...DRAFT_CHART_CATEGORIES, "Field context"].map((category, index) => {
      if (!categories.includes(category)) return null;
      const charts = DRAFT_CHARTS.filter(chart => chart.category === category && isVisibleMetric(chart));
      const count = charts.reduce((sum, chart) => sum + DRAFT_CHART_EVIDENCE[chart.title].plots.length, 0);
      const timelines = charts.filter(chart => DRAFT_CHART_EVIDENCE[chart.title].timeline).length;
      const retiredAnchors = DRAFT_CHARTS.filter(chart => metricCategoryFor(chart) === category).flatMap(chart => {
        const link = DRAFT_CHART_LINKS.find(link => link.title === chart.title)!;
        const ids = isVisibleMetric(chart)
          ? link.panels.filter(panel => panel.plotId !== null && RETIRED_METRIC_PLOT_IDS.has(panel.plotId)).map(panel => panel.id)
          : [link.id, ...link.panels.map(panel => panel.id)];
        return ids.flatMap(id => [id, canonicalMetricAnchor(id)]);
      });
      const matched = categoryMatch(category, index);
      const open = term ? matched : expanded.has(category);
      return <section key={category} className="metric-category card" data-metrics-category={category} hidden={!!term && !matched}>
        {retiredAnchors.map(id => <span key={id} id={id} className="metric-anchor" data-retired-metric-anchor aria-hidden="true" />)}
        <h2><button type="button" disabled={!!term} id={`metric-category-${index}-toggle`} data-metric-toggle={category} aria-expanded={open} aria-controls={`metric-category-${index}`} onClick={() => setExpanded(previous => { const next = new Set(previous); if (next.has(category)) next.delete(category); else next.add(category); return next; })}>
          <span aria-hidden="true">{open ? "−" : "+"}</span><span className="metric-category-name">{category}</span>
          {charts.length > 0 && <small>{count} {count === 1 ? "chart" : "charts"}{timelines > 0 ? ` · ${timelines} timeline` : ""}{index === 0 && references ? " · 1 reference view" : index === 3 && references ? " · 2 reference views" : ""}</small>}
          {index === 6 && <small>Pace · attention · commitments</small>}
        </button></h2>
        <p className="metric-category-summary">{summaries[index]}</p>
        <div id={`metric-category-${index}`} hidden={!open} aria-labelledby={`metric-category-${index}-toggle`}>
          {category === "Field context" ? <VelocityInstrumentsSection performance={performance} /> : <DraftChartsSection category={category} query={term} showGaps={false} />}
          {index === 0 && <div hidden={!!term && !supplementaryMatch(index)}>{references?.mapping}</div>}
          {index === 3 && <div hidden={!!term && !supplementaryMatch(index)}>{references?.recording}</div>}
        </div>
      </section>;
    })}
  </section>;
}
