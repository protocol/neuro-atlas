"use client";

import React, { useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { recordingViewQuery, recordingViewToken, type RecordingViewId } from "@/lib/recording-view";
import { ChartModal } from "@/components/chart-modal";
import { ChartShare } from "@/components/chart-share";
import { ChartActions } from "@/components/chart-actions";
import { PointTooltip, usePointTooltip } from "@/components/point-source-tooltip";
import { DraftChartShare } from "@/components/draft-chart-share";
import { useExtrapolationMotion } from "@/components/use-extrapolation-motion";
import { usePreviewFont } from "@/components/use-preview-font";
import { CHART_PRESENTATION } from "@/lib/chart-presentation";
import type { PerformanceData } from "@/lib/field-velocity/performance";
import { RECORDING_VIEWS, RECORDING_CHECKED_AT, type RecordingView } from "@/data/recording-evidence";
import type { MeasurementPoint, MeasurementSeries } from "@/lib/field-velocity/schema";
import { usePerformanceHash, navigatePerformance } from "@/lib/field-velocity/navigation";
import { decimalYear, extrapolationScenario, type Crossing, type ExtrapolationKind, type ExtrapolationMode, type ExtrapolationScenario } from "@/lib/extrapolation";

const number = (value: number) => new Intl.NumberFormat("en", { maximumSignificantDigits: 7 }).format(value);
const colors = ["var(--accent)", "#087f8c", "#c16b0b", "#cc507b", "#438537", "#8a62bc", "#447dc4"];
export function pointDate(point: MeasurementPoint) {
  return point.datePrecision === "year" ? point.date.slice(0, 4) : point.datePrecision === "month" ? point.date.slice(0, 7) : point.date;
}
export function pointValue(point: MeasurementPoint) {
  const prefix = { approximate: "Approximately ", "at-least": "At least ", "greater-than": "More than " };
  return `${point.qualifier ? prefix[point.qualifier] : ""}${number(point.value)}`;
}

type PlotPoint = { date: string; value: number; label: string; track: string; trackIndex: number; lo?: number; hi?: number; reliable?: boolean; qualifiedValueLabel?: string; sourceUrl?: string; sourceLabel?: string };
export type PlotData = { xLabel?: string; title: string; unit: string; scale: "log" | "linear"; line: boolean; points: PlotPoint[]; tracks: { id: string; label: string }[]; exportNotes?: string[]; exportCaptionNotes?: string[] };

/** Axes always use the full source set; filtering never moves an observation. */
export function chartGeometry(data: PlotData) {
  const left = 100, right = 22, top = 28, bottom = 44, width = 720, height = 300;
  const times = data.points.map(p => Date.parse(p.date));
  const minTime = Math.min(...times), maxTime = Math.max(...times);
  const padding = Math.max((maxTime - minTime) * 0.035, 86400000 * 30);
  const values = data.points.flatMap(p => [p.value, ...(p.lo != null ? [p.lo] : []), ...(p.hi != null ? [p.hi] : [])]);
  const minValue = Math.min(...values), maxValue = Math.max(...values);
  const low = Math.floor(Math.log10(Math.max(minValue, Number.MIN_VALUE))), high = Math.max(low + 1, Math.ceil(Math.log10(maxValue)));
  const magnitude = 10 ** Math.floor(Math.log10(maxValue / 4));
  const step = Math.ceil(maxValue / 4 / magnitude) * magnitude;
  const ticks = data.scale === "log" ? Array.from({ length: high - low + 1 }, (_, i) => 10 ** (low + i)) : [0, 1, 2, 3, 4].map(i => i * step);
  const x = (date: string) => left + (Date.parse(date) - minTime + padding) / (maxTime - minTime + 2 * padding) * (width - left - right);
  const y = (value: number) => top + (1 - (data.scale === "log" ? (Math.log10(value) - low) / (high - low) : value / (step * 4))) * (height - top - bottom);
  return { width, height, left, right, minTime, maxTime, ticks, x, y };
}

/** A compact coordinate frame keeps card ticks readable without changing full-chart geometry. */
function compactChartGeometry(data: PlotData) {
  const full = chartGeometry(data);
  const width = 360, height = 220, left = 64, right = 16, top = 32, bottom = 52;
  return { ...full, width, height, left, right,
    x: (date: string) => left + (full.x(date) - full.left) / (full.width - full.left - full.right) * (width - left - right),
    y: (value: number) => top + (full.y(value) - 28) / (full.height - 28 - 44) * (height - top - bottom),
  };
}

/** Opt-in geometry only; the original geometry above remains the off-state path. */
function extrapolationGeometry(data: PlotData, scenario: ExtrapolationScenario) {
  const width = 720, height = 380, left = 100, right = 22, top = 56, bottom = 50;
  const years = data.points.map(p => decimalYear(p.date)).filter(Number.isFinite);
  const minYear = years.length ? Math.min(...years) : scenario.horizon - 10;
  const maxYear = Math.max(minYear + 1, scenario.horizon);
  const padding = Math.max((maxYear - minYear) * .035, 1 / 12);
  const values = data.points.flatMap(p => [p.value, p.lo, p.hi]).filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
  const low = Math.floor(Math.log10(Math.min(...values, ...scenario.targets.map(t => t.value))));
  const high = Math.max(low + 1, Math.ceil(Math.log10(Math.max(...values, ...scenario.targets.map(t => t.value)))));
  const tickStep = high - low > 8 ? 2 : 1;
  const ticks = Array.from({ length: Math.floor((high - low) / tickStep) + 1 }, (_, i) => 10 ** (low + i * tickStep));
  const xYear = (year: number) => left + (year - minYear + padding) / (maxYear - minYear + 2 * padding) * (width - left - right);
  const y = (value: number) => top + (1 - (Math.log10(value) - low) / (high - low)) * (height - top - bottom);
  const yearStep = maxYear - minYear > 100 ? 20 : 10;
  const firstTick = Math.ceil(minYear / yearStep) * yearStep;
  const yearTicks = Array.from({ length: Math.floor((maxYear - firstTick) / yearStep) + 1 }, (_, i) => firstTick + i * yearStep);
  return { width, height, left, right, ticks, x: (date: string) => xYear(decimalYear(date)), xYear, y, yearTicks, minTime: Date.UTC(Math.floor(minYear), 0, 1), maxTime: Date.UTC(maxYear, 0, 1) };
}

function crossingLabel(crossing: Crossing, kind: ExtrapolationKind) {
  const scope = kind === "hours" ? "TUSZ corpus-only · " : "Historical continuation · ";
  switch (crossing.status) {
    case "in-range": return `${scope}≈${Math.round(crossing.year)}`;
    case "beyond-range": return `${scope}beyond 2200 display range`;
    case "already-reached": return `${scope}at or below last source value`;
    case "no-crossing": return `${scope}not reached if plateau continues`;
    case "unavailable": return "No crossing estimate available";
  }
}

function ExtrapolationNotes({ scenario }: { scenario: ExtrapolationScenario }) {
  return <section className="pc-extrapolation-notes" data-extrapolation-summary="true" aria-label="Extrapolation methodology and limitations">
    <h4>{scenario.kind === "neurons" ? "Historical exponential continuation" : "TUSZ corpus-only scenario — not worldwide human data"}</h4>
    <p>Conditional scenario, not a current forecast or a deadline. Dashed lines are model output, not new observations.</p>
    {scenario.fit ? scenario.mode === "plateau" ? <p>No growth assumed: continue the last three equal release totals at 1,074 hours. Neither higher threshold is reached under that assumption.</p> : <p>Doubling time ≈{scenario.fit.doublingYears.toFixed(1)} years, {scenario.mode === "literature" ? "assumed from the literature, compared against" : "fitted to"} {scenario.fit.observationCount} selected points. {scenario.mode === "literature" ? "This is a separate 7-year literature assumption, not a fitted rate." : "The fit uses the natural log of each value against decimal year."} The continuation starts at the last actual value rather than the regression intercept.</p> : <p>No fit: insufficient comparable history or invalid/non-growing data. At least three distinct dates, positive finite values and a positive growth rate are required.</p>}
    {scenario.kind === "neurons" ? <p>These mixed-species historical electrical records end in 2014 and are not human-specific. {scenario.mode === "literature" ? <a href="https://stevenson.lab.uconn.edu/scaling/" target="_blank" rel="noreferrer">7-year literature pace source ↗</a> : "This selected-point fit is not the 7-year literature estimate."} Matching a neuron count does not establish the spatial or temporal coverage needed for successful whole-brain live simultaneous recording, or its feasibility.</p> : <>
      <p>Only the 8 full TUSZ release totals from 2017–2020 supply comparable history here. They are overlapping corpus snapshots, not summed; unchanged plateaus remain in the historical-expansion fit. The plateau scenario uses only the last three equal release totals. Other datasets and the nonhuman-primate POYO training corpus are never fitted or pooled.</p>
      <p>Worldwide human-data ETA unavailable. These milestones describe human-data scale, not a worldwide total established by these selected datasets. The article goal is 100 million hours, distinct from the 100,000-hour milestone.</p>
    </>}
    <ul className="pc-target-summary">{scenario.targets.map(target => <li key={target.id}>
      <span>{target.label}</span><strong data-crossing-label={target.id}>{crossingLabel(target.crossing, scenario.kind)}</strong>
      {target.sourceUrl && <a href={target.sourceUrl} target="_blank" rel="noreferrer">{target.sourceLabel} ↗</a>}
    </li>)}</ul>
    <p>{scenario.kind === "neurons" ? "Target counts are approximate reference assumptions, not recorded achievements. " : "Corpus growth does not establish worldwide data availability, quality, access or unique subject-hours. "}Long extrapolations are highly sensitive to the selected historical window; no confidence interval is claimed. Display capped at 2200.</p>
  </section>;
}

function CurvePlot({ data, compact = false, extrapolation, shareAnchor, intro, inspectOnActivate = false }: { data: PlotData; compact?: boolean; extrapolation?: ExtrapolationKind; shareAnchor?: string; intro?: React.ReactNode; inspectOnActivate?: boolean }) {
  const plotRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const singleObservation = data.points.length === 1;
  useLayoutEffect(() => {
    if (!inspectOnActivate || !scrollRef.current) return;
    const viewport = scrollRef.current;
    // Reveal the sole source mark in a narrow horizontal viewport, without
    // selecting it, moving its coordinates, or changing the exported SVG.
    const reveal = () => { viewport.scrollLeft = singleObservation ? Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2) : 0; };
    reveal();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(reveal);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [inspectOnActivate, singleObservation, data.title]);
  const [track, setTrack] = useState("");
  const [extrapolate, setExtrapolate] = useState(false);
  const [mode, setMode] = useState<ExtrapolationMode>("historical");
  // Validate against the visible source set so measurement/track changes clear
  // stale inspection without remounting the native selector.
  const tooltip = usePointTooltip(data.points.filter(point => !track || point.track === track));
  const active = tooltip.active;
  const extrapolationHint = useId();
  const progress = useExtrapolationMotion(!compact && !!extrapolation && extrapolate);
  const scenario = !compact && (extrapolate || progress > 0) && extrapolation ? extrapolationScenario(extrapolation, data.points, track, mode) : null;
  // Filtering suppresses unsupported model output, but never moves source markers.
  const future = scenario && extrapolation ? extrapolationGeometry(data, extrapolationScenario(extrapolation, data.points, "", mode)) : null;
  const original = compact ? compactChartGeometry(data) : chartGeometry(data);

  const mix = (from: number, to: number) => progress === 0 ? from : progress === 1 ? to : from + (to - from) * progress;
  const g = !future || progress === 0 ? original : progress === 1 ? future : {
    ...original,
    height: mix(original.height, future.height),
    x: (date: string) => mix(original.x(date), future.x(date)),
    y: (value: number) => mix(original.y(value), future.y(Math.max(value, future.ticks[0]))),
  };
  const moving = !!future && progress < 1;
  // Share the existing typography observer; full-chart marks also need the
  // fitted screen scale when the modal's max-height letterboxes its SVG.
  const { ref: presentationRef, fontSize: previewFontSize, unitsPerPixel } = usePreviewFont(g.width, true, g.height);
  // Values outside the old domain enter at its edge, not millions of SVG units away.
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
  const enteringY = (value: number) => future ? mix(clamp(original.y(value), 28, original.height - 44), future.y(value)) : original.y(value);
  const enteringX = (year: number) => {
    const whole = Math.floor(year);
    const time = Date.UTC(whole, 0, 1) + (year - whole) * (Date.UTC(whole + 1, 0, 1) - Date.UTC(whole, 0, 1));
    return future ? mix(clamp(original.x(new Date(Math.round(time)).toISOString()), g.left, g.width - g.right), future.xYear(year)) : g.left;
  };
  const ticks = moving && future ? [...new Set([...original.ticks, ...future.ticks])].sort((a, b) => a - b) : g.ticks;
  // Let new ticks separate before revealing labels that enter at the same edge.
  const tickReveal = Math.max(0, (progress - .4) / .6);
  const tickOpacity = (tick: number) => !moving || !future ? undefined : original.ticks.includes(tick) ? (future.ticks.includes(tick) ? 1 : 1 - progress) : tickReveal;
  const tickY = (tick: number) => original.ticks.includes(tick) ? g.y(tick) : enteringY(tick);
  const reveal = Math.max(0, (progress - .75) / .25);
  const scale = scenario ? "log" : data.scale;
  const points = data.points.filter(p => !track || p.track === track);
  const recordingDateTicks = inspectOnActivate ? [...new Set([g.minTime, g.maxTime])].map(time => ({
    date: new Date(time).toISOString(),
    label: g.minTime !== g.maxTime && new Date(g.minTime).getUTCFullYear() === new Date(g.maxTime).getUTCFullYear()
      ? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(time)
      : String(new Date(time).getUTCFullYear()),
  })) : null;
  const clusters: PlotPoint[][] = [];
  for (const point of points) {
    const group = clusters.find(c => Math.abs(g.x(c[0].date) - g.x(point.date)) < 12 && Math.abs(g.y(c[0].value) - g.y(point.value)) < 12);
    if (group) group.push(point); else clusters.push([point]);
  }
  return <>
    {!compact && shareAnchor && <ChartActions anchor={shareAnchor} title={data.title}><ChartShare key={inspectOnActivate ? data.title : undefined} anchor={shareAnchor} title={data.title} disabled={moving} getChart={() => {
      const root = plotRef.current!;
      const detail = root.closest(".pc-detail")!;
      return { svg: root.querySelector("svg")!, title: data.title, anchor: shareAnchor, captionNotes: data.exportCaptionNotes,
        legend: data.tracks.filter(t => !track || t.id === track).map(t => ({ label: t.label, color: colors[data.tracks.indexOf(t) % colors.length] })),
        notes: [
          ...(data.exportNotes ?? []),
        ...points.flatMap(point => point.qualifiedValueLabel ? [point.qualifiedValueLabel] : []),
          ...Array.from(detail.querySelectorAll(".pc-methodology > p:first-of-type, .pc-caveat"), node => node.textContent ?? ""),
          ...Array.from(detail.querySelectorAll(".pc-methodology dl > div"))
            .filter(node => !track || node.querySelector("dt")?.textContent === data.tracks.find(t => t.id === track)?.label)
            .map(node => `${node.querySelector("dt")?.textContent}: ${node.querySelector("dd")?.textContent}`),
          data.line ? "Lines connect selected frontier checkpoints." : "Separate source observations; overlapping markers retain their coordinates.",
          ...(data.points.some(p => p.lo != null) ? ["Whiskers: source intervals. Hollow markers: under-indexed observations."] : []),
          ...(scenario ? [`Scenario: ${root.querySelector<HTMLSelectElement>("[data-scenario-select]")?.selectedOptions[0]?.textContent ?? mode}. Conditional continuation, not a forecast.`,
            ...Array.from(root.querySelectorAll(".pc-scenario-warning, .pc-extrapolation-notes > p, .pc-fit-diagnostics > strong, .pc-fit-diagnostics > span"), node => node.textContent ?? "")] : []),
          `Sources: ${Array.from(detail.querySelectorAll(".pc-sources a"), node => node.textContent?.replace(/ ↗$/, "")).join("; ") || [...new Set(data.points.map(p => p.label.split(". ").at(-1)))].join("; ")}`,
        ],
      };
    }} /></ChartActions>}
    {intro}
    <div ref={plotRef} className={compact ? "pc-preview" : "pc-plot"} data-extrapolation={scenario ? "on" : undefined}>
    {!compact && extrapolation && <div className="pc-extrapolation-control">
      <button type="button" role="switch" aria-checked={extrapolate} aria-describedby={extrapolationHint} onClick={() => setExtrapolate(on => !on)}>
        <span className="pc-switch-track" aria-hidden="true" /><span>Extrapolation</span><span className="pc-switch-state" aria-hidden="true">{extrapolate ? "On" : "Off"}</span>
      </button>
      <span id={extrapolationHint} className="pc-extrapolation-hint">
        <span aria-hidden={extrapolate} style={{ visibility: extrapolate ? "hidden" : "visible" }}>Off by default · original observations and axes</span>
        <span aria-hidden={!extrapolate} style={{ visibility: extrapolate ? "visible" : "hidden" }}>{extrapolation === "hours" ? "Axis switched from linear to log · targets span 100 million hours" : "Conditional model · expanded time range"}</span>
      </span>
    </div>}
    {!compact && data.tracks.length > 1 && <label className="pc-track-select">Dataset / track
      <select value={track} onChange={e => setTrack(e.target.value)}>
        <option value="">All tracks</option>
        {data.tracks.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <span>Isolate a track · axes stay fixed</span>
    </label>}
    <div ref={scrollRef} className="pc-chart-scroll" data-motion={moving || undefined} style={moving ? {
      "--pc-chart-min-width": `${mix(560, 720)}px`,
      "--pc-chart-max-height": `calc(410px + ${progress} * max(0px, 100vw - 410px))`,
    } as React.CSSProperties : undefined} role={compact ? undefined : "region"} aria-label={compact ? undefined : `${data.title} chart`} tabIndex={compact ? undefined : 0}>
      <svg ref={presentationRef} style={{ fontSize: previewFontSize }} data-export-font-size={CHART_PRESENTATION.labelFontSize} viewBox={`0 0 ${g.width} ${g.height}`} aria-hidden={compact || undefined} role={compact ? undefined : "img"} aria-label={compact ? undefined : `${data.title}. ${scale} ${data.unit} axis. ${data.line ? "Historical frontier checkpoints." : "Separate source observations."}${scenario ? " Dashed conditional extrapolation and reference targets; not a forecast." : ""}`}>
        <text x={0} y={compact ? Math.max(16, previewFontSize * 1.2) : 16}>{data.unit} · {scale} scale</text>
        {ticks.map(tick => <g key={tick} opacity={tickOpacity(tick)}>
          <line className="pc-gridline" x1={g.left} x2={g.width - g.right} y1={tickY(tick)} y2={tickY(tick)} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          <text x={g.left - 9} y={tickY(tick) + 4} textAnchor="end">{scenario || compact ? new Intl.NumberFormat("en", { notation: "compact", maximumSignificantDigits: 3 }).format(tick) : number(tick)}</text>
        </g>)}
        {data.line && <polyline data-frontier-line="true" points={points.map(p => `${g.x(p.date)},${g.y(p.value)}`).join(" ")} fill="none" stroke="var(--accent)" strokeWidth={2.5} />}
        {scenario && future && <g className="pc-extrapolation-overlay" opacity={moving ? reveal : undefined}>
          {scenario.targets.map(target => <g key={target.id}>
            <line data-target-line={target.id} x1={g.left} x2={g.width - g.right} y1={enteringY(target.value)} y2={enteringY(target.value)} stroke="var(--muted)" strokeDasharray="4 4" />
            <text className="pc-target-label" x={g.left + 8} y={enteringY(target.value) - 25}>
              <tspan x={g.left + 8}>{target.label}</tspan>
              <tspan x={g.left + 8} dy={15}>{crossingLabel(target.crossing, scenario.kind)}</tspan>
            </text>
          </g>)}
          {scenario.samples.length > 0 && <polyline data-extrapolation-line={scenario.kind} points={scenario.samples.map(p => `${enteringX(p.year)},${enteringY(p.value)}`).join(" ")} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeDasharray="8 5" />}
        </g>}
        {points.filter(p => p.lo != null && p.hi != null).map(p => <line key={`interval:${p.date}`} data-confidence={compact ? undefined : p.date} x1={g.x(p.date)} x2={g.x(p.date)} y1={g.y(p.lo!)} y2={g.y(p.hi!)} stroke="var(--accent)" strokeWidth={compact ? 2 : 3} opacity={.4} />)}
        {points.map((p, i) => <circle key={`${p.track}:${p.date}:${i}`} data-curve-point={compact ? undefined : `${p.track}:${p.date}`} data-value={compact ? undefined : p.value} cx={g.x(p.date)} cy={g.y(p.value)} r={(compact ? CHART_PRESENTATION.previewRadius : active === p ? CHART_PRESENTATION.focusRadius : CHART_PRESENTATION.expandedRadius) * unitsPerPixel} data-under-indexed={p.reliable === false || undefined} fill={p.reliable === false ? "var(--surface)" : colors[p.trackIndex % colors.length]} stroke={p.reliable === false ? colors[p.trackIndex % colors.length] : "var(--surface)"} strokeWidth={CHART_PRESENTATION.markerStrokeWidth} vectorEffect="non-scaling-stroke"
          data-export-r={CHART_PRESENTATION.expandedRadius} tabIndex={compact ? undefined : 0} role={compact ? undefined : inspectOnActivate ? "button" : "img"} aria-label={compact ? undefined : p.label}
          {...(!compact ? tooltip.pointProps(p) : {})} />)}
        {!compact && clusters.filter(c => c.length > 1).map(c => <text key={`${c[0].track}:${c[0].date}`} x={Math.min(g.width - 100, g.x(c[0].date))} y={g.y(c[0].value) + 20}>{c.length} checkpoints</text>)}
        {moving && future ? <>
          <text x={mix(g.left, future.x(new Date(original.minTime).toISOString().slice(0, 10)))} y={g.height - 20} opacity={1 - progress}>{new Date(original.minTime).getUTCFullYear()}</text>
          <text x={mix(g.width - g.right, future.x(new Date(original.maxTime).toISOString().slice(0, 10)))} y={g.height - 20} textAnchor="end" opacity={1 - progress}>{new Date(original.maxTime).getUTCFullYear()}</text>
          {future.yearTicks.map(year => <text key={year} x={enteringX(year)} y={g.height - 20} textAnchor="middle" opacity={tickReveal}>{year}</text>)}
        </> : future ? future.yearTicks.map(year => <text key={year} x={future.xYear(year)} y={g.height - 20} textAnchor="middle">{year}</text>) : recordingDateTicks ? recordingDateTicks.map(tick => <text key={tick.date} x={g.x(tick.date)} y={g.height - 20} textAnchor="middle">{tick.label}</text>) : <>
          <text x={g.left} y={g.height - 20}>{new Date(g.minTime).getUTCFullYear()}</text>
          <text x={g.width - g.right} y={g.height - 20} textAnchor="end">{new Date(g.maxTime).getUTCFullYear()}</text>
        </>}
        {!compact && <text x={0} y={g.height - 3} textAnchor="start">{scenario ? "Year · historical observations + conditional continuation" : (data.xLabel ?? (data.line ? "Year · historical frontier" : "Date · source basis varies"))}</text>}
      </svg>
    </div>
    {compact && <span className="pc-preview-axis">{data.xLabel ?? (data.line ? "Year · historical frontier" : "Date · source basis varies")}</span>}
    {!compact && <PointTooltip {...tooltip.tooltipProps}>{active && <>
      <p data-point-description>{active.label}</p>
      {active.sourceUrl && <a href={active.sourceUrl} target="_blank" rel="noreferrer">{active.sourceLabel} ↗</a>}
    </>}</PointTooltip>}
    {!compact && <p className="pc-chart-note">{data.line ? "Lines connect selected frontier checkpoints." : "Separate source observations; overlapping markers retain their coordinates."}</p>}
    {!compact && <ul className="pc-legend">{data.tracks.map((t, i) => <li key={t.id}><span style={{ background: colors[i % colors.length] }} />{t.label}</li>)}</ul>}
    {extrapolate && scenario && <>
      <p className="pc-scenario-warning" data-scenario-warning="true">{scenario.kind === "neurons" ? "Historical records stop in 2014. Neuron-count equivalence is not successful whole-brain live recording." : "TUSZ corpus only — not worldwide human data. The last three releases stay at 1,074 h; the expansion scenario assumes earlier growth resumes indefinitely."}</p>
      <label className="pc-track-select pc-scenario-select">Growth scenario
        <select data-scenario-select="true" aria-label="Growth scenario" value={mode} onChange={e => setMode(e.target.value as ExtrapolationMode)}>
          <option value="historical">{scenario.kind === "neurons" ? "Full-history fit · 1957–2014" : "Expansion resumes"}</option>
          {scenario.kind === "neurons" ? <><option value="recent">Later-history fit · 1991–2014</option><option value="literature">Literature pace · 7-year doubling</option></> : <option value="plateau">Latest plateau continues · no growth</option>}
        </select>
        <span>Alternative assumptions, not confidence bounds</span>
      </label>
      {scenario.fit && <div className="pc-fit-diagnostics" data-fit-diagnostics="true" role="status">
        <strong>R² (log, anchored scenario): {scenario.fit.anchoredRSquared == null ? "N/A — constant values" : scenario.fit.anchoredRSquared.toFixed(3)}</strong>
        <span>{scenario.fit.observationCount} observations · {Math.floor(scenario.fit.firstYear)}–{Math.floor(scenario.fit.anchor.year)}</span>
        <details><summary>How to read the fit</summary>
          <p>R² describes historical fit in log space, not forecast confidence or the probability of reaching a target. The anchored scenario is evaluated against the same historical window.</p>
          <p>{scenario.fit.rSquared == null ? "No unconstrained OLS R² is claimed for an assumed literature pace or a constant-value plateau." : `Unconstrained historical log-linear fit R²: ${scenario.fit.rSquared.toFixed(3)}. Its slope is retained, but the dashed continuation is re-anchored at the latest observation; the two R² values therefore differ.`} No statistical prediction interval is shown.</p>
        </details>
      </div>}
    </>}
    {extrapolate && scenario && <ExtrapolationNotes scenario={scenario} />}
  </div></>;
}

export function CurveCard({ id, title, coverage, plot, children, sourceLinks, previewNote, modalIntro, modalPlot }: { id: string; title: string; eyebrow: string; coverage: string; plot?: PlotData; children: React.ReactNode; sourceLinks?: readonly { label: string; url: string }[]; previewNote?: string; modalIntro?: React.ReactNode; modalPlot?: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  const hash = usePerformanceHash();
  const open = hash === `#${id}`;
  const share = <DraftChartShare anchor={id} label={title} className="pc-share" />;
  return <article className="pc-card card" data-metric-tile data-performance-card={id}>
    <button ref={ref} type="button" className="pc-trigger" data-metric-card-body aria-haspopup="dialog" aria-expanded={open} onClick={() => navigatePerformance(id)}>

      <span className="pc-card-title">{title}</span>
      {plot && <CurvePlot data={plot} compact />}
      <span className="pc-coverage">{coverage}</span>
      {previewNote && <span className="pc-preview-qualification">{previewNote}</span>}
    </button>
    <div className="pc-card-share" data-metric-card-footer>
      {sourceLinks?.length ? <div className="pc-preview-sources">{sourceLinks.map(source => <a key={source.url} data-curve-source-link href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div> : null}
      {share}
    </div>
    {open && <ChartModal id={id} title={title} returnFocus={ref}>
      {modalPlot ?? (plot ? <CurvePlot data={plot} shareAnchor={id} intro={modalIntro} extrapolation={id === "neural-recording-hours" ? "hours" : undefined} /> : <><ChartActions anchor={id} title={title} />{modalIntro}</>)}
      {children}
    </ChartModal>}
  </article>;
}

export function MeasurementCard({ series, provenance, anchor = series.id, previewNote }: { series: MeasurementSeries; provenance?: React.ReactNode; anchor?: string; previewNote?: string }) {
  const points = series.tracks.flatMap((t, trackIndex) => t.points.map(p => ({ ...p, track: t.id, trackIndex, qualifiedValueLabel: p.qualifier ? `${p.label}: ${pointValue(p)} ${series.unit}` : undefined, label: `${p.label}: ${pointValue(p)} ${series.unit}; ${pointDate(p)} (${p.datePrecision} precision, ${p.dateBasis}). ${p.sourceLabel}` })));
  const plot: PlotData = { title: series.title, unit: series.unit, scale: series.scale, line: false, points, tracks: series.tracks };
  return <CurveCard id={anchor} title={series.title} previewNote={previewNote} eyebrow={series.lens === "data-supply" ? "Data supply" : "Capability"} coverage={series.coverage} plot={plot}>
    <section className="pc-methodology" aria-label={`${series.title} definitions and methodology`}>
      <h4>Definitions &amp; methodology</h4>
      <p>{series.description}</p>
      <p className="pc-caveat">{series.caveat}</p>
      <p>Source checked {series.checkedAt}. Dates retain their stated year, month or day precision; each marker is a source observation.</p>
      <dl>{series.tracks.map(t => <div key={t.id}><dt>{t.label}</dt><dd>{t.definition}</dd></div>)}</dl>
    </section>
    <div className="pc-table-scroll" role="region" aria-label={`${series.title} source data`} tabIndex={0}>
      <table>
        <caption>Sources &amp; chart data · {points.length} observations</caption>
        <thead><tr><th scope="col">Dataset / release</th><th scope="col">Date &amp; basis</th><th scope="col">Value ({series.unit})</th><th scope="col">Source &amp; context</th></tr></thead>
        <tbody>{series.tracks.flatMap(t => t.points.map(p => <tr key={`${t.id}:${p.date}`} data-source-observation={`${t.id}:${p.date}`}>
          <th scope="row">{p.label}<small>{t.label}</small></th>
          <td>{pointDate(p)}<small>{p.datePrecision} precision · {p.dateBasis}</small></td>
          <td className="tnum">{pointValue(p)} {series.unit}</td>
          <td><a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.sourceLabel} ↗</a><p>{p.note}</p></td>
        </tr>))}</tbody>
      </table>
    </div>
    {provenance}
  </CurveCard>;
}

const recordingAnchor = "simultaneously-recorded-neurons";
const recordingTitle = "Simultaneous neural recordings";
function recordingPlot(view: RecordingView): PlotData {
  return {
    title: `${recordingTitle} — ${view.label}`, unit: view.unit, scale: "log", line: false,
    xLabel: "Source publication / disclosure date",
    tracks: [{ id: view.id, label: view.label }],
    exportCaptionNotes: [
      view.description,
      ...view.points.map(p => `${p.label}: ${pointValue(p)} ${p.unit} · ${p.preparation.split(" · ")[0]} · ${pointDate(p)} (${p.dateBasis}). ${p.sourceLabel}.`),
      `Selected individual sessions · source-specific quality criteria · source checked ${RECORDING_CHECKED_AT}. Full evidence and methods at the chart link.`,
    ],
    exportNotes: [
      `Source checked ${RECORDING_CHECKED_AT}. Dates identify source publication or disclosure, with the stated precision. Selected observed values.`,
      ...view.points.map(p => `${p.label}: ${pointValue(p)} ${p.unit}; ${pointDate(p)} (${p.datePrecision} precision, ${p.dateBasis}). ${p.preparation}. ${p.note} Source: ${p.sourceLabel} — ${p.sourceUrl}`),
    ],
    points: view.points.map(p => ({ ...p, track: view.id, trackIndex: 0,
      label: `${p.label}: ${pointValue(p)} ${p.unit}; ${pointDate(p)} (${p.datePrecision} precision, ${p.dateBasis}). ${p.preparation}. ${p.note} ${p.sourceLabel}`,
    })),
  };
}
function subscribeRecordingView(callback: () => void) {
  const events = ["popstate", "hashchange", "atlas-performance-location"];
  events.forEach(event => window.addEventListener(event, callback));
  return () => events.forEach(event => window.removeEventListener(event, callback));
}
const recordingViewSnapshot = () => recordingViewToken(new URL(window.location.href)) ?? "electrical";
function selectRecordingView(id: RecordingViewId) {
  const url = new URL(window.location.href);
  url.searchParams.set(recordingViewQuery, id);
  // A view change gets its own Back/Forward entry. Close must dismiss the modal,
  // not just back into its previous view; direct-link close uses the same rule.
  window.history.pushState({ ...window.history.state, atlasModalFrom: null }, "", url);
  window.dispatchEvent(new Event("atlas-performance-location"));
}
function RecordingCard({ historical, historicalProvenance }: { historical: PerformanceData["record"]; historicalProvenance: React.ReactNode }) {
  const viewId = useSyncExternalStore(subscribeRecordingView, recordingViewSnapshot, () => "electrical");
  const view = RECORDING_VIEWS.find(v => v.id === viewId)!;
  return <CurveCard id={recordingAnchor} title={recordingTitle} eyebrow="Recording evidence"
    coverage="Selected studies: electrical units, human implant channels and optical cellular signals."
    previewNote="Preview: in-vivo electrical units per session."
    plot={recordingPlot(RECORDING_VIEWS[0])}
    modalPlot={<div data-recording-view={view.id}>
      <CurvePlot data={recordingPlot(view)} shareAnchor={recordingAnchor} inspectOnActivate intro={
        <label className="pc-track-select pc-recording-view">Measurement view
          <select data-recording-view-select value={view.id} onChange={event => selectRecordingView(event.target.value as RecordingViewId)}>
            {RECORDING_VIEWS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
      } />
    </div>}>
    <section className="pc-methodology" aria-label="Recording evidence definitions and methodology">
      <h4>Definition and methodology · {view.label}</h4>
      <p>{view.description}</p><p className="pc-caveat">{view.caveat}</p>
      <p>Dates identify source publication or disclosure, with the stated precision. Source checked {RECORDING_CHECKED_AT}.</p>
    </section>
    <div className="pc-table-scroll" role="region" aria-label={`${view.label} source data`} tabIndex={0}>
      <table><caption>Sources &amp; chart data · {view.points.length} observations</caption>
        <thead><tr><th scope="col">Study / preparation</th><th scope="col">Date &amp; basis</th><th scope="col">Value &amp; units</th><th scope="col">Source &amp; context</th></tr></thead>
        <tbody>{view.points.map(p => <tr key={p.id} data-source-observation={p.id}>
          <th scope="row">{p.label}<small>{p.preparation}</small></th>
          <td>{pointDate(p)}<small>{p.datePrecision} precision · {p.dateBasis}</small></td>
          <td>{pointValue(p)} {p.unit}</td>
          <td><a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.sourceLabel} ↗</a><p>{p.note}</p><p>Source excerpt: “{p.quote}”</p></td>
        </tr>)}</tbody>
      </table>
    </div>
    <ul className="pc-sources">{view.points.map(p => <li key={p.id}><a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.sourceLabel} ↗</a></li>)}</ul>
    {historical.state === "reading" && <details className="pc-provenance" data-recording-history>
      <summary>Historical benchmarks · 1957–2014</summary>
      <p>Historical tracker values with year precision and mixed preparations, retained as a separate reference. Experiment dates and unit-quality criteria remain unverified.</p>
      <div className="pc-table-scroll" role="region" aria-label="Historical recording benchmarks" tabIndex={0}>
        <table><caption>Historical provider data · {historical.series!.length} retained checkpoints</caption>
          <thead><tr><th scope="col">Tracker year</th><th scope="col">Reported neurons</th><th scope="col">Preparation / qualification</th></tr></thead>
          <tbody>{historical.series!.map(p => <tr key={String(p.x)} data-historical-year={p.x} data-historical-value={p.y}>
            <th scope="row">{p.x}<small>year precision · inherited tracker date</small></th>
            <td>{p.x === 2014 ? "Approximately " : ""}{number(p.y)}</td>
            <td>{p.x === 2014 ? <>Isolated neonatal mouse retina · ex vivo · approximate tracker estimate. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3979611/" target="_blank" rel="noreferrer">Maccione et al. (2014) ↗</a></> : "Preparation and unit-quality criteria remain unverified in this historical tracker."}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <ul>{historical.sources!.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label} ↗</a></li>)}</ul>
      {historicalProvenance}
    </details>}
  </CurveCard>;
}

type Provenance = { providerCommit: string; sha256: string; exportGeneratedAt: string; source: { repository: string } };
export function PerformanceCurves({ data, provenance, selection, flat = false }: { data: PerformanceData; provenance: Provenance; selection?: readonly string[]; flat?: boolean }) {
  const includes = (id: string) => !selection || selection.includes(id);
  const provenanceDetails = <details className="pc-provenance"><summary>Export &amp; source provenance</summary>
      <p>Archived PL R&amp;D source snapshot.</p>
      <p>Export assembled <time dateTime={provenance.exportGeneratedAt}>{provenance.exportGeneratedAt}</time>.</p>
      <p><a href={`${provenance.source.repository}/tree/${provenance.providerCommit}`} target="_blank" rel="noreferrer">Provider revision {provenance.providerCommit} ↗</a></p>
      <p>Export SHA-256: <code>{provenance.sha256}</code></p>
    </details>;
  const cards = <>
      {includes("simultaneously-recorded-neurons") && <RecordingCard historical={data.record} historicalProvenance={provenanceDetails} />}
      {data.measurements.filter(s => includes(s.id)).map(s => <MeasurementCard key={s.id} series={s} provenance={flat ? provenanceDetails : undefined} />)}
      {!flat && includes("channel-count-frontier") && <article className="pc-card card pc-placeholder" data-coming-soon="channel-count-frontier" aria-labelledby="channel-count-title">
        <span className="pc-eyebrow">Planned capability metric</span>
        <h3 className="pc-card-title" id="channel-count-title">Channel count frontier</h3>
        <p className="pc-coverage">Maximum simultaneously recorded channels in a human, over time. Not yet wired; channels are not recorded neurons.</p>
        <div className="pc-preview pc-placeholder-preview">
          {/* Decorative placeholder only: no observations, values or inferred frontier. */}
          <svg viewBox="0 0 720 300" aria-hidden="true" focusable="false">
            <path d="M100 28V256H698 M100 85H698 M100 142H698 M100 199H698" fill="none" stroke="var(--border-strong)" strokeWidth="2" />
            <path d="M112 240C240 236 260 206 350 198S490 136 540 120S650 72 684 42" fill="none" stroke="var(--accent)" strokeWidth="5" />
          </svg>
          <span className="pc-coming-soon-label">Coming soon</span>
        </div>
        <p className="pc-chart-note">Source series not assembled yet. Preview is illustrative, not data.</p>
      </article>}
  </>;
  if (flat) return cards;
  return <section className="performance-curves" id={selection ? undefined : "performance_curves"} aria-label="Performance curves">
    {!selection && <><header className="pc-section-header"><div><p className="pc-eyebrow">Neurotech · capability &amp; data supply</p><h2 id="performance-title">Performance curves</h2></div><span className="pc-bounded">Selected sourced checkpoints</span></header>
    <p className="pc-intro">Recording capability, mapped tissue and neural data supply. Different units and coverage, not a single score for the field. Expand a card to inspect definitions, dates and source evidence.</p></>}
    <div className="pc-grid">{cards}</div>
    {provenanceDetails}
  </section>;
}
