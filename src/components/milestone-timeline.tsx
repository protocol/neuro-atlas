"use client";

// Timeline of implanted-BCI milestones across 2024–2026. Three year columns sit
// side by side: click a year to focus it (smooth width slide). The focused year
// shows the full-year lane timeline that scrolls horizontally (the scrollbar
// itself signals there's more). 2026 also draws a live "today" line and a faint
// sourced cumulative-capital line in the Capital lane. The right
// summary rail is collapsible. Legend pills expand inline into subcategories
// (acronyms carry a tooltip; ✕ collapses). Undated milestones sit in a
// "date TBD" shelf.

import { useEffect, useMemo, useRef, useState } from "react";
import MILESTONES from "@/data/milestones.json";
import CAPITAL from "@/data/capital.json";
import { FirmLogo } from "@/components/firm-logo";
import { Sparkline } from "@/components/sparkline";
import { lookupAcronym } from "@/components/abbr";
import { clampCenteredTooltipX } from "@/lib/tooltip-position";

type Milestone = (typeof MILESTONES)[number];

const yearOf = (dateStr: string) => Number(dateStr.slice(0, 4));
const boundsOf = (year: number) => ({ t0: Date.UTC(year, 0, 1), t1: Date.UTC(year, 11, 31) });
const monthsOf = (year: number) =>
  Array.from({ length: 12 }, (_, i) => ({
    label: new Date(Date.UTC(year, i, 1)).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
    t: Date.UTC(year, i, 1),
  }));

const STAGES = [
  { key: "capital", label: "Capital", color: "#22b8cf", soft: "rgba(34,184,207,0.12)" },
  { key: "clinical", label: "Clinical", color: "#4c6ef5", soft: "rgba(76,110,245,0.12)" },
  { key: "commercial", label: "Commercial", color: "#9775fa", soft: "rgba(151,117,250,0.13)" },
] as const;
type StageKey = (typeof STAGES)[number]["key"];

// Year columns on the plate. The dollar on each column is sourced capital
// *raised* that year (sum of capital-lane round sizes) — never valuation
// or market cap. Neuralink $650m is a Series E raise.
const YEARS = [2024, 2025, 2026] as const;

// Naveen's Q1+ 2026 memo chart (capital.json). Independent comparison cut —
// not a sum of the dots, and not shown as the year-column hero.
const MEMO_CAPITAL = CAPITAL;

const PLOT_TOP = 24;
const LANE_LABEL_H = 20;
const ROW_H = 46;
const MARKER = 34;
const LOGO = 24;
const LANE_PAD_BOTTOM = 14;
const LANE_GAP = 8;
const MARKER_GAP = 4;
const FOCUS_W = 78; // focused year column width (% of the columns area)
const NARROW_W = 9; // collapsed year column width (%)
const FULL_W = 1360; // px width of the 2026 full-year plot (scrolls inside its column)
const YEAR_EASE = "width 500ms cubic-bezier(0.22,1,0.36,1)";
const DOCK_RADIUS = 100;
const DOCK_MAX = 0.5;
const SCATTER = [
  [30, 12], [55, 22], [24, 34], [60, 46], [36, 58], [52, 70], [28, 82], [58, 90], [40, 26], [46, 52],
];

const dateOf = (s: string) => new Date(s + "T00:00:00Z").getTime();
const pctIn = (dateStr: string, t0: number, t1: number) => Math.min(Math.max((dateOf(dateStr) - t0) / (t1 - t0), 0), 1) * 100;
const pctToT = (p: number, t0: number, t1: number) => t0 + (p / 100) * (t1 - t0);
function fmtDate(t: number): string {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
function fmtDateFull(dateStr: string): string {
  return new Date(dateOf(dateStr)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
function fmtUsd(m: number): string {
  return m >= 1000 ? `$${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)}b` : `$${Math.round(m)}m`;
}
function capitalRaisedInYear(year: number, scope: "all" | "bci" = "all"): number {
  return MILESTONES.filter(
    (m) =>
      m.stage === "capital" &&
      m.amountUsdM &&
      m.date &&
      yearOf(m.date) === year &&
      (scope === "all" || (m as { scope?: string }).scope === "bci"),
  ).reduce((sum, m) => sum + (m.amountUsdM ?? 0), 0);
}
function expandActivity(activity: string): [string, string | null][] {
  return activity.split("/").map((tok) => [tok, lookupAcronym(tok.trim())?.expansion ?? null]);
}
function subcatOf(token: string): string {
  return token.trim().startsWith("$") ? "$" : token.trim();
}
function subcatsOf(m: Milestone): string[] {
  return Array.from(new Set(m.activity.split("/").map(subcatOf)));
}
function subcatLabel(sub: string): string {
  return sub === "$" ? "$ amount" : sub;
}

const ALL_SUBCATS: Record<StageKey, string[]> = (() => {
  const out = { capital: [], clinical: [], commercial: [] } as Record<StageKey, string[]>;
  for (const s of STAGES) {
    const set = new Set<string>();
    for (const m of MILESTONES) if (m.stage === s.key) subcatsOf(m).forEach((x) => set.add(x));
    out[s.key] = Array.from(set).sort((a, b) => a.localeCompare(b));
  }
  return out;
})();

function cumulativeCapital(year: number, scope: "all" | "bci" = "all") {
  const caps = MILESTONES.filter(
    (m) =>
      m.stage === "capital" &&
      m.amountUsdM &&
      m.date &&
      yearOf(m.date) === year &&
      (scope === "all" || (m as { scope?: string }).scope === "bci"),
  ).sort((a, b) => (a.date! < b.date! ? -1 : 1));
  let s = 0;
  return caps.map((m) => { s += m.amountUsdM!; return { x: m.date as string, y: s }; });
}

export function MilestoneTimeline() {
  const [sel, setSel] = useState<Record<StageKey, Set<string>>>({
    capital: new Set(ALL_SUBCATS.capital),
    clinical: new Set(ALL_SUBCATS.clinical),
    commercial: new Set(ALL_SUBCATS.commercial),
  });
  const [scopeFilter, setScopeFilter] = useState<"all" | "bci">("all");
  const [openStage, setOpenStage] = useState<StageKey | null>(null);
  const [focusYear, setFocusYearRaw] = useState(2026);
  const [railOpen, setRailOpen] = useState(true);
  const [now, setNow] = useState<number | null>(null);
  const [dock, setDock] = useState<{ x: number; y: number; w: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tip, setTip] = useState<{ m: Milestone; x: number; y: number; below: boolean } | null>(null);
  const [pillTip, setPillTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [selRange, setSelRange] = useState<{ a: number; b: number } | null>(null);
  const setFocusYear = (year: number) => {
    setFocusYearRaw(year);
    setSelRange(null);
  };

  const plotRef = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(FULL_W);
  const dragStart = useRef<number | null>(null);
  const dragged = useRef(false);

  useEffect(() => setNow(Date.now()), []);

  // Pack in rendered pixels, but retain the exact date-derived x coordinate.
  // The folded plot changes width; extra rows grow each lane instead of shrinking logos.
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.getBoundingClientRect().width;
      if (width > 0) setPlotWidth(width);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [focusYear, railOpen]);

  const matches = (m: Milestone) => {
    if (scopeFilter === "bci" && (m as { scope?: string }).scope !== "bci") return false;
    return subcatsOf(m).some((sub) => sel[m.stage as StageKey]?.has(sub));
  };

  const { lanes, totalH, undated } = useMemo(() => {
    let y = PLOT_TOP;
    const lanes = STAGES.filter((s) => sel[s.key].size > 0).flatMap((stage) => {
      const evs = MILESTONES.filter((m) => m.stage === stage.key && m.date && yearOf(m.date) === focusYear && matches(m)).sort((a, b) => (a.date! < b.date! ? -1 : 1));
      if (evs.length === 0) return [];
      const rowLast: number[] = [];
      const placed = evs.map((m) => {
        const left = pctIn(m.date!, boundsOf(focusYear).t0, boundsOf(focusYear).t1);
        let row = rowLast.findIndex((last) => ((left - last) / 100) * plotWidth >= MARKER + MARKER_GAP);
        if (row === -1) { row = rowLast.length; rowLast.push(left); } else { rowLast[row] = left; }
        return { m, left, row };
      });
      const nRows = Math.max(1, ...placed.map((p) => p.row + 1));
      const height = LANE_LABEL_H + nRows * ROW_H + LANE_PAD_BOTTOM;
      const top = y;
      y += height + LANE_GAP;
      return [{ stage, placed, height, top }];
    });
    const undated = MILESTONES.filter((m) => !m.date && matches(m));
    return { lanes, totalH: Math.max(y, PLOT_TOP + 120), undated };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, focusYear, scopeFilter, plotWidth]);

  const agg = useMemo(() => {
    const { t0, t1: yearEnd } = boundsOf(focusYear);
    const [t1, t2] = selRange
      ? [pctToT(Math.min(selRange.a, selRange.b), t0, yearEnd), pctToT(Math.max(selRange.a, selRange.b), t0, yearEnd)]
      : [t0, yearEnd];
    const rows = STAGES.filter((s) => sel[s.key].size > 0).map((stage) => {
      const evs = MILESTONES.filter((m) => m.stage === stage.key && m.date && yearOf(m.date) === focusYear && matches(m) && dateOf(m.date) >= t1 && dateOf(m.date) <= t2);
      const usd = evs.reduce((s, m) => s + (m.amountUsdM ?? 0), 0);
      const rounds = evs.filter((m) => m.amountUsdM).length;
      const byType: Record<string, number> = {};
      evs.forEach((m) => subcatsOf(m).forEach((sub) => { if (sub !== "$") byType[sub] = (byType[sub] ?? 0) + 1; }));
      const breakdown = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${k}`).join(" · ");
      return { stage, count: evs.length, usd, rounds, breakdown };
    });
    return { t1, t2, rows };
  }, [sel, selRange, focusYear, scopeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const clickGroup = (key: StageKey) => {
    if (openStage !== key) { setOpenStage(key); return; }
    setSel((v) => ({ ...v, [key]: v[key].size === ALL_SUBCATS[key].length ? new Set<string>() : new Set(ALL_SUBCATS[key]) }));
  };
  const toggleSub = (stage: StageKey, sub: string) =>
    setSel((v) => {
      const next = new Set(v[stage]);
      if (next.has(sub)) next.delete(sub); else next.add(sub);
      return { ...v, [stage]: next };
    });

  const showTip = (e: React.MouseEvent<HTMLElement>, m: Milestone) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = clampCenteredTooltipX(r.left + r.width / 2, 288);
    const below = r.top < 190;
    setTip({ m, x, y: below ? r.bottom + 8 : r.top - 8, below });
  };
  const stageColor = (key: string) => STAGES.find((s) => s.key === key)?.color;

  const dockScale = (leftPct: number, absY: number) => {
    if (!dock) return 1;
    const mx = (leftPct / 100) * dock.w;
    const dist = Math.hypot(mx - dock.x, absY - dock.y);
    return 1 + DOCK_MAX * Math.max(0, 1 - dist / DOCK_RADIUS);
  };
  const xToPct = (clientX: number) => {
    const r = plotRef.current!.getBoundingClientRect();
    return Math.min(Math.max((clientX - r.left) / r.width, 0), 1) * 100;
  };

  const capitalLine = (H: number) => {
    const { t0, t1 } = boundsOf(focusYear);
    const series = cumulativeCapital(focusYear, scopeFilter);
    const pts = [{ x: 0, y: 0 }, ...series.map((p) => ({ x: pctIn(p.x, t0, t1), y: p.y }))];
    const last = pts[pts.length - 1];
    const yMax = last.y || 1;
    const ys = (v: number) => H - 5 - (v / yMax) * (H - 12);
    return {
      solid: pts.map((p) => `${p.x.toFixed(2)},${ys(p.y).toFixed(2)}`).join(" "),
    };
  };

  const scatter = (opacity: number) => (
    <div className="absolute inset-0" style={{ filter: "blur(6px)", opacity }} aria-hidden>
      {SCATTER.map(([x, yy], i) => (
        <span key={i} className="absolute rounded-full" style={{ left: `${x}%`, top: `${yy}%`, width: 14, height: 14, background: STAGES[i % 3].color }} />
      ))}
    </div>
  );

  // The focused year is wider than its column on purpose. A visible scrollbar,
  // a "scroll for later months" cue, and a jump-to-latest control keep the
  // months past the fold from looking like the year has ended.
  const plotScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLater, setCanScrollLater] = useState(false);
  const [scrolledLater, setScrolledLater] = useState(false);
  const [scrollRatio, setScrollRatio] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const syncPlotScroll = () => {
    const el = plotScrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const nextCan = max > 8;
    const nextScrolled = el.scrollLeft > 24;
    const nextRatio = max > 8 ? el.clientWidth / el.scrollWidth : 1;
    const nextOffset = max > 8 ? el.scrollLeft / max : 0;
    setCanScrollLater((prev) => (prev === nextCan ? prev : nextCan));
    setScrolledLater((prev) => (prev === nextScrolled ? prev : nextScrolled));
    setScrollRatio((prev) => (Math.abs(prev - nextRatio) < 0.01 ? prev : nextRatio));
    setScrollOffset((prev) => (Math.abs(prev - nextOffset) < 0.01 ? prev : nextOffset));
  };
  useEffect(() => {
    const el = plotScrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(syncPlotScroll);
    });
    observer.observe(el);
    const frame = requestAnimationFrame(syncPlotScroll);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [focusYear, railOpen, totalH]);
  const scrollPlotTo = (edge: "start" | "end") => {
    const el = plotScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: edge === "end" ? el.scrollWidth : 0, behavior: "smooth" });
  };

  const plot = (
    <div className="relative">
      {canScrollLater && !scrolledLater && (
        <button
          type="button"
          onClick={() => scrollPlotTo("end")}
          className="absolute right-2 -top-6 z-20 flex items-center gap-1 rounded-full border border-border-strong bg-surface px-2 py-0.5 text-[12px] font-semibold text-foreground shadow-sm hover:border-accent"
        >
          Later months
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      )}
      {canScrollLater && scrolledLater && (
        <button
          type="button"
          onClick={() => scrollPlotTo("start")}
          className="absolute left-2 -top-6 z-20 flex items-center gap-1 rounded-full border border-border-strong bg-surface px-2 py-0.5 text-[12px] font-semibold text-foreground shadow-sm hover:border-accent"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
          Earlier months
        </button>
      )}
      <div
        ref={plotScrollRef}
        onScroll={syncPlotScroll}
        className="milestone-year-scroll"
        style={{ height: totalH + 22 }}
        tabIndex={0}
        aria-label={`${focusYear} timeline. Scroll horizontally for later months.`}
      >
      <div
        ref={plotRef}
        className="relative cursor-crosshair select-none"
        style={{ width: railOpen ? FULL_W : "100%", height: totalH }}
        onPointerDown={(e) => { dragStart.current = xToPct(e.clientX); dragged.current = false; setSelRange(null); }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setDock({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width });
          if (dragStart.current != null) {
            const p = xToPct(e.clientX);
            if (Math.abs(p - dragStart.current) > 0.5) { dragged.current = true; setSelRange({ a: dragStart.current, b: p }); }
          }
        }}
        onPointerUp={() => { if (dragStart.current != null && !dragged.current) setSelRange(null); dragStart.current = null; }}
        onMouseLeave={() => setDock(null)}
      >
        {lanes.map((l) => {
          const cap = l.stage.key === "capital" ? capitalLine(l.height) : null;
          return (
            <div key={l.stage.key} className="absolute left-0 right-0 overflow-hidden rounded-xl" style={{ top: l.top, height: l.height, background: l.stage.soft }}>
              {cap && (
                <svg className="pointer-events-none absolute inset-0" width="100%" height={l.height} viewBox={`0 0 100 ${l.height}`} preserveAspectRatio="none" aria-hidden>
                  <polyline points={cap.solid} fill="none" stroke={l.stage.color} strokeWidth={1} opacity={0.4} vectorEffect="non-scaling-stroke" />
                </svg>
              )}
              <span className="absolute left-2.5 top-1.5 text-[12px] font-semibold text-foreground">{l.stage.label}</span>
            </div>
          );
        })}

        {selRange && (
          <div className="pointer-events-none absolute bottom-0 top-0 rounded-md border-x" style={{ left: `${Math.min(selRange.a, selRange.b)}%`, width: `${Math.abs(selRange.a - selRange.b)}%`, background: "var(--accent-soft)", borderColor: "var(--accent)", opacity: 0.6, zIndex: 3 }} />
        )}

        {monthsOf(focusYear).map((mo) => {
          const { t0, t1 } = boundsOf(focusYear);
          const left = ((mo.t - t0) / (t1 - t0)) * 100;
          return (
            <div key={mo.label} className="absolute bottom-0 top-0" style={{ left: `${left}%`, zIndex: 1 }}>
              <div className="absolute bottom-0 top-5 border-l border-border/70" />
              <div className={`absolute top-0 whitespace-nowrap text-[12px] font-medium text-muted ${left === 0 ? "" : "-translate-x-1/2"}`}>{mo.label}</div>
            </div>
          );
        })}

        {now != null && focusYear === 2026 && (() => {
          const { t0, t1 } = boundsOf(focusYear);
          const p = ((now - t0) / (t1 - t0)) * 100;
          if (p < 0 || p > 100) return null;
          return (
            <div className="pointer-events-none absolute bottom-0 top-0" style={{ left: `${p}%`, zIndex: 2 }}>
              <div className="absolute bottom-0 top-5 border-l-2 border-dashed" style={{ borderColor: "var(--accent)" }} />
              <div className="absolute top-5 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-1.5 py-0.5 text-[12px] font-semibold" style={{ color: "var(--accent-foreground)" }}>today</div>
            </div>
          );
        })()}

        {lanes.flatMap((l) =>
          l.placed.map(({ m, left, row }) => {
            const top = l.top + LANE_LABEL_H + row * ROW_H;
            const scale = dockScale(left, top + MARKER / 2);
            const color = l.stage.color;
            const key = `${m.company}-${m.activity}-${m.date}`;
            const isHover = hovered === key;
            return (
              <a
                key={key}
                href={m.sourceUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                onMouseEnter={(e) => { setHovered(key); showTip(e, m); }}
                onMouseLeave={() => { setHovered(null); setTip(null); }}
                onClick={(e) => { if (dragged.current) e.preventDefault(); }}
                className={`absolute flex items-center rounded-full border-2 bg-surface shadow-sm transition-transform duration-100 ease-out ${m.sourceUrl ? "cursor-pointer" : "cursor-default"}`}
                style={{
                  left: `${left}%`, top, height: MARKER,
                  width: isHover ? "auto" : MARKER,
                  paddingLeft: isHover ? 4 : 0, paddingRight: isHover ? 11 : 0,
                  justifyContent: isHover ? "flex-start" : "center",
                  borderColor: color,
                  transform: `translateX(-50%) scale(${scale.toFixed(3)})`,
                  transformOrigin: "center",
                  zIndex: isHover ? 40 : scale > 1.02 ? Math.round(scale * 20) : 4,
                }}
                aria-label={`${m.company} — ${m.activity}`}
              >
                <FirmLogo src={m.logo} name={m.company} size={LOGO} />
                {isHover && <span className="ml-1.5 whitespace-nowrap text-[12px] font-semibold">{m.company}</span>}
              </a>
            );
          }),
        )}
      </div>
      </div>
      {canScrollLater && (
        <button
          type="button"
          onClick={() => scrollPlotTo(scrolledLater ? "start" : "end")}
          aria-label={scrolledLater ? "Show earlier months" : "Show later months"}
          className="mt-2 flex h-3.5 w-full items-center rounded-full border border-border bg-surface-raised px-0.5"
        >
          <span
            className="block h-2.5 rounded-full bg-muted"
            style={{ width: `${Math.max(18, scrollRatio * 100)}%`, marginLeft: `${scrollOffset * (100 - Math.max(18, scrollRatio * 100))}%` }}
          />
        </button>
      )}
      {canScrollLater && (
        <div className="mt-1.5 flex items-center justify-between gap-3 text-[12px] text-muted">
          <span>
            {scrolledLater ? "Earlier months are off to the left." : "Later months are off to the right. Use the bar"}
            <span className="hidden lg:inline">, or fold the side panel</span>.
          </span>
          <span className="hidden shrink-0 font-medium sm:inline">Jan → Dec</span>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Scope filter and stage legend */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Scope filter toggle */}
        <div className="inline-flex rounded-full border border-border bg-surface-raised p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setScopeFilter("all")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              scopeFilter === "all"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            All neurotech <span className="tnum ml-1 opacity-75">{MILESTONES.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter("bci")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              scopeFilter === "bci"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            BCI only <span className="tnum ml-1 opacity-75">{MILESTONES.filter((m) => (m as { scope?: string }).scope === "bci").length}</span>
          </button>
        </div>

        <span className="mx-0.5 hidden h-4 w-px bg-border sm:inline-block" aria-hidden />

        {/* Stage filters */}
        {STAGES.map((s) => {
          const subs = ALL_SUBCATS[s.key];
          const selected = sel[s.key];
          const total = MILESTONES.filter((m) => m.stage === s.key && (scopeFilter === "all" || (m as { scope?: string }).scope === "bci")).length;
          const open = openStage === s.key;
          const noneOn = selected.size === 0;
          return (
            <div key={s.key} className={`flex min-w-0 flex-wrap items-center gap-1.5 ${open ? "w-full" : ""}`}>
              <button type="button" onClick={() => clickGroup(s.key)} aria-expanded={open}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${open ? "border-border-strong bg-surface-raised" : noneOn ? "border-border opacity-40" : "border-border-strong"}`}>
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
                <span className="tnum text-muted">{total}</span>
                {!open && <span className="text-[12px] text-muted" aria-hidden>▸</span>}
              </button>
              <div className={`grid min-w-0 max-w-full transition-all duration-300 ease-out ${open ? "flex-1 basis-full grid-cols-[1fr] opacity-100 sm:basis-auto" : "grid-cols-[0fr] opacity-0"}`}>
                <div className="min-w-0 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-1.5 pr-1">
                    <span className="mx-0.5 h-5 w-px shrink-0 bg-border-strong" aria-hidden />
                    {subs.map((sub) => {
                      const on = selected.has(sub);
                      const count = MILESTONES.filter((m) => m.stage === s.key && (scopeFilter === "all" || (m as { scope?: string }).scope === "bci") && subcatsOf(m).includes(sub)).length;
                      const expansion = lookupAcronym(sub)?.expansion;
                      return (
                        <button key={sub} type="button" onClick={() => toggleSub(s.key, sub)}
                          onMouseEnter={(e) => { if (!expansion) return; const r = e.currentTarget.getBoundingClientRect(); setPillTip({ text: expansion, x: clampCenteredTooltipX(r.left + r.width / 2, Math.min(280, expansion.length * 7 + 24)), y: r.top - 6 }); }}
                          onMouseLeave={() => setPillTip(null)} aria-pressed={on}
                          className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium transition-all ${on ? "border-border-strong" : "border-border opacity-40"}`}
                          style={on ? { borderColor: s.color } : undefined}>
                          {subcatLabel(sub)}
                          <span className="tnum text-muted">{count}</span>
                        </button>
                      );
                    })}
                    <button type="button" onClick={() => setOpenStage(null)} aria-label={`Collapse ${s.label}`} title="Collapse"
                      className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <span className="ml-auto hidden text-[12px] text-muted md:block">click a year to focus · drag across to summarize · hover a logo for details</span>
      </div>

      <div className="flex gap-4">
        {/* Year columns */}
        <div className="min-w-0 flex-1">
          <div className="milestone-year-strip -mt-7 flex gap-2 overflow-x-auto pb-2 pt-7">
            {YEARS.map((year) => {
              const focused = focusYear === year;
              const w = `${focused ? FOCUS_W : NARROW_W}%`;
              if (focused) {
                return <div key={year} className="milestone-focused-year shrink-0" style={{ width: w, minWidth: 240, transition: YEAR_EASE }}>{plot}</div>;
              }
              const raised = capitalRaisedInYear(year, scopeFilter);
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => setFocusYear(year)}
                  aria-label={`Focus ${year}: ${fmtUsd(raised)} raised`}
                  className="milestone-collapsed-year group relative shrink-0 overflow-hidden rounded-xl border border-dashed border-border-strong bg-surface-raised text-left hover:border-border"
                  style={{ width: w, minWidth: 72, height: totalH, transition: YEAR_EASE }}
                >
                  {scatter(0.18)}
                  <div className="absolute inset-x-0 top-5 px-2 text-center">
                    <div className="text-[12px] font-semibold text-muted">{year}</div>
                    <div className="tnum text-sm font-semibold tracking-tight">{fmtUsd(raised)}</div>
                    <div className="mt-0.5 text-[12px] leading-tight text-muted">raised</div>
                  </div>
                </button>
              );
            })}
          </div>

          {focusYear === 2026 && undated.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dashed border-border pt-3">
              <span className="mr-1 text-[12px] font-semibold text-muted">date TBD</span>
              {undated.map((m) => (
                <a key={`${m.company}-${m.activity}-${m.date ?? "undated"}`} href={m.sourceUrl ?? undefined} target="_blank" rel="noreferrer"
                  onMouseEnter={(e) => showTip(e, m)} onMouseLeave={() => setTip(null)}
                  className={`grid place-items-center rounded-full border-2 border-dashed bg-surface transition-transform hover:scale-110 ${m.sourceUrl ? "cursor-pointer hover:border-solid" : "cursor-default"}`}
                  style={{ width: MARKER, height: MARKER, borderColor: stageColor(m.stage) }} aria-label={`${m.company} — ${m.activity} (date TBD)`}>
                  <FirmLogo src={m.logo} name={m.company} size={LOGO} />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Collapsible summary rail. Folding it gives the focused year the full width. */}
        {railOpen ? (
          <aside className="hidden w-48 shrink-0 lg:block">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-muted">Capital raised</span>
              <button type="button" onClick={() => setRailOpen(false)} aria-label="Fold side panel to show the full year" title="Fold panel — show the full year"
                className="flex shrink-0 items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[12px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground">
                Fold
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
            {YEARS.map((year) => (
              <button key={year} type="button" onClick={() => setFocusYear(year)}
                className={`mb-1 flex w-full flex-col gap-0.5 rounded px-1 py-1 text-left transition-colors hover:bg-surface-raised ${focusYear === year ? "bg-surface-raised" : ""}`}>
                <span className="tnum flex items-baseline justify-between text-[13px]">
                  <span className={focusYear === year ? "font-semibold text-foreground" : "text-muted"}>{year}</span>
                  <span className="font-semibold">{fmtUsd(capitalRaisedInYear(year, scopeFilter))}</span>
                </span>
                {year === 2026 && cumulativeCapital(2026, scopeFilter).length > 1 && <span className="mt-0.5 block"><Sparkline series={cumulativeCapital(2026, scopeFilter)} width={166} height={22} /></span>}
              </button>
            ))}
            <div className="mt-1 px-1 text-[12px] leading-snug text-muted">Sourced round sizes on this lane — not valuations or market cap. Fold this panel to see a full year without scrolling.</div>
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-1 text-[12px] font-semibold text-muted">Memo cut</div>
              {MEMO_CAPITAL.map((c) => (
                <div key={c.year} className="tnum flex items-baseline justify-between px-1 text-[12px] text-muted">
                  <span>{c.year}</span>
                  <span>{fmtUsd(c.usdM)}</span>
                </div>
              ))}
              <div className="mt-1 px-1 text-[12px] leading-snug text-muted">Naveen’s Q1+ 2026 chart. Independent of the dots.</div>
            </div>

            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-muted">{selRange ? "Selected window" : "Full period"}</span>
                {selRange && <button type="button" onClick={() => setSelRange(null)} className="text-[12px] font-medium text-accent hover:underline">clear</button>}
              </div>
              <div className="tnum mb-3 text-[12px] text-muted">{fmtDate(agg.t1)} – {fmtDate(agg.t2)}, {focusYear}</div>
              <div className="space-y-3">
                {agg.rows.map((r) => (
                  <div key={r.stage.key}>
                    <div className="mb-0.5 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: r.stage.color }} />
                      <span className="text-[12px] font-semibold">{r.stage.label}</span>
                    </div>
                    {r.stage.key === "capital" ? (
                      <>
                        <div className="tnum text-[15px] font-semibold">{fmtUsd(r.usd)}</div>
                        <div className="text-[12px] text-muted">{r.rounds} round{r.rounds === 1 ? "" : "s"} raised{r.count > r.rounds ? ` · ${r.count - r.rounds} grant` : ""}</div>
                      </>
                    ) : (
                      <>
                        <div className="tnum text-[15px] font-semibold">{r.count}{r.usd > 0 && <span className="ml-1 text-[12px] font-medium text-muted">· {fmtUsd(r.usd)}</span>}</div>
                        <div className="text-[12px] leading-snug text-muted">{r.breakdown || "—"}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        ) : (
          <button type="button" onClick={() => setRailOpen(true)} aria-label="Open side panel" title="Open side panel"
            className="hidden shrink-0 flex-col items-center gap-2 rounded-lg border border-border pt-3 text-muted transition-colors hover:border-border-strong hover:text-foreground lg:flex" style={{ width: 28 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            <span className="text-[12px] font-semibold [writing-mode:vertical-rl]">Panel</span>
          </button>
        )}
      </div>

      {pillTip && (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[12px] font-medium text-background shadow-lg" style={{ left: pillTip.x, top: pillTip.y }}>{pillTip.text}</div>
      )}

      {tip && (
        <div className={`pointer-events-none fixed z-50 w-72 -translate-x-1/2 rounded-xl bg-foreground p-3 shadow-2xl ${tip.below ? "" : "-translate-y-full"}`} style={{ left: tip.x, top: tip.y }}>
          <div className="mb-1 flex items-center gap-2">
            <FirmLogo src={tip.m.logo} name={tip.m.company} size={18} />
            <span className="text-[13px] font-semibold text-background">{tip.m.company}</span>
            <span className="ml-auto flex items-center gap-1">
              <span className="rounded-full bg-background/15 px-1.5 py-0.5 text-[12px] font-semibold text-background/80">{(tip.m as { scope?: string }).scope === "bci" ? "BCI" : "Neuro"}</span>
              <span className="rounded-full px-1.5 py-0.5 text-[12px] font-semibold text-background/90" style={{ background: stageColor(tip.m.stage) }}>{tip.m.stage}</span>
            </span>
          </div>
          <div className="tnum text-[12px] font-medium text-background/90">
            {tip.m.stage === "capital" && tip.m.amountUsdM ? `${tip.m.activity} raised` : tip.m.activity}
            <span className="text-background/60">{" · "}{tip.m.date ? fmtDateFull(tip.m.date) : "exact date TBD"}</span>
          </div>
          {expandActivity(tip.m.activity).filter(([, ex]) => ex).length > 0 && (
            <div className="mt-1 text-[12px] leading-snug text-background/60">{expandActivity(tip.m.activity).filter(([, ex]) => ex).map(([tok, ex]) => `${tok} — ${ex}`).join(" · ")}</div>
          )}
          <div className="mt-1.5 text-[12px] leading-relaxed text-background/75">{tip.m.note ?? "Details coming soon."}</div>
          {tip.m.sourceUrl && <div className="mt-1.5 text-[12px] font-medium text-background/50">click to open source ↗</div>}
        </div>
      )}
    </div>
  );
}
