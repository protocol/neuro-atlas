"use client";

import { type DraftChart } from "@/data/draft-charts";
import { DRAFT_CHART_LINKS, canonicalMetricAnchor } from "@/data/draft-chart-links";
import { DraftChartShare } from "@/components/draft-chart-share";
import { METRIC_CHARTS as DRAFT_CHARTS, METRIC_CHART_EVIDENCE as DRAFT_CHART_EVIDENCE, isVisibleMetric, metricCategoryFor, METRIC_CHART_CATEGORIES } from "@/data/metric-chart-visibility";
import { DraftChartPanel, DraftTimelinePanel } from "@/components/draft-chart-panel";

function Methodology({ chart, context }: { chart: DraftChart; context?: string }) {
  return <details className="draft-chart-methodology" data-draft-methodology>
    <summary>Definition and comparability</summary>
    <dl>
      <div><dt>Candidate axes</dt><dd>{chart.metricsAnchor === "neural-recording-hours" ? "x-axis: release / publication / disclosure date · y-axis: recording hours, log scale" : chart.axes}</dd></div>
      <div><dt>Definition</dt><dd>{chart.definition}</dd></div>
      <div><dt>Comparability condition</dt><dd>{chart.constraint}</dd></div>
      {context && <div data-draft-context><dt>Context</dt><dd>{context}</dd></div>}
    </dl>
  </details>;
}

export function DraftChartsSection({ category: selectedCategory, query = "", showGaps = true, visibleTitles }: { category?: string; query?: string; showGaps?: boolean; visibleTitles?: readonly string[] } = {}) {
  const matches = (chart: DraftChart) => JSON.stringify([chart, DRAFT_CHART_EVIDENCE[chart.title]]).toLocaleLowerCase().includes(query);
  const linksFor = (chart: DraftChart) => DRAFT_CHART_LINKS.find(link => link.title === chart.title)!;
  const plotted = DRAFT_CHARTS.filter(chart => (!selectedCategory || metricCategoryFor(chart) === selectedCategory) && isVisibleMetric(chart));
  const gaps = DRAFT_CHARTS.filter(chart => (!selectedCategory || metricCategoryFor(chart) === selectedCategory) && DRAFT_CHART_EVIDENCE[chart.title]?.status !== "plotted");
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
      {METRIC_CHART_CATEGORIES.filter(category => (!selectedCategory || category === selectedCategory) && plotted.some(chart => metricCategoryFor(chart) === category)).map(category => {
        const charts = plotted.filter(chart => metricCategoryFor(chart) === category);
        const categoryId = `draft-${category.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
        return <section key={category} className="draft-chart-group" data-draft-chart-category={category} aria-labelledby={`${categoryId}-title`}>
          <h3 id={`${categoryId}-title`} hidden={!!selectedCategory}>{category}</h3>
          {charts.length ? <div className="draft-chart-grid">
            {charts.map(chart => {
              const evidence = DRAFT_CHART_EVIDENCE[chart.title];
              const shareAtCard = chart.metricsAnchor === "neural-recording-hours";
              const displayTitle = chart.title === "NeuroAI performance–cost frontier over time" ? "NeuroAI performance–cost frontier" : chart.title;
              return <article hidden={!matches(chart) || (!!visibleTitles && !visibleTitles.includes(chart.title))} id={linksFor(chart).id} key={chart.title} className={`draft-chart-card card${evidence.plots.length > 1 ? " draft-chart-card-multiple" : ""}`} data-draft-chart-card={chart.title} data-draft-chart-status="plotted">
                {!shareAtCard && <span id={canonicalMetricAnchor(linksFor(chart).id)} className="metric-anchor" />}
                {chart.metricsAnchor && <span id={chart.metricsAnchor} className="metric-anchor" />}
                <div className="draft-chart-card-header">
                  <span className="draft-chart-readiness">{evidence.timeline ? `${evidence.timeline.events.length} events` : `${evidence.plots.reduce((sum, plot) => sum + plot.points.length, 0)} observations`}</span>
                </div>
                <h4>{displayTitle}</h4>
                {!shareAtCard && <DraftChartShare anchor={linksFor(chart).id} label={displayTitle} card />}
                <p className="draft-chart-summary">{evidence.summary}</p>
                <div className="draft-chart-plots">{evidence.plots.map((plot, plotIndex) => {
                  const panels = linksFor(chart).panels.filter(panel => panel.plotId === plot.id);
                  const panel = panels[0]!;
                  const shareAnchor = shareAtCard ? linksFor(chart).id : panel.id;
                  const aliases = [...new Set([
                    ...panels.flatMap(alias => [alias.id, canonicalMetricAnchor(alias.id)]),
                    ...(plotIndex === 0 ? [linksFor(chart).id, canonicalMetricAnchor(linksFor(chart).id), ...(chart.metricsAnchor ? [chart.metricsAnchor] : [])] : []),
                  ])].filter(alias => alias !== canonicalMetricAnchor(shareAnchor));
                  const displayPlot = chart.title === "NeuroAI performance–cost frontier over time" ? { ...plot, title: displayTitle } : plot;
                  return <div key={plot.id} id={shareAtCard ? undefined : panel.id} data-draft-panel>
                    <span id={canonicalMetricAnchor(shareAnchor)} className="metric-anchor" />
                    {(shareAtCard ? panels : panels.slice(1)).map(alias => <span key={alias.id} id={alias.id} data-panel-alias className="metric-anchor"><span id={canonicalMetricAnchor(alias.id)} /></span>)}
                    <DraftChartPanel plot={displayPlot} anchor={canonicalMetricAnchor(shareAnchor)} aliases={aliases} />
                    <DraftChartShare anchor={shareAnchor} label={displayPlot.title} />
                  </div>;
                })}</div>
                {evidence.timeline && <div id={linksFor(chart).panels.find(panel => panel.plotId === null)!.id} data-draft-panel>
                  <span id={canonicalMetricAnchor(linksFor(chart).panels.find(panel => panel.plotId === null)!.id)} className="metric-anchor" />
                  <DraftTimelinePanel timeline={evidence.timeline} anchor={canonicalMetricAnchor(linksFor(chart).panels.find(panel => panel.plotId === null)!.id)} aliases={[
                    linksFor(chart).panels.find(panel => panel.plotId === null)!.id,
                    ...(evidence.plots.length === 0 ? [linksFor(chart).id, canonicalMetricAnchor(linksFor(chart).id)] : []),
                  ]} />
                  <DraftChartShare anchor={linksFor(chart).panels.find(panel => panel.plotId === null)!.id} label="Selected application events" />
                </div>}
                <Methodology chart={chart} context={evidence.gapReason} />
              </article>;
            })}
          </div> : <p className="draft-chart-category-gap">No plotted observations yet. See the evidence gaps below.</p>}
        </section>;
      })}
    </div>
    {showGaps && gaps.length > 0 && <section className="draft-evidence-gaps" data-draft-evidence-gaps aria-label="Evidence gaps">
      <h3>Evidence gaps <span>({gaps.length})</span></h3>
      <p>Candidate definitions without a defensible plotted series yet. No measurements are inferred.</p>
      {METRIC_CHART_CATEGORIES.filter(category => !selectedCategory || category === selectedCategory).map(category => {
        const categoryGaps = gaps.filter(chart => metricCategoryFor(chart) === category);
        return categoryGaps.length > 0 && <div key={category} className="draft-gap-group">
          <h4>{category}</h4>
          {categoryGaps.map(chart => <article hidden={!matches(chart) || (!!visibleTitles && !visibleTitles.includes(chart.title))} id={linksFor(chart).id} key={chart.title} className="draft-chart-gap" data-draft-chart-card={chart.title} data-draft-chart-status="gap">
            <span id={canonicalMetricAnchor(linksFor(chart).id)} className="metric-anchor" />
            <DraftChartShare anchor={linksFor(chart).id} label={chart.title} />
            <details data-draft-gap-details>
              <summary><span>{chart.title}</span><span className="draft-gap-label">Evidence gap</span></summary>
              <p>{DRAFT_CHART_EVIDENCE[chart.title]?.gapReason ?? "Source-backed observations have not yet been assembled for this definition."}</p>
              <Methodology chart={chart} />
            </details>
          </article>)}
        </div>;
      })}
    </section>}
  </section>;
}
