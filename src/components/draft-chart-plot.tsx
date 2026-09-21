"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DraftChartEvidence, DraftObservation, DraftPlot } from "@/lib/draft-chart-types";

const GROUP_COLORS = ["var(--accent)", "#cd732f", "#9275ca", "#238e91", "#cb6285", "#647d3d"];
const exactNumber = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 20 });
const tickLabel = (value: number) => {
  // Axis labels are display ticks, not source values: suppress binary arithmetic noise.
  const rounded = Number(value.toPrecision(6));
  const label = exactNumber(rounded);
  return label.length <= 10 ? label : rounded.toExponential(2).replace("e+", "e");
};

function wrapLabel(label: string, width: number) {
  const limit = Math.max(16, Math.floor(width / 7));
  const lines = [""];
  for (const word of label.split(" ")) {
    const last = lines.length - 1;
    if (lines[last] && lines[last].length + word.length + 1 > limit) lines.push(word);
    else lines[last] += `${lines[last] ? " " : ""}${word}`;
  }
  return lines;
}

function usePlotWidth() {
  const [width, setWidth] = useState(560);
  const figure = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!figure.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(entries => {
      const measured = entries[0]?.contentRect.width;
      // A hidden tab has no width. Keep the last usable coordinate system until reveal.
      if (measured > 0) setWidth(Math.max(200, Math.round(measured)));
    });
    observer.observe(figure.current);
    return () => observer.disconnect();
  }, []);
  return { width, figure };
}

export function DraftChartPlot({ plot }: { plot: DraftPlot }) {
  const id = useId();
  const groups = [...new Set(plot.points.map(point => point.group ?? "Other observations"))];
  const groupColor = (point: DraftObservation) => GROUP_COLORS[groups.indexOf(point.group ?? "Other observations") % GROUP_COLORS.length];
  const [active, setActive] = useState<DraftObservation | null>(null);
  const qualifiedValue = (point: DraftObservation) => `${point.qualifier ?? ""}${exactNumber(point.y)}`;
  const { width, figure } = usePlotWidth();
  const yTitle = wrapLabel(plot.yLabel, width - 12);
  const xTitle = wrapLabel(plot.xLabel, width - 12);
  const top = 28 + yTitle.length * 16;
  const bottom = top + 232;
  const height = bottom + 64 + (xTitle.length - 1) * 16;
  const xs = plot.points.map(point => point.x);
  const ys = plot.points.map(point => point.y);
  const numericX = plot.xKind === "number";
  let xMin = numericX ? Math.min(...xs) : Math.floor(Math.min(...xs));
  let xMax = numericX ? Math.max(...xs) : Math.ceil(Math.max(...xs));
  if (xMin === xMax) { xMin -= 1; xMax += 1; }
  const log = plot.scale === "log";
  const minPower = Math.floor(Math.log10(Math.min(...ys)));
  let maxPower = Math.ceil(Math.log10(Math.max(...ys)));
  if (maxPower === minPower) maxPower += 1;
  const yMax = log ? 10 ** maxPower : Math.max(...ys) || 1;
  const yMin = log ? 10 ** minPower : Math.min(0, ...ys);
  const powerStep = Math.max(1, Math.ceil((maxPower - minPower) / 5));
  const yTicks = log
    ? [...new Set([...Array.from({ length: Math.floor((maxPower - minPower) / powerStep) + 1 }, (_, i) => 10 ** (minPower + i * powerStep)), yMax])]
    : Array.from({ length: 5 }, (_, i) => Number((yMin + (yMax - yMin) * i / 4).toPrecision(12)));
  const xTicks = [...new Set([xMin, numericX ? (xMin + xMax) / 2 : Math.round((xMin + xMax) / 2), xMax])];
  const left = Math.max(46, ...yTicks.map(tick => tickLabel(tick).length * 6.5 + 12));
  const right = width - Math.max(24, ...xTicks.map(tick => (numericX ? tickLabel(tick) : String(tick)).length * 3.5 + 4));
  const x = (value: number) => left + (value - xMin) / (xMax - xMin) * (right - left);
  const y = (value: number) => bottom - (log
    ? (Math.log10(value) - minPower) / (maxPower - minPower)
    : (value - yMin) / (yMax - yMin)) * (bottom - top);

  return <figure ref={figure} className="draft-plot" aria-labelledby={`${id}-title`}>
    <figcaption id={`${id}-title`}>{plot.title}</figcaption>
    <svg className="draft-plot-svg" viewBox={`0 0 ${width} ${height}`} aria-labelledby={`${id}-title`}>
      <text className="draft-plot-axis-title" x={0} y={18}>{yTitle.map((line, index) => <tspan key={index} x={0} dy={index ? 16 : 0}>{line}{index < yTitle.length - 1 ? " " : ""}</tspan>)}</text>
      {yTicks.map(tick => <g key={tick}>
        <line className="draft-plot-gridline" x1={left} x2={right} y1={y(tick)} y2={y(tick)} />
        <text className="draft-plot-tick" x={left - 10} y={y(tick) + 4} textAnchor="end">{tickLabel(tick)}</text>
      </g>)}
      <line className="draft-plot-axis" x1={left} x2={right} y1={bottom} y2={bottom} />
      {xTicks.map(tick => <text className="draft-plot-tick" key={tick} x={x(tick)} y={bottom + 22} textAnchor="middle">{numericX ? tickLabel(tick) : String(tick)}</text>)}
      <text className="draft-plot-axis-title" x={width / 2} y={bottom + 52} textAnchor="middle">{xTitle.map((line, index) => <tspan key={index} x={width / 2} dy={index ? 16 : 0}>{line}{index < xTitle.length - 1 ? " " : ""}</tspan>)}</text>
      {plot.points.map(point => <circle key={point.id} data-source-observation={point.id} cx={x(point.x)} cy={y(point.y)} r={6} fill={groupColor(point)}
        tabIndex={0} role="button"
        aria-label={`${point.label}; ${point.group ?? ""}; ${point.dateLabel}; ${plot.yLabel}: ${qualifiedValue(point)}; ${point.sourceTitle}`}
        aria-describedby={active?.id === point.id ? `${id}-tooltip` : undefined}
        onFocus={() => setActive(point)} onMouseEnter={() => setActive(point)} onClick={() => setActive(point)}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(point); }
          if (event.key === "Escape") setActive(null);
        }}
      />)}
    </svg>
    {groups.length > 1 && <ul className="draft-group-legend" data-draft-group-legend aria-label="Observation scopes">{groups.map((group, index) => <li key={group}><span aria-hidden="true" style={{ color: GROUP_COLORS[index % GROUP_COLORS.length] }}>●</span> {group}</li>)}</ul>}
    <p className="draft-plot-legend"><span aria-hidden="true">●</span> Source-reported · {log ? "Log scale" : "Linear scale"} · Unconnected observations</p>
    <div className="draft-plot-inspector">
      {active ? <div role="tooltip" id={`${id}-tooltip`}>
        <strong>{active.label}</strong>
        {active.group && <p>{active.group}</p>}
        <p>{active.dateLabel}{numericX && ` · ${plot.xLabel}: ${exactNumber(active.x)}`}</p>
        <p>{plot.yLabel}: <strong>{qualifiedValue(active)}</strong></p>
        <a href={active.sourceUrl} target="_blank" rel="noreferrer">{active.sourceTitle} ↗</a>
        {active.note && <p>{active.note}</p>}
      </div> : <p className="draft-plot-hint">Hover, tap, or focus an observation to inspect its value and source.</p>}
    </div>
    <details className="draft-plot-data">
      <summary>Data and sources ({plot.points.length})</summary>
      <p className="draft-plot-scope">{plot.scope}</p>
      {plot.seriesNote && <p>{plot.seriesNote}</p>}
      <div className="draft-plot-table-scroll" tabIndex={0} role="region" aria-label={`${plot.title} source table`}>
        <table>
          <caption>{plot.title} — source-reported observations</caption>
          <thead><tr><th scope="col">Observation</th><th scope="col">{plot.xLabel}</th><th scope="col">{plot.yLabel}</th><th scope="col">Source and scope notes</th></tr></thead>
          <tbody>{plot.points.map(point => <tr key={point.id}>
            <th scope="row">{point.label}{point.group && <small>{point.group}</small>}</th>
            <td>{numericX && <>{exactNumber(point.x)}<br /></>}{point.dateLabel}</td>
            <td>{qualifiedValue(point)}</td>
            <td><a href={point.sourceUrl} target="_blank" rel="noreferrer">{point.sourceTitle} ↗</a><blockquote>{point.quote}</blockquote>{point.note && <p>{point.note}</p>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </figure>;
}

/** Categorical lanes carry no ordinal/impact score; positions encode dates only. */
export function DraftEventTimeline({ timeline }: { timeline: NonNullable<DraftChartEvidence["timeline"]> }) {
  const id = useId();
  const { width, figure } = usePlotWidth();
  const stages = [...new Set(timeline.events.map(event => event.stage))];
  const years = timeline.events.map(event => event.year);
  const first = Math.floor(Math.min(...years));
  const last = Math.max(first + 1, Math.ceil(Math.max(...years)));
  const height = Math.max(320, stages.length * 100 + 100);
  const x = (year: number) => 28 + (year - first) / (last - first) * (width - 56);
  const y = (stage: string) => 90 + stages.indexOf(stage) * 100;
  const ticks = [...new Set([first, Math.round((first + last) / 2), last])];
  return <figure ref={figure} className="draft-plot draft-event-timeline" aria-labelledby={`${id}-title`}>
    <figcaption id={`${id}-title`}>Selected application events</figcaption>
    <p className="draft-plot-scope">{timeline.scope}</p>
    <p className="draft-plot-legend">● Source-backed event · Categorical stages, not an impact score or ranking</p>
    <svg className="draft-plot-svg" data-draft-event-timeline viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <desc id={`${id}-description`}>Events positioned by year. Full dates, stage labels and sources are listed below.</desc>
      {stages.map(stage => <g key={stage}>
        <text className="draft-plot-axis-title" x={0} y={y(stage) - 45}>{wrapLabel(stage, width - 12).map((line, index) => <tspan key={index} x={0} dy={index ? 16 : 0}>{line}{index < wrapLabel(stage, width - 12).length - 1 ? " " : ""}</tspan>)}</text>
        <line className="draft-plot-gridline" x1={28} x2={width - 28} y1={y(stage)} y2={y(stage)} />
      </g>)}
      {timeline.events.map(event => <circle key={event.id} data-source-event={event.id} cx={x(event.year)} cy={y(event.stage)} r={7} fill="var(--accent)"><title>{`${event.label} · ${event.dateLabel} · ${event.stage}`}</title></circle>)}
      {ticks.map(year => <text key={year} className="draft-plot-tick" x={x(year)} y={height - 45} textAnchor="middle">{year}</text>)}
      <text className="draft-plot-axis-title" x={width / 2} y={height - 16} textAnchor="middle">Publication / demonstration year</text>
    </svg>
    <ul className="draft-event-list">{timeline.events.map(event => <li key={event.id} data-draft-event={event.id}>
      <p className="draft-event-date">{event.dateLabel} · {event.stage}</p>
      <strong>{event.label}</strong>
      <p>{event.note}</p>
      <a href={event.sourceUrl} target="_blank" rel="noreferrer">{event.sourceTitle} ↗</a>
      <blockquote>{event.quote}</blockquote>
    </li>)}</ul>
  </figure>;
}
