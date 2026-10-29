"use client";

import { DRAFT_CHARTS, DRAFT_CHART_CATEGORIES, type DraftChart } from "@/data/draft-charts";
import { DRAFT_CHART_LINKS, canonicalMetricAnchor } from "@/data/draft-chart-links";
import { DraftChartShare } from "@/components/draft-chart-share";
import { METRIC_CHART_EVIDENCE as DRAFT_CHART_EVIDENCE, isVisibleMetric } from "@/data/metric-chart-visibility";
import { DraftChartPlot, DraftEventTimeline } from "@/components/draft-chart-plot";
import { setPerformanceFocusReturn, navigatePerformance } from "@/lib/field-velocity/navigation";

function MetricsChartLink({ anchor, note }: { anchor: "tissue-mapped" | "neural-recording-hours"; note: string }) {
  return <a
    className="draft-chart-link"
    href={`#${anchor}`}
    onClick={event => {
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        setPerformanceFocusReturn(event.currentTarget);
        navigatePerformance(anchor);
      }
    }}
  >
    {note} <span aria-hidden="true">↗</span>
  </a>;
}

function Methodology({ chart, context }: { chart: DraftChart; context?: string }) {
  return <details className="draft-chart-methodology" data-draft-methodology>
    <summary>Definition and comparability</summary>
    <dl>
      <div><dt>Candidate axes</dt><dd>{chart.axes}</dd></div>
      <div><dt>Definition</dt><dd>{chart.definition}</dd></div>
      <div><dt>Comparability condition</dt><dd>{chart.constraint}</dd></div>
      {context && <div data-draft-context><dt>Context</dt><dd>{context}</dd></div>}
    </dl>
  </details>;
}

export function DraftChartsSection({ category: selectedCategory, query = "", showGaps = true }: { category?: string; query?: string; showGaps?: boolean } = {}) {
  const matches = (chart: DraftChart) => JSON.stringify([chart, DRAFT_CHART_EVIDENCE[chart.title]]).toLocaleLowerCase().includes(query);
  const linksFor = (chart: DraftChart) => DRAFT_CHART_LINKS.find(link => link.title === chart.title)!;
  const plotted = DRAFT_CHARTS.filter(chart => (!selectedCategory || chart.category === selectedCategory) && isVisibleMetric(chart));
  const gaps = DRAFT_CHARTS.filter(chart => (!selectedCategory || chart.category === selectedCategory) && DRAFT_CHART_EVIDENCE[chart.title]?.status !== "plotted");
  return <section className="draft-charts draft-charts-gallery" aria-label={selectedCategory ?? "Metrics"}>
    {!selectedCategory && <header className="draft-charts-header">
      <p className="pc-eyebrow">Source-backed observations</p>
      <h2 id="draft-charts-title">Metrics</h2>
      <span className="pc-bounded" data-draft-chart-counts>{plotted.length} plotted · {gaps.length} evidence gaps</span>
    </header>}
    {!selectedCategory && <p className="draft-charts-intro">
      Selected published measurements, not a field-wide progress score. Each panel keeps its own
      units and scope; unconnected points do not imply a comparable trend. Inspect any point or open its source table.
    </p>}
    <div className="draft-charts-groups">
      {DRAFT_CHART_CATEGORIES.filter(category => (!selectedCategory || category === selectedCategory) && plotted.some(chart => chart.category === category)).map(category => {
        const charts = plotted.filter(chart => chart.category === category);
        const categoryId = `draft-${category.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
        return <section key={category} className="draft-chart-group" data-draft-chart-category={category} aria-labelledby={`${categoryId}-title`}>
          <h3 id={`${categoryId}-title`} hidden={!!selectedCategory}>{category}</h3>
          {charts.length ? <div className="draft-chart-grid">
            {charts.map(chart => {
              const evidence = DRAFT_CHART_EVIDENCE[chart.title];
              return <article hidden={!matches(chart)} id={linksFor(chart).id} key={chart.title} className={`draft-chart-card card${evidence.plots.length > 1 ? " draft-chart-card-multiple" : ""}`} data-draft-chart-card={chart.title} data-draft-chart-status="plotted">
                <span id={canonicalMetricAnchor(linksFor(chart).id)} className="metric-anchor" />
                <div className="draft-chart-card-header">
                  <span className="draft-chart-readiness">{evidence.timeline ? `${evidence.timeline.events.length} events` : `${evidence.plots.reduce((sum, plot) => sum + plot.points.length, 0)} observations`}</span>
                </div>
                <h4>{chart.title}</h4>
                <DraftChartShare anchor={linksFor(chart).id} label={chart.title} card />
                <p className="draft-chart-summary">{evidence.summary}</p>
                <div className="draft-chart-plots">{evidence.plots.map(plot => {
                  const panels = linksFor(chart).panels.filter(panel => panel.plotId === plot.id);
                  const panel = panels[0]!;
                  return <div key={plot.id} id={panel.id} data-draft-panel>
                    <span id={canonicalMetricAnchor(panel.id)} className="metric-anchor" />
                    {panels.slice(1).map(alias => <span key={alias.id} id={alias.id} data-panel-alias className="metric-anchor"><span id={canonicalMetricAnchor(alias.id)} /></span>)}
                    <DraftChartPlot plot={plot} shareAnchor={canonicalMetricAnchor(panel.id)} />
                    <DraftChartShare anchor={panel.id} label={plot.title} />
                  </div>;
                })}</div>
                {evidence.timeline && <div id={linksFor(chart).panels.find(panel => panel.plotId === null)!.id} data-draft-panel>
                  <span id={canonicalMetricAnchor(linksFor(chart).panels.find(panel => panel.plotId === null)!.id)} className="metric-anchor" />
                  <DraftEventTimeline timeline={evidence.timeline} />
                  <DraftChartShare anchor={linksFor(chart).panels.find(panel => panel.plotId === null)!.id} label="Selected application events" />
                </div>}
                <Methodology chart={chart} context={evidence.gapReason} />
                {chart.metricsAnchor && chart.metricsNote && <MetricsChartLink anchor={chart.metricsAnchor} note={chart.metricsNote} />}
              </article>;
            })}
          </div> : <p className="draft-chart-category-gap">No plotted observations yet. See the evidence gaps below.</p>}
        </section>;
      })}
    </div>
    {showGaps && gaps.length > 0 && <section className="draft-evidence-gaps" data-draft-evidence-gaps aria-label="Evidence gaps">
      <h3>Evidence gaps <span>({gaps.length})</span></h3>
      <p>Candidate definitions without a defensible plotted series yet. No measurements are inferred.</p>
      {DRAFT_CHART_CATEGORIES.filter(category => !selectedCategory || category === selectedCategory).map(category => {
        const categoryGaps = gaps.filter(chart => chart.category === category);
        return categoryGaps.length > 0 && <div key={category} className="draft-gap-group">
          <h4>{category}</h4>
          {categoryGaps.map(chart => <article hidden={!matches(chart)} id={linksFor(chart).id} key={chart.title} className="draft-chart-gap" data-draft-chart-card={chart.title} data-draft-chart-status="gap">
            <span id={canonicalMetricAnchor(linksFor(chart).id)} className="metric-anchor" />
            <DraftChartShare anchor={linksFor(chart).id} label={chart.title} />
            <details data-draft-gap-details>
              <summary><span>{chart.title}</span><span className="draft-gap-label">Evidence gap</span></summary>
              <p>{DRAFT_CHART_EVIDENCE[chart.title]?.gapReason ?? "Source-backed observations have not yet been assembled for this definition."}</p>
              <Methodology chart={chart} />
            </details>
            {chart.metricsAnchor && chart.metricsNote && <MetricsChartLink anchor={chart.metricsAnchor} note={chart.metricsNote} />}
          </article>)}
        </div>;
      })}
    </section>}
  </section>;
}
