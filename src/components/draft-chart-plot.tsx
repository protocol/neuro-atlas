"use client";

import { useMetricPreviewSpace } from "./use-metric-preview-space";

import { useContext, useEffect, useId, useMemo, useRef, useState, type SVGAttributes } from "react";
import type { DraftChartEvidence, DraftObservation, DraftPlot } from "@/lib/draft-chart-types";
import { ChartShare } from "@/components/chart-share";
import { ChartNoteList } from "@/components/chart-note-list";
import { ChartActions } from "@/components/chart-actions";
import { ModalData, ModalSources, ModalSlotsContext } from "@/components/chart-modal-slots";
import { PointTooltip, usePointTooltip } from "@/components/point-source-tooltip";
import { ChartYearGuides, annualYears } from "@/components/chart-year-guides";
import { CHART_PRESENTATION } from "@/lib/chart-presentation";
import { neuroaiEnergyAxis } from "@/lib/neuroai-energy-axis";
import { brainBenchmarkContext } from "@/lib/connectomics-brain-benchmarks";
import { compactCount, countWords } from "@/lib/large-count-label";
import { ACQUISITION_HUMAN_COST_NOTE, ACQUISITION_METRICS, HUMAN_IMAGE_VOXELS, acquisitionAxisTick, acquisitionBenchmark, acquisitionEfficiency, acquisitionMetricPlot, acquisitionNumber, acquisitionValue, supportsAcquisitionMetrics } from "@/lib/acquisition-metric";
import { observationReferences, observationSourceDescription, type ConfirmedReference } from "@/lib/draft-chart-references";
import { useAcquisitionMetric, useChartToggle } from "@/lib/field-velocity/navigation";
import { useBrainScaleMotion } from "./use-brain-scale-motion";
import { recordingAverages, recordingBar, recordingReferences, validRecordingCount } from "@/data/recording-hours-coverage";
import { RETINAL_OUTPUT, humanRetinalScenario, retinalScenarioLabel, retinalScenarioAssumptions } from "@/data/sensory-context";

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

/** Round landmarks inside the existing domain; observation coordinates and bounds stay exact. */
function readerTicks(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min];
  const raw = (max - min) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const factor = [1, 2, 2.5, 5, 10].find(value => value * magnitude >= raw)!;
  const step = factor * magnitude;
  const first = Math.ceil(min / step), last = Math.floor(max / step);
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => Number(((first + index) * step).toPrecision(12)));
}
const previewTickLabel = (value: number) => value !== 0 && Math.abs(value) < .001 ? value.toExponential(0).replace("e+", "e") : tickLabel(value);

/** Opt-in calendar multiples inside the unchanged domain, with bounded allocation. */
function steppedYearTicks(min: number, max: number, step?: number) {
  if (step === undefined || !Number.isSafeInteger(step) || step <= 0) return null;
  const first = Math.ceil(min / step) * step;
  const count = Math.floor((max - first) / step) + 1;
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) return null;
  return Array.from({ length: count }, (_, index) => first + index * step);
}

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
  if (marker === "diamond") {
    return <polygon points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`} {...props} />;
  }
  return <circle cx={cx} cy={cy} r={r} {...props} />;
}

function recordingCoverageLabel(coverage: NonNullable<DraftObservation["recordingCoverage"]>) {
  const people = coverage.count == null ? `${coverage.unit} not disclosed`
    : validRecordingCount(coverage.count) ? `${exactNumber(coverage.count)} ${coverage.unit}` : `${coverage.unit} unavailable (invalid count)`;
  const sessions = coverage.sessions === undefined ? "" : validRecordingCount(coverage.sessions)
    ? ` · ${coverage.sessionsQualifier ?? ""}${exactNumber(coverage.sessions)} sessions` : " · sessions unavailable (invalid count)";
  return `${people}${sessions}`;
}

function recordingBarLabels(point: DraftObservation): readonly [string, string] {
  const unit = point.recordingCoverage?.unit;
  return ["Recording hours", unit === "patients" ? "Patient count" : unit === "nonhuman primates" ? "Animal count" : "Participant count"];
}

function RecordingBar({ metric, label, bar }: { metric: "hours" | "contributors"; label: string; bar: ReturnType<typeof recordingBar> }) {
  return <span className="recording-bar-labeled" aria-hidden="true">
    <span data-recording-bar-label={metric}>{label}</span>
    <span className="recording-bar" data-recording-bar={metric}>
      {bar && <span data-recording-bar-fill data-recording-bar-lower-bound={bar.lowerBound || undefined} style={{ width: `${bar.fraction * 100}%` }} />}
    </span>
  </span>;
}

function ReferenceLink({ reference }: { reference: ConfirmedReference }) {
  return <>{reference.role && <>{reference.role}: </>}{reference.url ? <a href={reference.url} target="_blank" rel="noreferrer">{reference.title} ↗</a> : <span>{reference.title}</span>}</>;
}

function ObservationSources({ point }: { point: DraftObservation }) {
  const references = observationReferences(point);
  return point.sourceRole || point.supportingReferences?.length
    ? <div data-confirmed-references>{references.map((reference, index) => <p key={index}><ReferenceLink reference={reference} /></p>)}</div>
    : <ReferenceLink reference={references[0]} />;
}

function CalculationSource({ source }: { source?: DraftObservation["calculationSource"] }) {
  return source ? <p data-calculation-source>Calculation source: <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></p> : null;
}

function CandidateSources({ sources }: { sources?: DraftObservation["candidateSources"] }) {
  if (!sources?.length) return null;
  return <div data-candidate-sources>
    <p><strong>Candidate sources · assignment unconfirmed</strong></p>
    <ul>{sources.map(source => <li key={source.url}>
      <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>
      <p>{source.note}</p>
    </li>)}</ul>
  </div>;
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

export function DraftChartPlot({ plot: sourcePlot, shareAnchor, preview = false }: { plot: DraftPlot; shareAnchor?: string; preview?: boolean }) {
  const id = useId();
  const modalSlots = useContext(ModalSlotsContext);
  const acquisition = supportsAcquisitionMetrics(sourcePlot);
  const [acquisitionMetric, setAcquisitionMetric] = useAcquisitionMetric(acquisition && !preview ? shareAnchor ?? `metric-panel-${sourcePlot.id}` : undefined);
  const plot = useMemo(() => acquisition ? acquisitionMetricPlot(sourcePlot, acquisitionMetric) : sourcePlot, [acquisition, sourcePlot, acquisitionMetric]);
  const costMetric = acquisition && acquisitionMetric !== "voxels-per-dollar";
  const displayedValue = (efficiency: number) => acquisition ? acquisitionValue(efficiency, acquisitionMetric) : efficiency;
  const benchmarkBase = preview ? undefined : brainBenchmarkContext(plot.id);
  const benchmark = acquisition && benchmarkBase ? acquisitionBenchmark(benchmarkBase, acquisitionMetric) : benchmarkBase;
  const sensory = !preview && plot.id === "bci-bitrate";
  const [sensoryEnabled, setSensoryEnabled] = useState(false);
  const showSensory = sensory && sensoryEnabled;
  const [benchmarkEnabled, setBenchmarkEnabled] = useChartToggle(benchmark ? shareAnchor ?? `metric-panel-${plot.id}` : undefined);
  const benchmarkMotion = useBrainScaleMotion(!!benchmark && benchmarkEnabled);
  // Reciprocal acquisition has no scenario domain, including while the old
  // efficiency reference is animating out. Exports must see historical bounds.
  const benchmarkProgress = benchmark ? benchmarkMotion : 0;
  const benchmarkMoving = !!benchmark && benchmarkProgress !== (benchmarkEnabled ? 1 : 0);
  const benchmarkReveal = benchmarkProgress === 1 ? 1 : Math.max(0, (benchmarkProgress - .8) / .2);
  const observationBasis = plot.observationBasis ?? "Source-reported";
  const groups = [...new Set(plot.points.map(point => point.group ?? "Other observations"))];
  const groupColor = ({ group = "Other observations", color }: Pick<DraftObservation, "group" | "color">) => color ?? SPECIES_COLORS[group]
    ?? GROUP_COLORS[groups.indexOf(group) % GROUP_COLORS.length];
  const legend = plot.legend ?? (groups.length > 1 ? groups.map(group => {
    const point = plot.points.find(point => (point.group ?? "Other observations") === group);
    return { label: group, color: groupColor(point ?? { group }), marker: point?.marker };
  }) : []);
  const referenceTrendlines = plot.referenceTrendlines ?? (plot.referenceTrendline ? [plot.referenceTrendline] : []);
  const exportLegend = [...legend, ...referenceTrendlines.map(line => ({ label: line.label, color: line.color, marker: "line" as const }))];
  const tooltip = usePointTooltip(plot.points);
  const active = tooltip.active;
  const tablePlot = acquisition ? sourcePlot : plot;
  const qualifiedValue = (point: DraftObservation) => `${point.qualifier ?? ""}${acquisition ? acquisitionNumber(point.y, acquisitionMetric) : plot.id === "acquisition-economics" ? countWords(point.y) : exactNumber(plot.valueSignificantDigits ? Number(point.y.toPrecision(plot.valueSignificantDigits)) : point.y)}`;
  const recordingPoints = plot.points.filter(point => point.recordingCoverage);
  const recordingRefs = recordingReferences(recordingPoints);
  const hoursReference = `Hours (left) · ${exactNumber(recordingRefs.hours)} h${recordingRefs.hoursLowerBound ? " (lower bound)" : ""}`;
  const peopleReference = `Contributors (right) · ${exactNumber(recordingRefs.contributors)} individuals`;
  const hoursBar = (point: DraftObservation) => recordingBar(point.y, recordingRefs.hours, point.qualifier === ">");
  const contributorsBar = (point: DraftObservation) => {
    const count = point.recordingCoverage?.count;
    return validRecordingCount(count) ? recordingBar(count, recordingRefs.contributors) : null;
  };
  const recordingPair = (point: DraftObservation) => point.recordingCoverage
    ? `${qualifiedValue(point)} h · ${recordingCoverageLabel(point.recordingCoverage)}` : undefined;
  const recordingKey = (point: DraftObservation) => `${point.label.split(" · ")[0]} · ${recordingPair(point)}${point.recordingCoverage?.durationSummary ? ` · ${point.recordingCoverage.durationSummary}` : ""}`;
  const { width, figure } = usePlotWidth();
  const previewExtra = useMetricPreviewSpace(figure, preview);
  const yLabel = preview && plot.previewYLabel ? plot.previewYLabel : preview && plot.scale === "log" && !/\blog\b/i.test(plot.yLabel) ? `${plot.yLabel} · log` : plot.yLabel;
  const yTitle = wrapLabel(yLabel, width - 12);
  const xTitle = wrapLabel(plot.xLabel, width - 12);
  const fittedLabels = referenceTrendlines.filter(line => line.fit);
  const compactAcquisition = preview && acquisition;
  const fitTextLines = fittedLabels.map(line => compactAcquisition ? [(line.directLabel ?? line.label).replace(" · ", " ")]
    : costMetric ? wrapLabel(line.directLabel ?? line.label, width - 12) : [line.directLabel ?? line.label]);
  const compactFit = preview && fittedLabels.length > 0;
  const fitLabelTop = 28 + yTitle.length * 16 + (costMetric ? 16 : 0);
  const top = fitLabelTop + (compactAcquisition ? 16 : fitTextLines.flat().length * 16) + (fittedLabels.length && benchmark ? 16 : 0) + (showSensory ? 32 : 0);
  const bottom = top + (compactFit ? 56 : preview ? 84 : showSensory ? 464 : 232) + previewExtra;
  const baseHeight = bottom + (compactFit ? 28 : 64 + (xTitle.length - 1) * 16);
  const xs = plot.points.map(point => point.x);
  const ys = (acquisition ? sourcePlot : plot).points.map(point => point.y);
  const numericX = plot.xKind === "number";
  let xMin = numericX ? Math.min(...xs) : Math.floor(Math.min(...xs));
  let xMax = numericX ? Math.max(...xs) : Math.ceil(Math.max(...xs));
  if (xMin === xMax) { xMin -= 1; xMax += 1; }

  const log = plot.scale === "log";
  let minPower = Math.floor(Math.log10(Math.min(...ys)));
  let maxPower = Math.ceil(Math.log10(Math.max(...ys)));
  if (maxPower === minPower) maxPower += 1;
  if (showSensory) maxPower = Math.max(maxPower, Math.ceil(Math.log10(humanRetinalScenario) + .15));
  const rawYMax = Math.max(...ys) || 1;
  const integerStep = Math.max(1, Math.ceil(rawYMax / 5));
  const integerAxis = !log && plot.integerTicks;
  const yMax = log ? 10 ** maxPower : integerAxis ? Math.ceil(rawYMax / integerStep) * integerStep : rawYMax;
  const yMin = log ? 10 ** minPower : Math.min(0, ...ys);
  const powerStep = Math.max(1, Math.ceil((maxPower - minPower) / 5));
  const naturalYTicks = log
    ? [...new Set([...Array.from({ length: Math.floor((maxPower - minPower) / powerStep) + 1 }, (_, i) => 10 ** (minPower + i * powerStep)), yMax])]
    : integerAxis
      ? Array.from({ length: Math.round((yMax - yMin) / integerStep) + 1 }, (_, i) => yMin + i * integerStep)
      : Array.from({ length: 5 }, (_, i) => Number((yMin + (yMax - yMin) * i / 4).toPrecision(12)));
  const baselineYTicks = preview && !log && !integerAxis ? readerTicks(yMin, yMax) : naturalYTicks;
  // Interpolate the bounds in log space, never the underlying observations.
  // Padding leaves room for direct labels at the extremes of the expanded view.
  const referencePowers = benchmarkBase?.references.map(ref => Math.log10(ref.value)) ?? [];
  const targetMinPower = referencePowers.length ? Math.min(minPower, Math.floor(Math.min(...referencePowers) - .15)) : minPower;
  const targetMaxPower = referencePowers.length ? Math.max(maxPower, Math.ceil(Math.max(...referencePowers) + .15)) : maxPower;
  const targetPowerStep = Math.max(1, Math.ceil((targetMaxPower - targetMinPower) / 5));
  const targetYTicks = referencePowers.length ? [...new Set([...Array.from({ length: Math.floor((targetMaxPower - targetMinPower) / targetPowerStep) + 1 }, (_, i) => 10 ** (targetMinPower + i * targetPowerStep)), 10 ** targetMaxPower])] : baselineYTicks;
  const yTicks = benchmarkProgress > 0 ? [...new Set([...baselineYTicks, ...targetYTicks])].sort((a, b) => a - b) : baselineYTicks;
  if (benchmarkProgress > 0) {
    minPower += (targetMinPower - minPower) * benchmarkProgress;
    maxPower += (targetMaxPower - maxPower) * benchmarkProgress;
  }
  const xTicks = (!numericX ? steppedYearTicks(xMin, xMax, plot.yearTickStep) : null)
    ?? (preview && numericX ? readerTicks(xMin, xMax) : [...new Set([xMin, numericX ? (xMin + xMax) / 2 : Math.round((xMin + xMax) / 2), xMax])]);
  const connections = numericX ? [] : (plot.connections ?? []).map(series => ({
    ...series,
    points: series.pointIds.map(id => plot.points.find(point => point.id === id)).filter((point): point is DraftObservation => !!point).sort((a, b) => a.x - b.x),
  })).filter(series => series.points.length > 1);
  const connectionNote = connections.length ? `Lines connect only ${connections.map(series => series.label).join("; ")}; other observations remain separate.` : "Unconnected observations";
  const axisLabel = plot.id === "acquisition-economics" ? compactCount : preview ? previewTickLabel : tickLabel;
  const baselineLeft = Math.max(46, ...baselineYTicks.map(tick => axisLabel(tick).length * 6.5 + 12));
  const targetLeft = Math.max(46, ...targetYTicks.map(tick => axisLabel(tick).length * 6.5 + 12));
  const left = baselineLeft + (targetLeft - baselineLeft) * benchmarkProgress;
  const right = width - Math.max(24, ...xTicks.map(tick => (numericX ? axisLabel(tick) : String(tick)).length * 3.5 + 4));
  const sensoryLabel = showSensory ? wrapLabel(retinalScenarioLabel, right - left - 8) : [];
  const energyAxis = neuroaiEnergyAxis(plot, left, right);
  const x = energyAxis?.x ?? ((value: number) => left + (value - xMin) / (xMax - xMin) * (right - left));
  // Thin only optional-view text; every annual guide remains at its calendar position.
  const calendarStride = showSensory && xTicks.length > 1 ? Math.max(1, Math.ceil(34 / (x(xTicks[1]) - x(xTicks[0])))) : 1;
  const calendarTicks = calendarStride > 1 ? xTicks.filter((_, index) => index % calendarStride === 0) : xTicks;
  const breakNote = energyAxis ? wrapLabel(energyAxis.note, width - 12) : [];
  const height = baseHeight + (energyAxis ? breakNote.length * 16 + 12 : 0);
  const scaleNote = energyAxis ? "Piecewise linear x-axis · Linear y-axis" : `${log ? "Log" : "Linear"} scale`;
  const y = (value: number) => bottom - (log
    ? (Math.log10(acquisition ? acquisitionEfficiency(value, acquisitionMetric) : value) - minPower) / (maxPower - minPower)
    : (value - yMin) / (yMax - yMin)) * (bottom - top);
  const sensoryLabelY = y(humanRetinalScenario) - 6 - (sensoryLabel.length - 1) * 16;
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
  // Reserve the direct benchmark labels before placing movable annotation badges.
  // Source marks stay at their quantitative centers; only their numbered keys move.
  const benchmarkLabelRegions = [...(benchmark && benchmarkProgress > .8 ? benchmark.references.map(ref => ({
    left: right - 4 - ref.label.length * CHART_PRESENTATION.labelFontSize * .62 - 3,
    right,
    top: y(ref.value) - 6 - CHART_PRESENTATION.labelFontSize - 3,
    bottom: y(ref.value),
  })) : []), ...(showSensory ? [{ left, right, top: sensoryLabelY - 16, bottom: y(humanRetinalScenario) }] : [])];
  const placedKeys: { x: number; y: number }[] = [];
  const keySlotStep = benchmarkLabelRegions.length ? 12 : 24;
  const keySlots = Array.from({ length: Math.max(1, Math.floor((right - left - 24) / keySlotStep) + 1) }, (_, column) =>
    Array.from({ length: Math.floor((bottom - top - 24) / keySlotStep) + 1 }, (_, row) => ({ x: left + 12 + column * keySlotStep, y: top + 12 + row * keySlotStep }))).flat();
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
        && benchmarkLabelRegions.every(region => candidate.x + 12 < region.left || candidate.x - 12 > region.right
          || candidate.y + 12 < region.top || candidate.y - 12 > region.bottom)
        && plot.points.every((other, otherIndex) => Math.hypot(
          Math.max(0, Math.abs(candidate.x - x(other.x)) - 10),
          Math.max(0, Math.abs(candidate.y - y(other.y)) - 10),
        ) >= markerRadius(otherIndex) + 3)) ?? preferred;
    placedKeys.push(position);
    return [{ point, text, ...position }];
  });
  const annotationNumbers = new Map(annotations.map(({ point }, index) => [point.id, index + 1]));
  const inspectProps = (point: DraftObservation, anchorToMark = true) => {
    const averages = recordingAverages(point);
    return {
      tabIndex: 0, role: "button",
      "aria-label": `${point.annotation ? `${point.annotation}; ` : ""}${point.label}; ${point.group ?? ""}; ${point.dateLabel}; ${plot.yLabel}: ${recordingPair(point) ?? qualifiedValue(point)}; ${averages ? `${averages}; ` : ""}${observationSourceDescription(point)}`,
      ...tooltip.pointProps(point, anchorToMark ? trigger => Array.from(trigger.closest("figure")?.querySelectorAll("[data-source-observation]") ?? [])
        .find(mark => mark.getAttribute("data-source-observation") === point.id) ?? null : undefined),
    };
  };
  const benchmarkToggle = benchmark && <button type="button" role="switch" data-brain-scale-toggle aria-checked={benchmarkEnabled}
    onClick={() => { tooltip.clear(); setBenchmarkEnabled(enabled => !enabled); }}><span className="brain-scale-switch" aria-hidden="true" />{benchmark.toggleLabel}</button>;

  return <figure ref={figure} className="draft-plot" data-draft-preview={preview || undefined} data-brain-scale-state={benchmark ? benchmarkMoving ? "animating" : benchmarkEnabled ? "on" : "off" : undefined} aria-labelledby={`${id}-title`}>
    {!preview && shareAnchor && <ChartActions anchor={shareAnchor} title={plot.title}><ChartShare anchor={shareAnchor} title={plot.title} disabled={benchmarkMoving} getChart={() => ({
      svg: figure.current!.querySelector("svg")!, title: plot.title, anchor: shareAnchor,
      legend: exportLegend,
      datasetCredit: plot.datasetCredit,
      pointKey: recordingPoints.length ? recordingPoints.map(point => ({
        label: recordingKey(point), color: groupColor(point), marker: point.marker,
        pointId: point.id, badge: annotationNumbers.get(point.id),
        details: [point.dateLabel, recordingAverages(point)!],
        bars: [hoursBar(point), contributorsBar(point)],
        barLabels: recordingBarLabels(point),
      })) : plot.exportPointKey ? annotations.map(({ point, text }, index) => ({
        label: `${index + 1}. ${point.exportAnnotation ?? text}`, color: groupColor(point), marker: point.marker,
      })) : undefined,
      pointKeyNote: recordingPoints.length ? "Recording coverage · matched dataset/release; overlapping releases not additive" : plot.exportPointKey ? plot.exportPointKeyNote : undefined,
      pointKeyScaleNote: recordingPoints.length ? `Linear bars (largest displayed figures): ${hoursReference}; ${peopleReference}. Arrows mark lower bounds.` : undefined,
      notes: [plot.scope, plot.seriesNote ?? "",
        ...recordingPoints.map(point => `${recordingKey(point)}. ${point.dateLabel}. ${recordingAverages(point)}. ${point.recordingCoverage!.detail}`),
        ...referenceTrendlines.map(line => line.note),

        ...(benchmarkEnabled && benchmark ? [benchmark.disclosure, ...benchmark.sources.map(source => `${source.title}: ${source.url}`)] : []),
        ...(showSensory ? [retinalScenarioAssumptions, `Koch et al. (2006): ${RETINAL_OUTPUT.source}`] : []),
        ...(energyAxis ? [energyAxis.note] : []),
        ...(overlapNote ? [overlapNote] : []),
        ...(plot.points.some(point => point.qualifier) ? [`Qualified values (${plot.yLabel}): ${plot.points.filter(point => point.qualifier).map(point => `${point.label}: ${qualifiedValue(point)}`).join("; ")}.`] : []),
        `${observationBasis} · ${scaleNote} · ${connectionNote}`,
        ...annotations.map(({ text }, index) => `${index + 1}. ${text}`),
        ...plot.points.filter(point => point.exportNote).map(point => `${point.label} · ${point.dateLabel}. ${point.exportNote}`),
        `Sources: ${[...new Set(plot.points.some(point => point.sourceRole || point.supportingReferences?.length)
          ? plot.points.flatMap(point => observationReferences(point).map(reference => `${reference.role ? `${reference.role}: ` : ""}${reference.title}${reference.url ? `: ${reference.url}` : ""}`))
          : plot.points.map(point => point.sourceTitle))].join("; ")}`,
        ...(plot.curationSource ? [`Dataset discovery: ${plot.curationSource.title} · ${plot.curationSource.url}`] : [])],
    })} /></ChartActions>}
    <figcaption id={`${id}-title`}>{preview ? plot.previewTitle ?? plot.title : plot.title}</figcaption>
    {acquisition && !preview && <div className="brain-scale-controls acquisition-metric-controls">
      <div className="acquisition-metric-options" role="group" aria-label="Acquisition y-axis metric">
        {ACQUISITION_METRICS.map(option => <button key={option.id} type="button" data-acquisition-metric={option.id}
          aria-pressed={acquisitionMetric === option.id} onClick={() => { tooltip.clear(); setAcquisitionMetric(option.id); }}>{option.label}</button>)}
      </div>
      {benchmarkToggle}
    </div>}
    <svg data-metric-preview-extra={preview ? previewExtra : undefined} className="draft-plot-svg" viewBox={`0 0 ${width} ${height}`} aria-labelledby={`${id}-title`} aria-describedby={energyAxis ? `${id}-axis-break` : undefined}
      data-brain-scale-progress={benchmark ? benchmarkProgress : undefined} data-brain-scale-log-min={benchmark ? minPower : undefined} data-brain-scale-log-max={benchmark ? maxPower : undefined}>
      <text className="draft-plot-axis-title" x={0} y={18}>{yTitle.map((line, index) => <tspan key={index} x={0} dy={index ? 16 : 0}>{line}{index < yTitle.length - 1 ? " " : ""}</tspan>)}</text>
      {costMetric && <text data-cheaper-direction x={0} y={fitLabelTop - 20} fill="var(--muted)" fontSize={CHART_PRESENTATION.labelFontSize}>↑ cheaper</text>}
      {benchmark && benchmarkProgress > 0 && <g opacity={benchmarkReveal}>
        <text data-brain-scale-scope x={0} y={top - 10} fontSize={CHART_PRESENTATION.labelFontSize} data-export-font-size={CHART_PRESENTATION.labelFontSize} fill="var(--muted)">{benchmark.scopeLabel}</text>
      </g>}
      {!numericX && <ChartYearGuides years={annualYears(xMin, xMax)} x={x} top={top} bottom={bottom} />}
      {yTicks.map(tick => <g key={tick} opacity={benchmarkProgress > 0 ? (Math.log10(tick) < minPower || Math.log10(tick) > maxPower ? 0 : baselineYTicks.includes(tick) && targetYTicks.includes(tick) ? 1 : baselineYTicks.includes(tick) ? 1 - benchmarkProgress : Math.max(0, (benchmarkProgress - .4) / .6)) : undefined}>
        {(energyAxis?.segments ?? [{ start: left, end: right }]).map((segment, index) => <line key={index} className="draft-plot-gridline" x1={segment.start} x2={segment.end} y1={y(displayedValue(tick))} y2={y(displayedValue(tick))} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />)}
        <text data-acquisition-y-tick={acquisition ? displayedValue(tick) : undefined} data-preview-y-tick={preview ? displayedValue(tick) : undefined} className="draft-plot-tick" x={left - (costMetric ? 8 : 10)} y={y(displayedValue(tick)) + 4} textAnchor="end">{acquisition ? acquisitionAxisTick(displayedValue(tick), acquisitionMetric) : axisLabel(tick)}</text>
      </g>)}
      {energyAxis ? <>
        {energyAxis.segments.map((segment, index) => <line key={index} className="draft-plot-axis" data-x-axis-segment={index} x1={segment.start} x2={segment.end} y1={bottom} y2={bottom} />)}
        <g className="draft-plot-axis-break" data-x-axis-break aria-hidden="true">
          {[-3, 3].map(offset => <line key={offset} x1={energyAxis.center + offset - 2} x2={energyAxis.center + offset + 2} y1={bottom + 4} y2={bottom - 4} />)}
        </g>
      </> : <line className="draft-plot-axis" x1={left} x2={right} y1={bottom} y2={bottom} />}
      {(energyAxis?.ticks ?? calendarTicks).map(tick => <text className="draft-plot-tick" key={tick} x={x(tick)} y={bottom + 22} textAnchor="middle">{numericX ? axisLabel(tick) : String(tick)}</text>)}
      {!compactFit && <text className="draft-plot-axis-title" x={0} y={bottom + 52} textAnchor="start">{xTitle.map((line, index) => <tspan key={index} x={0} dy={index ? 16 : 0}>{line}{index < xTitle.length - 1 ? " " : ""}</tspan>)}</text>}
      {energyAxis && <text id={`${id}-axis-break`} className="draft-plot-break-note" data-x-axis-break-note x={0} y={baseHeight + 16}>
        {breakNote.map((line, index) => <tspan key={index} x={0} dy={index ? 16 : 0}>{line}{index < breakNote.length - 1 ? " " : ""}</tspan>)}
      </text>}
      {referenceTrendlines.map(referenceTrendline => <polyline key={referenceTrendline.id ?? plot.id} data-reference-trendline={referenceTrendline.id ?? plot.id}
        points={referenceTrendline.points.map(point => `${x(point.x)},${y(point.y)}`).join(" ")}
        fill="none" stroke={referenceTrendline.color} strokeWidth={2} vectorEffect="non-scaling-stroke"
        data-export-stroke-width={2} pointerEvents="none" aria-label={referenceTrendline.label}>
        <title>{referenceTrendline.note}</title>
      </polyline>)}
      {fittedLabels.map((line, index) => <text key={line.id} data-fit-direct-label={line.id} x={compactAcquisition ? index * width / 2 : 0} y={fitLabelTop + (compactAcquisition ? 0 : fitTextLines.slice(0, index).flat().length * 16) - 4} textAnchor="start" fill={line.color} stroke="var(--surface)" strokeWidth={3} paintOrder="stroke" fontSize={CHART_PRESENTATION.labelFontSize} data-export-font-size={CHART_PRESENTATION.labelFontSize}>{acquisition ? fitTextLines[index].map((text, row) => <tspan key={row} x={compactAcquisition ? index * width / 2 : 0} dy={row ? 16 : 0}>{text}{row < fitTextLines[index].length - 1 ? " " : ""}</tspan>) : line.directLabel ?? line.label}</text>)}
      {!preview && annotations.map(({ point, x: labelX, y: labelY }) => <line key={point.id} className="draft-annotation-leader" data-annotation-leader={point.id}
        x1={x(point.x)} y1={y(point.y)} x2={labelX} y2={labelY} stroke={groupColor(point)} aria-hidden="true" />)}
      {!preview && annotations.map(({ point, x: labelX, y: labelY }, index) => <g key={point.id} className="draft-annotation-key" data-annotation-key={point.id} aria-hidden="true">
        <rect x={labelX - 10} y={labelY - 10} width={20} height={20} rx={4} stroke={groupColor(point)} />
        <text x={labelX} y={labelY + 4} textAnchor="middle">{index + 1}</text>
      </g>)}
      {connections.map(series => <polyline key={series.id} data-observation-series={series.id} points={series.points.map(point => `${x(point.x)},${y(point.y)}`).join(" ")}
        fill="none" stroke={groupColor(series.points[0])} strokeWidth={1.5} vectorEffect="non-scaling-stroke" pointerEvents="none" aria-hidden="true" />)}
      {benchmark && benchmarkProgress > 0 && benchmark.references.map(ref => {
        const position = y(ref.value);
        const room = Math.max(0, Math.min(1, (Math.min(position - top, bottom - position) - 12) / 4));
        return <g key={ref.id} opacity={room * benchmarkReveal} pointerEvents="none">
          <line data-brain-scale-reference={ref.id} data-value={ref.value} x1={left} x2={right} y1={position} y2={position}
            stroke="var(--muted)" strokeOpacity={.45} strokeWidth={1} strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
          <text x={right - 4} y={position - 6} textAnchor="end" fontSize={CHART_PRESENTATION.labelFontSize} data-export-font-size={CHART_PRESENTATION.labelFontSize}
            fill="var(--muted)" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke">{ref.label}</text>
        </g>;
      })}
      {showSensory && <g pointerEvents="none">
        <line data-sensory-reference="retinal-output" data-value={humanRetinalScenario} x1={left} x2={right} y1={y(humanRetinalScenario)} y2={y(humanRetinalScenario)}
          stroke="var(--muted)" strokeWidth={1} strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
        <text data-sensory-reference-label x={left + 4} y={sensoryLabelY}
          fontSize={CHART_PRESENTATION.labelFontSize} data-export-font-size={CHART_PRESENTATION.labelFontSize} fill="var(--muted)" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke">
          {sensoryLabel.map((line, index) => <tspan key={index} x={left + 4} dy={index ? 16 : 0}>{line}{index < sensoryLabel.length - 1 ? " " : ""}</tspan>)}
        </text>
      </g>}
      {plot.points.map((point, index) => <ObservationMarker key={point.id} marker={point.marker} data-source-observation={point.id} data-acquisition-value={acquisition ? point.y : undefined} cx={x(point.x)} cy={y(point.y)} r={markerRadius(index)}
        fill={markerRadius(index) > baseRadius ? "none" : groupColor(point)} stroke={markerRadius(index) > baseRadius ? groupColor(point) : "var(--surface)"}
        strokeWidth={CHART_PRESENTATION.markerStrokeWidth} vectorEffect="non-scaling-stroke"
        data-export-stroke-width={CHART_PRESENTATION.markerStrokeWidth} pointerEvents={markerRadius(index) > baseRadius ? "stroke" : undefined}
        {...(!preview ? inspectProps(point) : {})}
      />)}
    </svg>
    {!preview && acquisition && <p className="draft-plot-qualifications" data-acquisition-scope>Historical acquisition rates, not a forecast. Method resolutions, scope and cost definitions differ.</p>}
    {!preview && plot.id === "acquisition-economics" && <p className="draft-plot-qualifications">{acquisition && acquisitionMetric === "dollars-per-voxel" ? "SI dollar ticks: n$ = nanodollars · p$ = picodollars · f$ = femtodollars · a$ = attodollars" : acquisition ? "M = million · B = billion · T = trillion · Q = quadrillion; scientific notation above 10¹⁵" : "M = million · B = billion · T = trillion · Q = quadrillion"}</p>}

    {benchmark && <div className="brain-scale-controls">
      {!acquisition && benchmarkToggle}
      <details data-brain-scale-assumptions>
        <summary>Benchmark assumptions &amp; sources</summary>
        <p>{benchmark.disclosure}</p>
        <ul>{benchmark.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ul>
      </details>
    </div>}
    {sensory && <div className="brain-scale-controls">
      <button type="button" role="switch" data-sensory-toggle aria-checked={sensoryEnabled}
        onClick={() => { tooltip.clear(); setSensoryEnabled(enabled => !enabled); }}><span className="brain-scale-switch" aria-hidden="true" />Sensory context</button>
      <details data-sensory-assumptions>
        <summary>Sensory assumptions &amp; source</summary>
        <p>{retinalScenarioAssumptions}</p>
        <a href={RETINAL_OUTPUT.source} target="_blank" rel="noreferrer">Koch et al. (2006), How Much the Eye Tells the Brain ↗</a>
      </details>
      {showSensory && <p>Sensory context is local to this view. Copy link opens the default chart.</p>}
    </div>}
    {!preview && (overlapNote || benchmark) && <p className="draft-plot-overlap-note" data-overlap-note={overlapNote ? true : undefined}
      style={benchmark && !overlapNote ? { visibility: "hidden" } : undefined}>
      {overlapNote ?? "Rings keep overlapping observations visible at their source positions."}
    </p>}
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
    {!preview && recordingPoints.length > 0 && <section className="recording-coverage" data-recording-coverage-list aria-label="Recording duration and participant coverage">
      <h4>Recording coverage</h4>
      <p>Linear bars use the largest displayed figure for each metric. Arrows mark lower bounds. Equal contributor counts produce equal bars even when sessions or averages differ. Contributor counts compare individuals, not recording quality. Overlapping releases are not additive.</p>
      <p className="recording-bar-legend">{hoursReference} · {peopleReference}</p>
      <ul>{recordingPoints.map(point => <li key={point.id} data-recording-coverage-row={point.id}>
        <button type="button" {...inspectProps(point, false)}>
          <span className="recording-coverage-identity"><span aria-hidden="true" style={{ color: groupColor(point) }}>●</span> {point.label.split(" · ")[0]}</span>
          <strong>{recordingPair(point)}</strong>
          <span className="recording-bar-grid"><RecordingBar metric="hours" label={recordingBarLabels(point)[0]} bar={hoursBar(point)} /><RecordingBar metric="contributors" label={recordingBarLabels(point)[1]} bar={contributorsBar(point)} /></span>
          <small>{recordingAverages(point)}</small>
          {point.recordingCoverage?.durationSummary && <small data-recording-duration-summary>{point.recordingCoverage.durationSummary}</small>}
        </button>
      </li>)}</ul>
    </section>}
    {referenceTrendlines.map(referenceTrendline => <p key={referenceTrendline.id ?? plot.id} className="draft-plot-qualifications" data-reference-trendline-key title={referenceTrendline.note}>
      <svg width={22} height={12} viewBox="0 0 22 12" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}>
        <line x1={0} x2={22} y1={6} y2={6} stroke={referenceTrendline.color} strokeWidth={2} />
      </svg>{referenceTrendline.label}
      {referenceTrendline.methodologyUrl && <> · <a data-fit-methodology href={referenceTrendline.methodologyUrl} target="_blank" rel="noreferrer">{referenceTrendline.methodologyLabel ?? "Data and fit code ↗"}</a></>}
    </p>)}
    {plot.points.some(point => point.qualifier) && <p className="draft-plot-qualifications" data-visible-qualifications>
      {plot.points.every(point => point.qualifier === "≈") ? "All plotted values are approximate (≈)." : <>
        <span>{plot.yLabel}: </span>
        {plot.points.filter(point => point.qualifier).map((point, index) => <span key={point.id} data-qualified-observation={point.id}>
          {index > 0 && "; "}{point.label}{!point.label.includes(qualifiedValue(point)) && `: ${qualifiedValue(point)}`}
        </span>)}
      </>}
    </p>}
    {plot.id === "acquisition-economics" && <p className="draft-plot-qualifications">PEEM: prospective. ExA-SPIM 2024: author estimate; citation mismatch (HiExM).</p>}
    {preview && overlapNote && <p className="draft-plot-overlap-note" data-overlap-note>{overlapNote}</p>}
    {!preview && <p className="draft-plot-legend"><span aria-hidden="true">●</span> {observationBasis} · {scaleNote} · {connectionNote}</p>}
    {!preview && <><PointTooltip {...tooltip.tooltipProps}>
      {active ? <>
        <strong>{active.label}</strong>
        {active.group && <p>{active.group}</p>}
        <p>{active.dateLabel}{numericX && ` · ${plot.xLabel}: ${exactNumber(active.x)}`}</p>
        {acquisition ? <>{ACQUISITION_METRICS.map(option => <p key={option.id} data-acquisition-tooltip-value={option.id}>
          <strong>{active.qualifier ?? ""}{acquisitionNumber(acquisitionValue(sourcePlot.points.find(point => point.id === active.id)!.y, option.id), option.id)}</strong>
          {option.id === "voxels-per-dollar" ? " voxels/$" : " per voxel"}
        </p>)}
          <p data-acquisition-tooltip-value="human-brain">Illustrative human-brain acquisition cost: <strong>{acquisitionNumber(HUMAN_IMAGE_VOXELS / sourcePlot.points.find(point => point.id === active.id)!.y, "human-brain")}</strong> per human brain</p>
          <p>{ACQUISITION_HUMAN_COST_NOTE}</p>
        </> : <p>{plot.yLabel}: <strong>{recordingPair(active) ?? qualifiedValue(active)}</strong></p>}
        {active.recordingCoverage && <div data-recording-coverage-readout>
          <p>{recordingAverages(active)}</p>
          {active.recordingCoverage.durationSummary && <p>{active.recordingCoverage.durationSummary}</p>}
          <p>{active.recordingCoverage.detail}</p>
        </div>}
        <ObservationSources point={active} />
        {active.note && <p>{active.note}</p>}
        <CandidateSources sources={active.candidateSources} />
        <CalculationSource source={active.calculationSource} />
      </> : null}
    </PointTooltip>
    <ModalSources modalOnly>
      <p className="mx-scope-line" data-draft-sources-scope>{plot.scope}</p>
      {plot.curationSource && <p className="mx-scope-line">Dataset discovery: <a href={plot.curationSource.url} target="_blank" rel="noreferrer">{plot.curationSource.title} ↗</a></p>}
    </ModalSources>
    <ModalData><details className="draft-plot-data">
      <summary>Data and sources ({plot.points.length})</summary>
      {!modalSlots && <p className="draft-plot-scope">{plot.scope}</p>}
      {(plot.referenceTrendlines || plot.curationSource) && <a data-selected-plot-json download={`neuro-atlas-${plot.id}.json`} href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(plot,null,2))}`}>Download selected data{plot.referenceTrendlines ? " & fits" : " and sources"} JSON</a>}
      {acquisition && <p><a data-source-plot-json download={`neuro-atlas-${plot.id}-source.json`} href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(sourcePlot,null,2))}`}>Download original source data &amp; fits JSON (voxels/$)</a></p>}
      {plot.seriesNote && <ChartNoteList notes={[plot.seriesNote]} legend={legend} />}
      {referenceTrendlines.map(line => <p key={line.id ?? plot.id}>{line.note}</p>)}
      <div className="draft-plot-table-scroll" data-recording-source-table={recordingPoints.length > 0 || undefined} tabIndex={0} role="region" aria-label={`${plot.title} source table`}>
        <table>
          <caption>{tablePlot.title} — {tablePlot.observationBasis ?? "source-reported"} observations</caption>
          <thead><tr><th scope="col">Observation</th><th scope="col">{tablePlot.xLabel}</th><th scope="col">{recordingPoints.length ? "Recording hours / coverage" : tablePlot.yLabel}</th><th scope="col">Source and scope notes</th></tr></thead>
          <tbody>{tablePlot.points.map(point => <tr key={point.id}>
            <th scope="row">{point.label}{point.group && <small>{point.group}</small>}</th>
            <td>{numericX && <>{exactNumber(point.x)}<br /></>}{point.dateLabel}</td>
            <td>{recordingPair(point) ?? (acquisition ? `${point.qualifier ?? ""}${acquisitionNumber(point.y, "voxels-per-dollar")}` : qualifiedValue(point))}{point.recordingCoverage && <div data-recording-coverage-source>
              <p>{recordingAverages(point)}</p>
              {point.recordingCoverage.durationSummary && <p>{point.recordingCoverage.durationSummary}</p>}
            </div>}</td>
            <td><ObservationSources point={point} /><blockquote>{point.quote}</blockquote>{point.note && <p>{point.note}</p>}
              {point.recordingCoverage && <p data-recording-source-detail>{point.recordingCoverage.detail}</p>}
              <CandidateSources sources={point.candidateSources} /><CalculationSource source={point.calculationSource} /></td>
          </tr>)}</tbody>
        </table>
      </div>
    </details></ModalData></>}
  </figure>;
}

/** Categorical lanes carry no ordinal/impact score; positions encode dates only. */
export function DraftEventTimeline({ timeline, preview = false, shareAnchor }: { timeline: NonNullable<DraftChartEvidence["timeline"]>; preview?: boolean; shareAnchor?: string }) {
  const id = useId();
  const { width, figure } = usePlotWidth();
  const previewExtra = useMetricPreviewSpace(figure, preview);
  const stages = [...new Set(timeline.events.map(event => event.stage))];
  const years = timeline.events.map(event => event.year);
  const first = Math.floor(Math.min(...years));
  const last = Math.max(first + 1, Math.ceil(Math.max(...years)));
  const xTitle = wrapLabel("Publication / demonstration year", width - 12);
  const stageStep = preview ? 72 : 100;
  const baseHeight = Math.max(preview ? 276 : 320, stages.length * stageStep + 100) + previewExtra;
  const height = baseHeight + (xTitle.length - 1) * 16;
  const x = (year: number) => 28 + (year - first) / (last - first) * (width - 56);
  const y = (stage: string) => 90 + stages.indexOf(stage) * stageStep + previewExtra * (stages.length > 1 ? stages.indexOf(stage) / (stages.length - 1) : .5);
  const ticks = [...new Set([first, Math.round((first + last) / 2), last])];
  return <figure ref={figure} className="draft-plot draft-event-timeline" data-draft-preview={preview || undefined} aria-labelledby={`${id}-title`}>
    {!preview && shareAnchor && <ChartActions anchor={shareAnchor} title="Selected application events"><ChartShare anchor={shareAnchor} title="Selected application events" getChart={() => ({
      svg: figure.current!.querySelector("svg")!, title: "Selected application events", anchor: shareAnchor,
      notes: [timeline.scope, "Stages identify the type of reported event.",
        ...timeline.events.map(event => `${event.dateLabel} · ${event.stage} · ${event.label} — ${event.sourceTitle}`)],
    })} /></ChartActions>}
    <figcaption id={`${id}-title`}>Selected application events</figcaption>
    {!preview && <ModalSources><p className="draft-plot-scope mx-scope-line">{timeline.scope}</p></ModalSources>}
    <p className="draft-plot-legend">● Reported event · Stages identify the type of event</p>
    <svg data-metric-preview-extra={preview ? previewExtra : undefined} className="draft-plot-svg" data-draft-event-timeline viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <desc id={`${id}-description`}>Events positioned by year. Full dates, stage labels and sources are listed below.</desc>
      <ChartYearGuides years={annualYears(first, last)} x={x} top={45} bottom={baseHeight - 70} />
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
