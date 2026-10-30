"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { DRAFT_CHART_LINKS, canonicalMetricAnchor } from "@/data/draft-chart-links";
import { usePerformanceHash, revealDraftTarget } from "@/lib/field-velocity/navigation";
import { METRIC_CHARTS, METRIC_CHART_EVIDENCE, METRIC_GROUPS, RETIRED_METRIC_PLOT_IDS, isVisibleMetric, metricCategoryFor } from "@/data/metric-chart-visibility";
import { DraftChartsSection } from "./draft-charts-section";
import { VelocityInstrumentsSection } from "./velocity-instruments-section";
import SNAPSHOT from "@/data/field-velocity/neurotech.snapshot.json";
import TRENDS from "../../../public/data/google-trends/google-trends.json";

const neuronText = JSON.stringify([SNAPSHOT.records.filter(row => row.instrument === "performance_curves"), "Simultaneously recorded neurons"]).toLocaleLowerCase();
const engagementPreviewText = JSON.stringify([TRENDS.groups.filter(group => group.id === "neurotech"), "Google Trends Public attention"]).toLocaleLowerCase();
const engagementMoreText = JSON.stringify([SNAPSHOT.records.filter(row => row.state === "reading" && ["idea_vintage", "latency_compression", "revealed_commitments"].includes(row.instrument)), TRENDS.groups.filter(group => group.id === "neuralink"), "Idea vintage Latency compression Google Trends Public attention Revealed commitments"]).toLocaleLowerCase();

type GroupState = "collapsed" | "preview" | "full";
export type MetricReferences = { recording: React.ReactNode };
export function MetricsSection({ performance, references, engagementPreview }: { performance: React.ReactNode; references?: MetricReferences; engagementPreview?: React.ReactNode }) {
  const [states, setStates] = useState<Record<string, GroupState>>({});
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
      const target = document.getElementById(anchor);
      const sourceTitle = link?.title ?? target?.closest<HTMLElement>("[data-draft-chart-card]")?.dataset.draftChartCard;
      const candidate = METRIC_CHARTS.find(chart => chart.title === sourceTitle);
      const card = [...document.querySelectorAll<HTMLElement>("[data-performance-card], [data-trends-card]")].find(card => card.dataset.performanceCard === anchor || `google-trends-${card.dataset.trendsCard}` === anchor);
      const category = candidate ? metricCategoryFor(candidate) : (card ?? target)?.closest<HTMLElement>("[data-metrics-category]")?.dataset.metricsCategory;
      const group = METRIC_GROUPS.find(group => group.name === category);
      if (group) {
        const desired: GroupState = candidate?.title === group.preview || anchor === "google-trends-neurotech" ? "preview" : "full";
        setQuery("");
        setStates(previous => ({ ...previous, [group.name]: previous[group.name] === "full" ? "full" : desired }));
      }
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
    pendingReveal.current = null;
    cancelReveal.current?.();
    cancelReveal.current = revealDraftTarget(anchor);
  }, [hash, states, query]);
  const term = query.trim().toLocaleLowerCase();
  const matches = METRIC_CHARTS.filter(chart => isVisibleMetric(chart) && JSON.stringify([chart, METRIC_CHART_EVIDENCE[chart.title]]).toLocaleLowerCase().includes(term));
  const supplementalMatch = (id: number) => id === 3 ? neuronText.includes(term) : id === 6 && (engagementPreviewText.includes(term) || engagementMoreText.includes(term));
  const categoryMatch = (group: typeof METRIC_GROUPS[number]) => group.name.toLocaleLowerCase().includes(term) || matches.some(chart => metricCategoryFor(chart) === group.name) || supplementalMatch(group.id);
  const matchingCategories = METRIC_GROUPS.filter(categoryMatch).length;
  const setAll = (state: GroupState) => { setQuery(""); setStates(Object.fromEntries(METRIC_GROUPS.map(group => [group.name, state]))); };
  return <section className="metrics-index" aria-label="Metrics catalog">
    <p className="pc-intro">Open a chart for methodology and downloadable source values.</p>
    <div className="metrics-tools">
      <label htmlFor="metrics-search">Search metrics, panels, species or datasets</label>
      <input id="metrics-search" type="search" value={query} onInput={event => setQuery(event.currentTarget.value)} placeholder="Try H01, mouse, recording hours…" />
      <button type="button" data-clear-metrics onClick={() => setQuery("")}>Clear search</button>
      <button type="button" data-expand-metrics onClick={() => setAll("full")}>Expand all</button>
      <button type="button" data-collapse-metrics onClick={() => setAll("collapsed")}>Collapse all</button>
    </div>
    {term && <p role="status">{matchingCategories ? `${matchingCategories} matching categories · matching metrics and context groups shown. Clear search to toggle groups.` : "No metrics match. Try a different title, species or dataset, or clear search."}</p>}
    {METRIC_GROUPS.map(group => {
      const charts = METRIC_CHARTS.filter(chart => metricCategoryFor(chart) === group.name && isVisibleMetric(chart));
      const count = group.id === 6 ? 4 : charts.reduce((sum, chart) => sum + METRIC_CHART_EVIDENCE[chart.title].plots.length + Number(!!METRIC_CHART_EVIDENCE[chart.title].timeline), 0) + (group.id === 3 && references?.recording ? 1 : 0);
      const retiredAnchors = METRIC_CHARTS.filter(chart => metricCategoryFor(chart) === group.name).flatMap(chart => {
        const link = DRAFT_CHART_LINKS.find(link => link.title === chart.title)!;
        const ids = isVisibleMetric(chart)
          ? link.panels.filter(panel => panel.plotId !== null && RETIRED_METRIC_PLOT_IDS.has(panel.plotId)).map(panel => panel.id)
          : [link.id, ...link.panels.map(panel => panel.id)];
        return ids.flatMap(id => [id, canonicalMetricAnchor(id)]);
      });
      const matched = categoryMatch(group);
      const groupQuery = group.name.toLocaleLowerCase().includes(term) ? "" : term;
      const state: GroupState = term && matched ? "full" : states[group.name] ?? "preview";
      const open = state !== "collapsed";
      const contentId = `metric-category-${group.id}`;
      return <section key={group.name} className="metric-category" data-metrics-category={group.name} data-metric-state={state} hidden={!!term && !matched}>
        {retiredAnchors.map(id => <span key={id} id={id} className="metric-anchor" data-retired-metric-anchor aria-hidden="true" />)}
        <h2><button type="button" disabled={!!term} id={`${contentId}-toggle`} data-metric-toggle={group.name} aria-expanded={open} aria-controls={contentId} onClick={() => setStates(previous => ({ ...previous, [group.name]: open ? "collapsed" : "preview" }))}>
          <span aria-hidden="true">{open ? "−" : "+"}</span><span className="metric-category-name">{group.name}</span>
        </button></h2>
        <div id={contentId} hidden={!open} aria-labelledby={`${contentId}-toggle`}>
          <div id={`${contentId}-charts`} className="metric-chart-grid" data-metric-grid>
            {group.id === 6 ? <>
              <div className="metric-chart-fragment" hidden={!!groupQuery && !engagementPreviewText.includes(groupQuery)}>{engagementPreview}</div>
              <div className="metric-chart-fragment" hidden={groupQuery ? !engagementMoreText.includes(groupQuery) : state !== "full"}><VelocityInstrumentsSection performance={performance} flat /></div>
            </> : <DraftChartsSection flat category={group.name} query={groupQuery} showGaps={false} featuredTitle={group.preview ?? undefined} visibleTitles={state === "full" || term ? undefined : [group.preview!]} />}
            {group.id === 3 && <div className="metric-chart-fragment" hidden={groupQuery ? !neuronText.includes(groupQuery) : state !== "full"}>{references?.recording}</div>}
            <button className="metric-category-more" type="button" data-metric-more={group.name} disabled={!!term} aria-expanded={state === "full"} aria-controls={`${contentId}-charts`} onClick={() => setStates(previous => ({ ...previous, [group.name]: state === "full" ? "preview" : "full" }))}>{state === "full" ? "show only featured" : `Show all ${count} charts`}</button>
          </div>
        </div>
      </section>;
    })}
  </section>;
}
