"use client";

import { useEffect, useId, useRef, useState, type SVGAttributes } from "react";
import type { DraftChartEvidence, DraftObservation, DraftPlot } from "@/lib/draft-chart-types";
import { ChartShare } from "@/components/chart-share";
import { ChartActions } from "@/components/chart-actions";
import { PointTooltip, usePointTooltip } from "@/components/point-source-tooltip";
import { CHART_PRESENTATION } from "@/lib/chart-presentation";
import { neuroaiEnergyAxis } from "@/lib/neuroai-energy-axis";

const GROUP_COLORS = ["var(--accent)", "#cd732f", "#9275ca", "#238e91", "#cb6285", "#647d3d"];
const SPECIES_COLORS: Record<string, string> = { Mouse: "#3b8b62", "Partial mouse cortex": "#3b8b62", Human: "#9275ca", "Fruit fly": "#cd732f" };
const exactNumber = (value: number) => {
  const formatted = value.toLocaleString("en-US", { maximumFractionDigits: 20 });
  // Keep familiar formatting unless its decimal limit loses source precision.
  return Number(formatted.replaceAll(",", "")) === value ? formatted : String(value);
};
const tickLabel = (value: number) => {
  // Axis labels are display ticks, not source values: suppress binary arithmetic noise.
  const rounded = Number(value.toPrecision(6));
  const label = exactNumber(rounded);
  return label.length <= 10 ? label : rounded.toExponential(2).replace("e+", "e");
};

function ObservationMarker({ marker = "circle", cx, cy, r, ...props }: SVGAttributes<SVGElement> & {
  marker?: DraftObservation["marker"]; cx: number; cy: number; r: number;
}) {
  // All glyphs share a circumradius, so existing collision clearances stay valid.
  // The triangle's centroid (not its bounding-box center) is the source position.
  if (marker === "square") {
    const halfSide = r / Math.SQRT2;
    return <rect x={cx - halfSide} y={cy - halfSide} width={halfSide * 2} height={halfSide * 2} {...props} />;
  }
  if (marker === "triangle") {
    const halfBase = Math.sqrt(3) * r / 2;
    return <polygon points={`${cx},${cy - r} ${cx + halfBase},${cy + r / 2} ${cx - halfBase},${cy + r / 2}`} {...props} />;
  }
  return <circle cx={cx} cy={cy} r={r} {...props} />;
}

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
      if (Number.isFinite(measured) && measured > 0) setWidth(Math.max(120, Math.round(measured)));
    });
    observer.observe(figure.current);
    return () => observer.disconnect();
  }, []);
  return { width, figure };
}

export function DraftChartPlot({ plot, shareAnchor, preview = false }: { plot: DraftPlot; shareAnchor?: string; preview?: boolean }) {
  const id = useId();
  const observationBasis = plot.observationBasis ?? "Source-reported";
  const groups = [...new Set(plot.points.map(point => point.group ?? "Other observations"))];
  const groupColor = ({ group = "Other observations", color }: Pick<DraftObservation, "group" | "color">) => color ?? SPECIES_COLORS[group]
    ?? GROUP_COLORS[groups.indexOf(group) % GROUP_COLORS.length];
  const legend = plot.legend ?? (groups.length > 1 ? groups.map(group => {
    const point = plot.points.find(point => (point.group ?? "Other observations") === group);
    return { label: group, color: groupColor(point ?? { group }), marker: point?.marker };
  }) : []);
  const tooltip = usePointTooltip(plot.points);
  const active = tooltip.active;
  const qualifiedValue = (point: DraftObservation) => `${point.qualifier ?? ""}${exactNumber(plot.valueSignificantDigits ? Number(point.y.toPrecision(plot.valueSignificantDigits)) : point.y)}`;
  const { width, figure } = usePlotWidth();
  const yLabel = preview && plot.scale === "log" && !/\blog\b/i.test(plot.yLabel) ? `${plot.yLabel} · log` : plot.yLabel;
  const yTitle = wrapLabel(yLabel, width - 12);
  const xTitle = wrapLabel(plot.xLabel, width - 12);
  const top = 28 + yTitle.length * 16;
  const bottom = top + 232;
  const baseHeight = bottom + 64 + (xTitle.length - 1) * 16;
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
  const rawYMax = Math.max(...ys) || 1;
  const integerStep = Math.max(1, Math.ceil(rawYMax / 5));
  const integerAxis = !log && plot.integerTicks;
  const yMax = log ? 10 ** maxPower : integerAxis ? Math.ceil(rawYMax / integerStep) * integerStep : rawYMax;
  const yMin = log ? 10 ** minPower : Math.min(0, ...ys);
  const powerStep = Math.max(1, Math.ceil((maxPower - minPower) / 5));
  const yTicks = log
    ? [...new Set([...Array.from({ length: Math.floor((maxPower - minPower) / powerStep) + 1 }, (_, i) => 10 ** (minPower + i * powerStep)), yMax])]
    : integerAxis
      ? Array.from({ length: Math.round((yMax - yMin) / integerStep) + 1 }, (_, i) => yMin + i * integerStep)
      : Array.from({ length: 5 }, (_, i) => Number((yMin + (yMax - yMin) * i / 4).toPrecision(12)));
  const xTicks = [...new Set([xMin, numericX ? (xMin + xMax) / 2 : Math.round((xMin + xMax) / 2), xMax])];
  const left = Math.max(46, ...yTicks.map(tick => tickLabel(tick).length * 6.5 + 12));
  const right = width - Math.max(24, ...xTicks.map(tick => (numericX ? tickLabel(tick) : String(tick)).length * 3.5 + 4));
  const energyAxis = neuroaiEnergyAxis(plot, left, right);
  const x = energyAxis?.x ?? ((value: number) => left + (value - xMin) / (xMax - xMin) * (right - left));
  const breakNote = energyAxis ? wrapLabel(energyAxis.note, width - 12) : [];
  const height = baseHeight + (energyAxis ? breakNote.length * 16 + 12 : 0);
  const scaleNote = energyAxis ? "Piecewise linear x-axis · Linear y-axis" : `${log ? "Log" : "Linear"} scale`;
  const y = (value: number) => bottom - (log
    ? (Math.log10(value) - minPower) / (maxPower - minPower)
    : (value - yMin) / (yMax - yMin)) * (bottom - top);
  // Preserve the quantitative centers. Earlier overlapping marks become outer
  // rings, so subsequent filled marks cannot paint them out of the chart.
  const overlaps = plot.points.map(point => plot.points.filter(other => other.id !== point.id
    && Math.hypot(x(point.x) - x(other.x), y(point.y) - y(other.y)) < 14));
  const baseRadius = preview ? CHART_PRESENTATION.previewRadius : CHART_PRESENTATION.expandedRadius;
  const markerRadius = (index: number) => baseRadius + baseRadius * plot.points.slice(index + 1)
    .filter(point => overlaps[index].includes(point)).length;
  const overlapNote = overlaps.some(points => points.length > 0)
    ? "Rings keep overlapping observations visible at their source positions." : undefined;
  // Only callouts move. Search bounded slots for the closest free 20px badge;
  // leave clearance from both source glyphs and already placed badges.
  const placedKeys: { x: number; y: number }[] = [];
  const keySlots = Array.from({ length: Math.max(1, Math.floor((right - left - 24) / 24) + 1) }, (_, column) =>
    Array.from({ length: Math.floor((bottom - top - 24) / 24) + 1 }, (_, row) => ({ x: left + 12 + column * 24, y: top + 12 + row * 24 }))).flat();
  const annotations = plot.points.flatMap((point, index) => {
    const text = point.annotation?.trim() || (overlaps[index].length
      ? [point.label, point.group, qualifiedValue(point)].filter(Boolean).join(" · ") : "");
    if (!text) return [];
    // Keep callouts and their leaders in the observation's own linear segment;
    // otherwise a narrow card can accidentally draw a line across the break.
    const segment = energyAxis?.segments.find(segment => point.x >= segment.min && point.x <= segment.max);
    const annotationLeft = segment?.start ?? left;
    const annotationRight = segment?.end ?? right;
    const boundKeyX = (value: number) => segment && annotationRight - annotationLeft < 20
      ? (annotationLeft + annotationRight) / 2
      : Math.max(annotationLeft + 10, Math.min(annotationRight - 10, value));
    const order = overlaps[index].filter(other => plot.points.indexOf(other) < index).length;
    const side = overlaps[index].length ? (order % 2 ? 1 : -1) : (x(point.x) > (left + right) / 2 ? -1 : 1);
    const preferred = {
      x: boundKeyX(x(point.x) + side * 24),
      y: Math.max(top + 10, Math.min(bottom - 10, y(point.y)
        + (y(point.y) > (top + bottom) / 2 ? -1 : 1) * (24 + Math.floor(order / 2) * 24))),
    };
    const segmentSlots = segment ? keySlots.filter(slot => slot.x >= annotationLeft + 10 && slot.x <= annotationRight - 10) : keySlots;
    const position = [preferred, ...segmentSlots]
      .sort((a, b) => Math.hypot(a.x - preferred.x, a.y - preferred.y) - Math.hypot(b.x - preferred.x, b.y - preferred.y))
      .find(candidate => placedKeys.every(other => Math.abs(candidate.x - other.x) >= 23 || Math.abs(candidate.y - other.y) >= 23)
        && plot.points.every((other, otherIndex) => Math.hypot(
          Math.max(0, Math.abs(candidate.x - x(other.x)) - 10),
          Math.max(0, Math.abs(candidate.y - y(other.y)) - 10),
        ) >= markerRadius(otherIndex) + 3)) ?? preferred;
    placedKeys.push(position);
    return [{ point, text, ...position }];
  });
  const inspectProps = (point: DraftObservation) => ({
    tabIndex: 0, role: "button",
    "aria-label": `${point.annotation ? `${point.annotation}; ` : ""}${point.label}; ${point.group ?? ""}; ${point.dateLabel}; ${plot.yLabel}: ${qualifiedValue(point)}; ${point.sourceTitle}`,
    ...tooltip.pointProps(point, trigger => Array.from(trigger.closest("figure")?.querySelectorAll("[data-source-observation]") ?? [])
      .find(mark => mark.getAttribute("data-source-observation") === point.id) ?? null),
  });

  return <figure ref={figure} className="draft-plot" data-draft-preview={preview || undefined} aria-labelledby={`${id}-title`}>
    {!preview && shareAnchor && <ChartActions anchor={shareAnchor} title={plot.title}><ChartShare anchor={shareAnchor} title={plot.title} getChart={() => ({
      svg: figure.current!.querySelector("svg")!, title: plot.title, anchor: shareAnchor,
      legend,
      notes: [plot.scope, plot.seriesNote ?? "",
        ...(energyAxis ? [energyAxis.note] : []),
        ...(overlapNote ? [overlapNote] : []),
        ...(plot.points.some(point => point.qualifier) ? [`Qualified values (${plot.yLabel}): ${plot.points.filter(point => point.qualifier).map(point => `${point.label}: ${qualifiedValue(point)}`).join("; ")}.`] : []),
        `${observationBasis} · ${scaleNote} · Unconnected observations`,
        ...annotations.map(({ text }, index) => `${index + 1}. ${text}`),
        ...plot.points.filter(point => point.exportNote).map(point => `${point.label} · ${point.dateLabel}. ${point.exportNote}`),
        `Sources: ${[...new Set(plot.points.map(point => point.sourceTitle))].join("; ")}`],
    })} /></ChartActions>}
    <figcaption id={`${id}-title`}>{plot.title}</figcaption>
    <svg className="draft-plot-svg" viewBox={`0 0 ${width} ${height}`} aria-labelledby={`${id}-title`} aria-describedby={energyAxis ? `${id}-axis-break` : undefined}>
      <text className="draft-plot-axis-title" x={0} y={18}>{yTitle.map((line, index) => <tspan key={index} x={0} dy={index ? 16 : 0}>{line}{index < yTitle.length - 1 ? " " : ""}</tspan>)}</text>
      {yTicks.map(tick => <g key={tick}>
        {(energyAxis?.segments ?? [{ start: left, end: right }]).map((segment, index) => <line key={index} className="draft-plot-gridline" x1={segment.start} x2={segment.end} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />)}
        <text className="draft-plot-tick" x={left - 10} y={y(tick) + 4} textAnchor="end">{tickLabel(tick)}</text>
      </g>)}
      {energyAxis ? <>
        {energyAxis.segments.map((segment, index) => <line key={index} className="draft-plot-axis" data-x-axis-segment={index} x1={segment.start} x2={segment.end} y1={bottom} y2={bottom} />)}
        <g className="draft-plot-axis-break" data-x-axis-break aria-hidden="true">
          {[-3, 3].map(offset => <line key={offset} x1={energyAxis.center + offset - 2} x2={energyAxis.center + offset + 2} y1={bottom + 4} y2={bottom - 4} />)}
        </g>
      </> : <line className="draft-plot-axis" x1={left} x2={right} y1={bottom} y2={bottom} />}
      {(energyAxis?.ticks ?? xTicks).map(tick => <text className="draft-plot-tick" key={tick} x={x(tick)} y={bottom + 22} textAnchor="middle">{numericX ? tickLabel(tick) : String(tick)}</text>)}
      <text className="draft-plot-axis-title" x={0} y={bottom + 52} textAnchor="start">{xTitle.map((line, index) => <tspan key={index} x={0} dy={index ? 16 : 0}>{line}{index < xTitle.length - 1 ? " " : ""}</tspan>)}</text>
      {energyAxis && <text id={`${id}-axis-break`} className="draft-plot-break-note" data-x-axis-break-note x={0} y={baseHeight + 16}>
        {breakNote.map((line, index) => <tspan key={index} x={0} dy={index ? 16 : 0}>{line}{index < breakNote.length - 1 ? " " : ""}</tspan>)}
      </text>}
      {annotations.map(({ point, x: labelX, y: labelY }) => <line key={point.id} className="draft-annotation-leader" data-annotation-leader={point.id}
        x1={x(point.x)} y1={y(point.y)} x2={labelX} y2={labelY} stroke={groupColor(point)} aria-hidden="true" />)}
      {annotations.map(({ point, x: labelX, y: labelY }, index) => <g key={point.id} className="draft-annotation-key" data-annotation-key={point.id} aria-hidden="true">
        <rect x={labelX - 10} y={labelY - 10} width={20} height={20} rx={4} stroke={groupColor(point)} />
        <text x={labelX} y={labelY + 4} textAnchor="middle">{index + 1}</text>
      </g>)}
      {plot.points.map((point, index) => <ObservationMarker key={point.id} marker={point.marker} data-source-observation={point.id} cx={x(point.x)} cy={y(point.y)} r={markerRadius(index)}
        fill={markerRadius(index) > baseRadius ? "none" : groupColor(point)} stroke={markerRadius(index) > baseRadius ? groupColor(point) : "var(--surface)"}
        strokeWidth={CHART_PRESENTATION.markerStrokeWidth} vectorEffect="non-scaling-stroke"
        data-export-stroke-width={CHART_PRESENTATION.markerStrokeWidth} pointerEvents={markerRadius(index) > baseRadius ? "stroke" : undefined}
        {...(!preview ? inspectProps(point) : {})}
      />)}
    </svg>
    {overlapNote && <p className="draft-plot-overlap-note" data-overlap-note>{overlapNote}</p>}
    {!preview && annotations.length > 0 && <ul className="draft-point-annotations" aria-label="Labeled observations">{annotations.map(({ point, text }, index) => <li key={point.id}>
      <button type="button" data-point-annotation={point.id} {...inspectProps(point)}>
        <span className="draft-annotation-number" aria-hidden="true" style={{ color: groupColor(point) }}>{index + 1}</span>
        <span>{text}</span>
      </button>
    </li>)}</ul>}
    {legend.length > 0 && <ul className="draft-group-legend" data-draft-group-legend aria-label="Observation scopes">{legend.map(entry => <li key={entry.label}>
      <span aria-hidden="true" style={{ color: entry.color }}>{plot.legend || entry.marker ? <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true" focusable="false">
        <ObservationMarker marker={entry.marker} cx={7} cy={7} r={6} fill={entry.color} />
      </svg> : "●"}</span> {entry.label}
    </li>)}</ul>}
    {plot.points.some(point => point.qualifier) && <p className="draft-plot-qualifications" data-visible-qualifications>
      {plot.points.every(point => point.qualifier === "≈") ? "All plotted values are approximate (≈)." : <>
        <span>{plot.yLabel}: </span>
        {plot.points.filter(point => point.qualifier).map((point, index) => <span key={point.id} data-qualified-observation={point.id}>
          {index > 0 && "; "}{point.label}{!point.label.includes(qualifiedValue(point)) && `: ${qualifiedValue(point)}`}
        </span>)}
      </>}
    </p>}
    {!preview && <p className="draft-plot-legend"><span aria-hidden="true">●</span> {observationBasis} · {scaleNote} · Unconnected observations</p>}
    {!preview && <><PointTooltip {...tooltip.tooltipProps}>
      {active ? <>
        <strong>{active.label}</strong>
        {active.group && <p>{active.group}</p>}
        <p>{active.dateLabel}{numericX && ` · ${plot.xLabel}: ${exactNumber(active.x)}`}</p>
        <p>{plot.yLabel}: <strong>{qualifiedValue(active)}</strong></p>
        <a href={active.sourceUrl} target="_blank" rel="noreferrer">{active.sourceTitle} ↗</a>
        {active.note && <p>{active.note}</p>}
      </> : null}
    </PointTooltip>
    <details className="draft-plot-data">
      <summary>Data and sources ({plot.points.length})</summary>
      <p className="draft-plot-scope">{plot.scope}</p>
      {plot.seriesNote && <p>{plot.seriesNote}</p>}
      <div className="draft-plot-table-scroll" tabIndex={0} role="region" aria-label={`${plot.title} source table`}>
        <table>
          <caption>{plot.title} — {plot.observationBasis ?? "source-reported"} observations</caption>
          <thead><tr><th scope="col">Observation</th><th scope="col">{plot.xLabel}</th><th scope="col">{plot.yLabel}</th><th scope="col">Source and scope notes</th></tr></thead>
          <tbody>{plot.points.map(point => <tr key={point.id}>
            <th scope="row">{point.label}{point.group && <small>{point.group}</small>}</th>
            <td>{numericX && <>{exactNumber(point.x)}<br /></>}{point.dateLabel}</td>
            <td>{qualifiedValue(point)}</td>
            <td><a href={point.sourceUrl} target="_blank" rel="noreferrer">{point.sourceTitle} ↗</a><blockquote>{point.quote}</blockquote>{point.note && <p>{point.note}</p>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details></>}
  </figure>;
}

/** Categorical lanes carry no ordinal/impact score; positions encode dates only. */
export function DraftEventTimeline({ timeline, preview = false, shareAnchor }: { timeline: NonNullable<DraftChartEvidence["timeline"]>; preview?: boolean; shareAnchor?: string }) {
  const id = useId();
  const { width, figure } = usePlotWidth();
  const stages = [...new Set(timeline.events.map(event => event.stage))];
  const years = timeline.events.map(event => event.year);
  const first = Math.floor(Math.min(...years));
  const last = Math.max(first + 1, Math.ceil(Math.max(...years)));
  const xTitle = wrapLabel("Publication / demonstration year", width - 12);
  const baseHeight = Math.max(320, stages.length * 100 + 100);
  const height = baseHeight + (xTitle.length - 1) * 16;
  const x = (year: number) => 28 + (year - first) / (last - first) * (width - 56);
  const y = (stage: string) => 90 + stages.indexOf(stage) * 100;
  const ticks = [...new Set([first, Math.round((first + last) / 2), last])];
  return <figure ref={figure} className="draft-plot draft-event-timeline" data-draft-preview={preview || undefined} aria-labelledby={`${id}-title`}>
    {!preview && shareAnchor && <ChartActions anchor={shareAnchor} title="Selected application events"><ChartShare anchor={shareAnchor} title="Selected application events" getChart={() => ({
      svg: figure.current!.querySelector("svg")!, title: "Selected application events", anchor: shareAnchor,
      notes: [timeline.scope, "Stages identify the type of reported event.",
        ...timeline.events.map(event => `${event.dateLabel} · ${event.stage} · ${event.label} — ${event.sourceTitle}`)],
    })} /></ChartActions>}
    <figcaption id={`${id}-title`}>Selected application events</figcaption>
    {!preview && <p className="draft-plot-scope">{timeline.scope}</p>}
    <p className="draft-plot-legend">● Reported event · Stages identify the type of event</p>
    <svg className="draft-plot-svg" data-draft-event-timeline viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <desc id={`${id}-description`}>Events positioned by year. Full dates, stage labels and sources are listed below.</desc>
      {stages.map(stage => <g key={stage}>
        <text className="draft-plot-axis-title" x={0} y={y(stage) - 45}>{wrapLabel(stage, width - 12).map((line, index) => <tspan key={index} x={0} dy={index ? 16 : 0}>{line}{index < wrapLabel(stage, width - 12).length - 1 ? " " : ""}</tspan>)}</text>
        <line className="draft-plot-gridline" x1={28} x2={width - 28} y1={y(stage)} y2={y(stage)} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
      </g>)}
      {timeline.events.map(event => <circle key={event.id} data-source-event={event.id} cx={x(event.year)} cy={y(event.stage)} r={preview ? CHART_PRESENTATION.previewRadius : CHART_PRESENTATION.expandedRadius} fill="var(--accent)" stroke="var(--surface)" strokeWidth={CHART_PRESENTATION.markerStrokeWidth} vectorEffect="non-scaling-stroke"><title>{`${event.label} · ${event.dateLabel} · ${event.stage}`}</title></circle>)}
      {ticks.map(year => <text key={year} className="draft-plot-tick" x={x(year)} y={baseHeight - 45} textAnchor="middle">{year}</text>)}
      <text className="draft-plot-axis-title" x={0} y={baseHeight - 16} textAnchor="start">{xTitle.map((line, index) => <tspan key={index} x={0} dy={index ? 16 : 0}>{line}{index < xTitle.length - 1 ? " " : ""}</tspan>)}</text>
    </svg>
    {!preview && <ul className="draft-event-list">{timeline.events.map(event => <li key={event.id} data-draft-event={event.id}>
      <p className="draft-event-date">{event.dateLabel} · {event.stage}</p>
      <strong>{event.label}</strong>
      <p>{event.note}</p>
      <a href={event.sourceUrl} target="_blank" rel="noreferrer">{event.sourceTitle} ↗</a>
      <blockquote>{event.quote}</blockquote>
    </li>)}</ul>}
  </figure>;
}
