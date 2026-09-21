"use client";

import { DRAFT_CHARTS, DRAFT_CHART_CATEGORIES, type DraftChart } from "@/data/draft-charts";
import { DRAFT_CHART_EVIDENCE } from "@/data/draft-chart-observations";
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

function Methodology({ chart }: { chart: DraftChart }) {
  return <details className="draft-chart-methodology" data-draft-methodology>
    <summary>Definition and comparability</summary>
    <dl>
      <div><dt>Candidate axes</dt><dd>{chart.axes}</dd></div>
      <div><dt>Definition</dt><dd>{chart.definition}</dd></div>
      <div><dt>Comparability condition</dt><dd>{chart.constraint}</dd></div>
    </dl>
  </details>;
}

export function DraftChartsSection() {
  const plotted = DRAFT_CHARTS.filter(chart => DRAFT_CHART_EVIDENCE[chart.title]?.status === "plotted");
  const gaps = DRAFT_CHARTS.filter(chart => DRAFT_CHART_EVIDENCE[chart.title]?.status !== "plotted");
  return <section className="draft-charts draft-charts-gallery" aria-labelledby="draft-charts-title">
    <header className="draft-charts-header">
      <p className="pc-eyebrow">Source-backed observations · draft evidence</p>
      <h2 id="draft-charts-title">Draft charts</h2>
      <span className="pc-bounded" data-draft-chart-counts>{plotted.length} plotted · {gaps.length} evidence gaps</span>
    </header>
    <p className="draft-charts-intro">
      Selected published measurements, not a field-wide progress score. Each panel keeps its own
      units and scope; unconnected points do not imply a comparable trend. Inspect any point or open its source table.
    </p>
    <div className="draft-charts-groups">
      {DRAFT_CHART_CATEGORIES.map(category => {
        const charts = plotted.filter(chart => chart.category === category);
        const categoryId = `draft-${category.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
        return <section key={category} className="draft-chart-group" data-draft-chart-category={category} aria-labelledby={`${categoryId}-title`}>
          <h3 id={`${categoryId}-title`}>{category}</h3>
          {charts.length ? <div className="draft-chart-grid">
            {charts.map(chart => {
              const evidence = DRAFT_CHART_EVIDENCE[chart.title];
              return <article key={chart.title} className={`draft-chart-card card${evidence.plots.length > 1 ? " draft-chart-card-multiple" : ""}`} data-draft-chart-card={chart.title} data-draft-chart-status="plotted">
                <div className="draft-chart-card-header">
                  <span className="pc-eyebrow">Bounded evidence</span>
                  <span className="draft-chart-readiness">{evidence.timeline ? `${evidence.timeline.events.length} events` : `${evidence.plots.reduce((sum, plot) => sum + plot.points.length, 0)} observations`}</span>
                </div>
                <h4>{chart.title}</h4>
                <p className="draft-chart-summary">{evidence.summary}</p>
                <div className="draft-chart-plots">{evidence.plots.map(plot => <DraftChartPlot key={plot.id} plot={plot} />)}</div>
                {evidence.timeline && <DraftEventTimeline timeline={evidence.timeline} />}
                {evidence.gapReason && <p className="draft-chart-still-missing" data-draft-still-missing><strong>Still missing:</strong> {evidence.gapReason}</p>}
                <Methodology chart={chart} />
                {chart.metricsAnchor && chart.metricsNote && <MetricsChartLink anchor={chart.metricsAnchor} note={chart.metricsNote} />}
              </article>;
            })}
          </div> : <p className="draft-chart-category-gap">No plotted observations yet. See the evidence gaps below.</p>}
        </section>;
      })}
    </div>
    {gaps.length > 0 && <section className="draft-evidence-gaps" data-draft-evidence-gaps aria-labelledby="draft-evidence-gaps-title">
      <h3 id="draft-evidence-gaps-title">Evidence gaps <span>({gaps.length})</span></h3>
      <p>Candidate definitions without a defensible plotted series yet. No measurements are inferred.</p>
      {DRAFT_CHART_CATEGORIES.map(category => {
        const categoryGaps = gaps.filter(chart => chart.category === category);
        return categoryGaps.length > 0 && <div key={category} className="draft-gap-group">
          <h4>{category}</h4>
          {categoryGaps.map(chart => <article key={chart.title} className="draft-chart-gap" data-draft-chart-card={chart.title} data-draft-chart-status="gap">
            <details>
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
