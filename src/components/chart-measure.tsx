"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * Click, hold and drag across a line chart to read the change between two
 * observations. Everything is derived from the plotted points the chart already
 * renders (SVG coordinates plus their source values); nothing is interpolated.
 * A plain click still reaches the marks underneath, so source tooltips keep
 * working, and the overlay is excluded from PNG exports.
 */
export type MeasurePoint = { x: number; y: number; value: number; label: string; year?: number };
export type MeasureSeries = { id: string; name: string; color: string; points: readonly MeasurePoint[] };
export type MeasureFrame = { left: number; right: number; top: number; bottom: number };

const DRAG_THRESHOLD = 4; // CSS px before a press becomes a measurement
const nearest = (points: readonly MeasurePoint[], x: number) =>
  points.reduce((best, point) => Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best);
const number = (value: number) => {
  const abs = Math.abs(value);
  return value.toLocaleString("en-US", { maximumFractionDigits: abs >= 100 ? 0 : abs >= 10 ? 1 : 2 });
};

export function useChartMeasure({ svgRef, series, frame, unit = "", annual = false, enabled = true }: {
  svgRef: RefObject<SVGSVGElement | null>; series: readonly MeasureSeries[]; frame: MeasureFrame; unit?: string; annual?: boolean; enabled?: boolean;
}): { marks: ReactNode; readout: ReactNode; hint: ReactNode; active: boolean } {
  const [range, setRange] = useState<[number, number] | null>(null);
  const [scale, setScale] = useState(1);
  const live = series.filter(item => item.points.length > 1);
  const reference = live.reduce<MeasureSeries | null>((best, item) => !best || item.points.length > best.points.length ? item : best, null);
  const usable = enabled && !!reference;
  const latest = useRef({ frame, usable });
  useEffect(() => { latest.current = { frame, usable }; });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !usable) return;
    let start: number | null = null, moved = false, pointer = -1, suppressClick = false;
    const toPlot = (event: PointerEvent) => {
      const matrix = svg.getScreenCTM();
      if (!matrix || !matrix.a || !matrix.d) return null;
      return { x: (event.clientX - matrix.e) / matrix.a, y: (event.clientY - matrix.f) / matrix.d, pixel: matrix.a };
    };
    const clampX = (x: number) => Math.max(latest.current.frame.left, Math.min(latest.current.frame.right, x));
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      const point = toPlot(event), box = latest.current.frame;
      if (!point || point.x < box.left - 8 || point.x > box.right + 8 || point.y < box.top - 8 || point.y > box.bottom + 8) return;
      start = clampX(point.x); moved = false; pointer = event.pointerId;
    };
    const move = (event: PointerEvent) => {
      if (start === null || event.pointerId !== pointer) return;
      const point = toPlot(event);
      if (!point) return;
      const x = clampX(point.x);
      if (!moved) {
        if (Math.abs(x - start) * point.pixel < DRAG_THRESHOLD) return;
        moved = true;
        try { svg.setPointerCapture(pointer); } catch { /* pointer already released */ }
        svg.setAttribute("data-measuring", "");
        // The press may have focused a mark; a measurement should not also pin its tooltip.
        const focused = svg.ownerDocument.activeElement as (Element & { blur?: () => void }) | null;
        if (focused && focused !== svg && svg.contains(focused)) focused.blur?.();
      }
      event.preventDefault();
      setScale(point.pixel);
      setRange([start, x]);
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      if (moved) suppressClick = true;
      else if (!(event.target as Element | null)?.closest?.("[role=button], [data-trend-point], [data-curve-point]")) setRange(null);
      start = null; moved = false;
      svg.removeAttribute("data-measuring");
      if (svg.hasPointerCapture?.(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    };
    // A completed drag must not also toggle the mark it ended on.
    const click = (event: MouseEvent) => { if (suppressClick) { suppressClick = false; event.stopPropagation(); event.preventDefault(); } };
    svg.addEventListener("pointerdown", down);
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
    svg.addEventListener("click", click, true);
    return () => {
      svg.removeEventListener("pointerdown", down);
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", up);
      svg.removeEventListener("click", click, true);
    };
  }, [svgRef, usable]);

  const selection = usable && range ? (() => {
    const lo = Math.min(...range), hi = Math.max(...range);
    const a = nearest(reference!.points, lo), b = nearest(reference!.points, hi);
    return a === b ? null : { a, b };
  })() : null;

  // The readout lives in the dialog's top layer, positioned from the SVG's live transform.
  const [position, setPosition] = useState<{ left: number; top: number; host: Element } | null>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !selection) { setPosition(previous => previous && null); return; }
    const view = svg.ownerDocument.defaultView!;
    const update = () => {
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const width = readoutRef.current?.offsetWidth ?? 240, height = readoutRef.current?.offsetHeight ?? 80;
      const center = ((selection.a.x + selection.b.x) / 2) * matrix.a + matrix.e;
      // Sit inside the plot, just under its top edge, so the card never covers the header.
      const plotTop = frame.top * matrix.d + matrix.f, plotBottom = frame.bottom * matrix.d + matrix.f;
      const host = svg.closest("dialog")?.getBoundingClientRect();
      const minLeft = (host?.left ?? 0) + 8, maxLeft = (host?.right ?? view.innerWidth) - width - 8;
      const next = {
        left: Math.round(Math.max(minLeft, Math.min(maxLeft, center - width / 2))),
        top: Math.round(Math.max(8, Math.min(plotBottom - height, plotTop + 8))),
        host: svg.closest("dialog") ?? svg.ownerDocument.body,
      };
      setPosition(previous => previous && previous.left === next.left && previous.top === next.top && previous.host === next.host ? previous : next);
    };
    update();
    const frameId = view.requestAnimationFrame(update);
    view.addEventListener("scroll", update, true);
    view.addEventListener("resize", update);
    return () => { view.cancelAnimationFrame(frameId); view.removeEventListener("scroll", update, true); view.removeEventListener("resize", update); };
    // Primitive deps: series objects are rebuilt on every render.
  }, [svgRef, selection?.a.x, selection?.b.x, frame.top]); // eslint-disable-line react-hooks/exhaustive-deps

  const hint = usable ? <p className="chart-measure-hint" data-chart-measure-hint data-export-exclude data-active={selection ? "" : undefined}>
    <span aria-hidden="true">↔</span>
    Click and drag across the chart to compare two points
  </p> : null;
  if (!selection) return { marks: null, readout: null, hint, active: false };

  const { a, b } = selection;
  const radius = 5 / (scale || 1), stroke = 1.5;
  const rows = live.map(item => {
    const p0 = nearest(item.points, a.x), p1 = nearest(item.points, b.x);
    const diff = p1.value - p0.value;
    const pct = p0.value ? diff / Math.abs(p0.value) * 100 : null;
    const years = (p1.year ?? 0) - (p0.year ?? 0);
    const cagr = annual && p0.value > 0 && p1.value > 0 && years >= 2 ? (Math.pow(p1.value / p0.value, 1 / years) - 1) * 100 : null;
    return { item, p0, p1, diff, pct, cagr };
  });
  const marks = <g className="chart-measure" data-export-exclude aria-hidden="true" pointerEvents="none">
    <rect x={a.x} y={frame.top} width={b.x - a.x} height={frame.bottom - frame.top} fill="var(--accent)" fillOpacity={0.08} />
    {[a.x, b.x].map(x => <line key={x} x1={x} x2={x} y1={frame.top} y2={frame.bottom} stroke="var(--accent)" strokeWidth={stroke} vectorEffect="non-scaling-stroke" />)}
    {rows.flatMap(({ item, p0, p1 }) => [p0, p1].map((p, i) => <circle key={`${item.id}:${i}`} cx={p.x} cy={p.y} r={radius} fill={item.color} stroke="var(--surface)" strokeWidth={2} vectorEffect="non-scaling-stroke" />))}
  </g>;
  const readout = position ? createPortal(<div ref={readoutRef} className="chart-measure-readout" data-chart-measure role="status" aria-live="polite" style={{ position: "fixed", left: position.left, top: position.top }}>
    <div className="chart-measure-range">{a.label} → {b.label}</div>
    {rows.map(({ item, p0, p1, diff, pct, cagr }) => <div key={item.id} className="chart-measure-row">
      <i style={{ background: item.color }} />
      <div>
        <b>{item.name}</b><br />
        {number(p0.value)} → {number(p1.value)}{unit}{" "}
        <span className={diff > 0 ? "up" : diff < 0 ? "down" : undefined}>{diff > 0 ? "+" : diff < 0 ? "−" : "±"}{number(Math.abs(diff))}{pct !== null && ` · ${pct >= 0 ? "+" : "−"}${number(Math.abs(pct))}%`}</span>
        {cagr !== null && <span className="chart-measure-sub"> · {cagr >= 0 ? "+" : "−"}{number(Math.abs(cagr))}%/yr</span>}
      </div>
    </div>)}
  </div>, position.host) : null;
  return { marks, readout, hint, active: true };
}
