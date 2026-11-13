"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { installChartExportApi } from "@/lib/chart-export-api";
import { fieldVelocityLink, performanceTarget, canonicalPerformanceAnchor } from "@/data/field-velocity-links";
import { DRAFT_CHART_LINKS, canonicalMetricAnchor } from "@/data/draft-chart-links";
import { usePerformanceHash, revealDraftTarget } from "@/lib/field-velocity/navigation";
import { METRIC_CHARTS, METRIC_CHART_EVIDENCE, METRIC_GROUPS, RETIRED_METRIC_PLOT_IDS, isVisibleMetric, metricCategoryFor } from "@/data/metric-chart-visibility";
import { DraftChartsSection } from "./draft-charts-section";
import { VelocityInstrumentsSection } from "./velocity-instruments-section";
import SNAPSHOT from "@/data/field-velocity/neurotech.snapshot.json";
import TRENDS from "../../../public/data/google-trends/google-trends.json";
import PARTICIPANT_ADDITIONS from "@/data/field-velocity/bci-participants.additions.json";
import TRANSLATION_EVIDENCE from "@/data/field-velocity/bci-translation-evidence.json";
import { metricSizingVisibility } from "@/components/metric-sizing-visibility";
import { RECORDING_VIEWS } from "@/data/recording-evidence";
import { useMetricCardHeight } from "@/components/use-metric-card-height";
import PUBLICATIONS from "@/data/publications/publication-charts.snapshot.json";
import { PublicationCharts, PUBLICATION_SEARCH_TEXT } from "@/components/publication-charts";

const neuronText = JSON.stringify([SNAPSHOT.records.filter(row => row.instrument === "performance_curves"), RECORDING_VIEWS, "Simultaneous neural recordings", "Simultaneously recorded neurons"]).toLocaleLowerCase();
const engagementPreviewText = JSON.stringify([TRENDS.groups.filter(group => group.id === "neurotech"), "Google Trends Public attention"]).toLocaleLowerCase();
const engagementMoreText = JSON.stringify([SNAPSHOT.records.filter(row => row.state === "reading" && ["idea_vintage", "latency_compression", "revealed_commitments"].includes(row.instrument)), SNAPSHOT.measurementSeries.filter(series => series.id === "bci-implants"), PARTICIPANT_ADDITIONS, TRANSLATION_EVIDENCE, "Citation latency Idea vintage Latency compression Google Trends Public attention Revealed commitments"]).toLocaleLowerCase();

const publicationText = JSON.stringify([PUBLICATIONS.tables, PUBLICATION_SEARCH_TEXT]).toLocaleLowerCase();
type GroupState = "collapsed" | "full";
function revealFocusedTile(event: React.FocusEvent<HTMLDivElement>) {
  // Dialogs never move the background; pressed pointer targets must stay put until click.
  if (event.target.closest("dialog[open]") || event.target.matches(":active")) return;
  const rail = event.currentTarget;
  const tile = event.target.closest<HTMLElement>("article");
  if (!tile || !rail.clientWidth) return;
  const viewportLeft = rail.getBoundingClientRect().left + rail.clientLeft;
  const viewportRight = viewportLeft + rail.clientWidth;
  const bounds = tile.getBoundingClientRect();
  if (bounds.left < viewportLeft) rail.scrollLeft += bounds.left - viewportLeft;
  else if (bounds.right > viewportRight) rail.scrollLeft += bounds.right - viewportRight;
}
/** One signature tone per group, in reading order; used for the group badge, edge and card tabs. */
const METRIC_GROUP_TONES = ["#115ef7", "#238e91", "#9275ca", "#cd732f", "#cb6285"] as const;
export type MetricReferences = { recording: React.ReactNode };
export function MetricsSection({ performance, references, engagementPreview }: { performance: React.ReactNode; references?: MetricReferences; engagementPreview?: React.ReactNode }) {
  const [states, setStates] = useState<Record<string, GroupState>>({});
  const [query, setQuery] = useState("");
  const pendingReveal = useRef<string | null>(null);
  const cancelReveal = useRef<(() => void) | undefined>(undefined);
  const hash = usePerformanceHash();
  // Publish window.neuroAtlas up front so automation can call exportAll before opening any chart.
  useEffect(() => { installChartExportApi(); }, []);
  useLayoutEffect(() => {
    const reveal = () => {
      const anchor = performanceTarget(hash.slice(1));
      pendingReveal.current = anchor;
      const legacy = anchor.replace(/^metric-/, "draft-");
      const link = DRAFT_CHART_LINKS.find(link => link.id === legacy || link.panels.some(panel => panel.id === legacy));
      const linkTarget = fieldVelocityLink(hash.slice(1));
      const target = document.getElementById(anchor) ?? (linkTarget?.fallback ? document.getElementById(linkTarget.fallback) : null);
      const sourceTitle = link?.title ?? target?.closest<HTMLElement>("[data-draft-chart-card]")?.dataset.draftChartCard;
      const candidate = METRIC_CHARTS.find(chart => chart.title === sourceTitle);
      const card = [...document.querySelectorAll<HTMLElement>("[data-performance-card], [data-trends-card]")].find(card => canonicalPerformanceAnchor(card.dataset.performanceCard ?? `google-trends-${card.dataset.trendsCard}`) === hash.slice(1));
      const category = candidate ? metricCategoryFor(candidate) : (card ?? target)?.closest<HTMLElement>("[data-metrics-category]")?.dataset.metricsCategory;
      const group = METRIC_GROUPS.find(group => group.name === category);
      if (group) {
        setQuery("");
        setStates(previous => ({ ...previous, [group.name]: "full" }));
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
    const fallback = anchor ? fieldVelocityLink(anchor)?.fallback : undefined;
    const target = anchor ? document.getElementById(anchor) ?? (fallback ? document.getElementById(fallback) : null) : null;
    if (!anchor || !target || target.closest("[hidden]")) return;
    pendingReveal.current = null;
    cancelReveal.current?.();
    cancelReveal.current = revealDraftTarget(anchor);
  }, [hash, states, query]);
  const term = query.trim().toLocaleLowerCase();
  const matches = METRIC_CHARTS.filter(chart => isVisibleMetric(chart) && JSON.stringify([chart, METRIC_CHART_EVIDENCE[chart.title]]).toLocaleLowerCase().includes(term));
  const supplementalMatch = (id: number) => id === 3 ? neuronText.includes(term) : id === 6 && (engagementPreviewText.includes(term) || engagementMoreText.includes(term) || publicationText.includes(term));
  const categoryMatch = (group: typeof METRIC_GROUPS[number]) => group.name.toLocaleLowerCase().includes(term) || matches.some(chart => metricCategoryFor(chart) === group.name) || supplementalMatch(group.id);
  const matchingCategories = METRIC_GROUPS.filter(categoryMatch).length;
  const changeGroup = (name: string, state: GroupState, control: HTMLButtonElement) => {
    if (state !== "full") {
      if (control.getAttribute("aria-expanded") === "true") control.focus({ preventScroll: true });
      const rail = control.closest("[data-metrics-category]")?.querySelector<HTMLElement>("[data-metric-rail]");
      if (rail) rail.scrollLeft = 0;
    }
    setStates(previous => ({ ...previous, [name]: state }));
  };
  const setAll = (state: GroupState, control: HTMLButtonElement) => {
    control.focus({ preventScroll: true });
    control.closest(".metrics-index")?.querySelectorAll<HTMLElement>("[data-metric-rail]").forEach(rail => { rail.scrollLeft = 0; });
    setQuery("");
    setStates(Object.fromEntries(METRIC_GROUPS.map(group => [group.name, state])));
  };
  const cardHeightRef = useMetricCardHeight();
  // Counts come from the rendered rails, so they always match the cards readers can open.
  const [chartCounts, setChartCounts] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    const root = cardHeightRef.current;
    if (!root) return;
    const count = () => {
      const next = Object.fromEntries([...root.querySelectorAll<HTMLElement>("[data-metrics-category]")]
        .map(category => [category.dataset.metricsCategory!, category.querySelectorAll("[data-metric-rail] article").length]));
      setChartCounts(previous => METRIC_GROUPS.every(group => previous[group.name] === next[group.name]) ? previous : next);
    };
    count();
    if (typeof MutationObserver === "undefined") return;
    // Providers can add cards after mount; recount at most once per frame.
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; count(); });
    });
    root.querySelectorAll("[data-metric-rail]").forEach(rail => observer.observe(rail, { childList: true, subtree: true }));
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame); };
  }, [cardHeightRef]);
  const totalCharts = Object.values(chartCounts).reduce((sum, count) => sum + count, 0);
  return <section ref={cardHeightRef} className="metrics-index" aria-label="Metrics catalog">
    <div className="metrics-tools">
      <label htmlFor="metrics-search" className="sr-only">Search charts</label>
      <input id="metrics-search" type="search" value={query} onInput={event => setQuery(event.currentTarget.value)} placeholder={totalCharts ? `Search ${totalCharts} charts — try H01, mouse, recording hours…` : "Search charts — try H01, mouse, recording hours…"} />
      <div className="metrics-utilities" role="group" aria-label="Chart catalog controls">
      <button type="button" data-clear-metrics disabled={!query} onClick={() => setQuery("")}>Clear search</button>
      <button type="button" data-expand-metrics onClick={event => setAll("full", event.currentTarget)}>Expand all</button>
      <button type="button" data-collapse-metrics onClick={event => setAll("collapsed", event.currentTarget)}>Collapse all</button>
      </div>
    </div>
    {term && <p role="status">{matchingCategories ? `${matchingCategories} matching categories. Clear search to change groups.` : "Try another title, species or dataset, or clear search."}</p>}
    {METRIC_GROUPS.map((group, index) => {
      const retiredAnchors = METRIC_CHARTS.filter(chart => metricCategoryFor(chart) === group.name).flatMap(chart => {
        const link = DRAFT_CHART_LINKS.find(link => link.title === chart.title)!;
        const ids = isVisibleMetric(chart)
          ? link.panels.filter(panel => panel.plotId !== null && RETIRED_METRIC_PLOT_IDS.has(panel.plotId)).map(panel => panel.id)
          : [link.id, ...link.panels.map(panel => panel.id)];
        return ids.flatMap(id => [id, canonicalMetricAnchor(id)]);
      });
      const matched = categoryMatch(group);
      const groupQuery = group.name.toLocaleLowerCase().includes(term) ? "" : term;
      const state: GroupState = term && matched ? "full" : states[group.name] ?? "full";
      const open = state !== "collapsed";
      const contentId = `metric-category-${group.id}`;
      const count = chartCounts[group.name];
      return <section key={group.name} className="metric-category" data-metrics-category={group.name} data-metric-state={state} style={{ "--metric-tone": METRIC_GROUP_TONES[index % METRIC_GROUP_TONES.length] } as React.CSSProperties} {...metricSizingVisibility(!!term && !matched)}>
        {retiredAnchors.map(id => <span key={id} id={id} className="metric-anchor" data-retired-metric-anchor aria-hidden="true" />)}
        <header className="metric-category-head">
          <span className="metric-category-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <h2><button type="button" disabled={!!term} id={`${contentId}-toggle`} data-metric-toggle={group.name} aria-expanded={open} aria-controls={contentId} onClick={event => changeGroup(group.name, open ? "collapsed" : "full", event.currentTarget)}>
            <span className="metric-category-name">{group.name}</span>
          </button></h2>
          <p className="metric-category-summary">{group.summary}</p>
          {count ? <span className="metric-category-count" aria-hidden="true">{count} {count === 1 ? "chart" : "charts"}</span> : null}
          <span className="metric-category-icon" aria-hidden="true">{open ? "−" : "+"}</span>
        </header>
        <div id={contentId} className="metric-category-content" {...metricSizingVisibility(!open)} aria-labelledby={`${contentId}-toggle`}>
          <div id={`${contentId}-charts`} className="metric-chart-rail" data-metric-rail role="region" aria-label={`${group.name} charts`} tabIndex={0} onFocusCapture={revealFocusedTile}>
            {group.id === 6 ? <>
              <div className="metric-chart-fragment" {...metricSizingVisibility(!!groupQuery && !engagementPreviewText.includes(groupQuery))}>{engagementPreview}</div>
              <div className="metric-chart-fragment" {...metricSizingVisibility(!!groupQuery && !engagementMoreText.includes(groupQuery))}><VelocityInstrumentsSection performance={performance} flat /></div>
              <PublicationCharts snapshot={PUBLICATIONS} query={groupQuery} />
            </> : <DraftChartsSection flat category={group.name} query={groupQuery} showGaps={false} featuredTitle={group.preview ?? undefined} />}
            {group.id === 3 && <div className="metric-chart-fragment" {...metricSizingVisibility(!!groupQuery && !neuronText.includes(groupQuery))}>{references?.recording}</div>}
          </div>
        </div>
      </section>;
    })}
  </section>;
}
