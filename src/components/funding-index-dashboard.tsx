"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { FirmLogo } from "@/components/firm-logo";
import { lookupAcronym } from "@/components/abbr";
import {
  buildCompanyRows,
  formatCapital,
  formatFundingDate,
  getTimelinePosition,
  type FundingCompanyRow,
  type FundingIndexData,
} from "@/lib/funding-index";
import { clampCenteredTooltipX } from "@/lib/tooltip-position";

function sourceReviewLabel(date: string) {
  const precision = date.length === 10 ? "day" : date.length === 7 ? "month" : "year";
  return `Source reviewed ${formatFundingDate(date, precision)}`;
}

function sourceKindLabel(kind: "primary" | "reporting") {
  return kind === "primary" ? "Primary source" : "Reported source";
}

function markerTitle(marker: string, indication?: string) {
  const expansion = lookupAcronym(marker)?.expansion ?? marker;
  return indication ? `${marker} — ${expansion} · ${indication}` : `${marker} — ${expansion}`;
}

type PrimaryView = "companies" | "investors";
type CompanyView = "timeline" | "stage";

export function FundingIndexDashboard({ data }: { data: FundingIndexData }) {
  const [primaryView, setPrimaryView] = useState<PrimaryView>("companies");
  const [companyView, setCompanyView] = useState<CompanyView>("timeline");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("All");
  const [modality, setModality] = useState("All");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [markerTip, setMarkerTip] = useState<{ title: string; body: string; x: number; y: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const modalities = useMemo(
    () => ["All", ...new Set(data.companies.map((company) => company.modality))].sort((a, b) =>
      a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b),
    ),
    [data.companies],
  );
  const rows = useMemo(
    () => buildCompanyRows(data.companies, data.rounds, { query, scope, modality }),
    [data.companies, data.rounds, modality, query, scope],
  );
  const selected = useMemo(
    () => buildCompanyRows(data.companies, data.rounds, { query: "", scope: "All", modality: "All" }).find((row) => row.slug === selectedSlug) ?? null,
    [data.companies, data.rounds, selectedSlug],
  );
  const selectedMilestones = useMemo(
    () => data.milestones.filter((milestone) => milestone.companySlug === selectedSlug),
    [data.milestones, selectedSlug],
  );
  const stageGroups = useMemo(() => {
    const groups = new Map<string, FundingCompanyRow[]>();
    for (const row of rows) {
      const group = groups.get(row.latestStage) ?? [];
      group.push(row);
      groups.set(row.latestStage, group);
    }
    return [...groups.entries()]
      .map(([stage, companies]) => ({
        stage,
        companies,
        capital: companies.reduce((sum, company) => sum + company.observedCapitalUsdM, 0),
      }))
      .sort((a, b) => b.capital - a.capital);
  }, [rows]);

  useEffect(() => {
    if (!selectedSlug) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedSlug(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [selectedSlug]);

  const years = Array.from(
    { length: data.summary.lastYear - data.summary.firstYear + 1 },
    (_, index) => data.summary.firstYear + index,
  );
  const maxInvestorRounds = Math.max(...data.investors.map((investor) => investor.roundCount), 1);

  const showMarkerTip = (event: MouseEvent<HTMLElement>, marker: string, indication?: string) => {
    const entry = lookupAcronym(marker);
    const r = event.currentTarget.getBoundingClientRect();
    setMarkerTip({
      title: entry ? `${marker} — ${entry.expansion}` : marker,
      body: [entry?.definition, indication].filter(Boolean).join(" · "),
      x: clampCenteredTooltipX(r.left + r.width / 2, 256),
      y: r.top - 6,
    });
  };

  return (
    <div>
      <section className="sticky top-0 z-30 -mx-5 mt-8 border-y border-border bg-background/95 px-5 py-4 backdrop-blur-md sm:-mx-7 sm:px-7 lg:-mx-9 lg:px-9">
        <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-full border border-border bg-nav p-0.5" aria-label="Index lens">
              {(["companies", "investors"] as PrimaryView[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  aria-pressed={primaryView === view}
                  onClick={() => setPrimaryView(view)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${primaryView === view ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
                >
                  {view}
                </button>
              ))}
            </div>
            {primaryView === "companies" && (
              <div className="inline-flex rounded-full border border-border bg-nav p-0.5" aria-label="Company view">
                {(["timeline", "stage"] as CompanyView[]).map((view) => (
                  <button
                    key={view}
                    type="button"
                    aria-pressed={companyView === view}
                    onClick={() => setCompanyView(view)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${companyView === view ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            )}
          </div>

          {primaryView === "companies" && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
              <label className="relative">
                <span className="sr-only">Search companies</span>
                <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-current text-faint" strokeWidth="1.8">
                  <circle cx="8.5" cy="8.5" r="5.5" />
                  <path d="m12.5 12.5 4 4" />
                </svg>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name or modality…"
                  className="h-10 w-full min-w-0 rounded-full border border-border bg-surface-raised pl-10 pr-4 text-sm outline-none ring-accent placeholder:text-muted focus:ring-2 sm:w-[260px]"
                />
              </label>
              <select
                aria-label="Filter by modality"
                value={modality}
                onChange={(event) => setModality(event.target.value)}
                className="h-10 w-full rounded-full border border-border bg-surface-raised px-4 sm:w-[190px] text-sm font-medium outline-none ring-accent focus:ring-2"
              >
                {modalities.map((item) => <option key={item}>{item}</option>)}
              </select>
              <div className="flex max-w-full overflow-x-auto rounded-full border border-border bg-surface-raised p-1" aria-label="Filter by scope">
                {["All", "Implanted", "Minimally invasive", "Implant-adjacent"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={scope === item}
                    onClick={() => setScope(item)}
                    className={`whitespace-nowrap rounded-full px-2 py-1.5 text-[10px] font-medium sm:px-3 sm:text-[11px] ${scope === item ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-8 lg:py-10">
        <div className="mx-auto max-w-[1480px]">
          {primaryView === "companies" && companyView === "timeline" && (
            <div className="overflow-x-auto rounded-3xl border border-border bg-surface-raised shadow-[0_20px_60px_rgba(28,34,55,0.08)]">
              <div className="grid min-w-[1055px] grid-cols-[220px_minmax(700px,1fr)_110px] sm:min-w-[1120px] sm:grid-cols-[330px_minmax(655px,1fr)_110px] border-b border-border bg-nav px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                <div><span className="hidden sm:inline">Company · click for detail</span><span className="sm:hidden">Tap company · swipe years →</span></div>
                <div className="relative h-4">
                  {years.map((year, index) => (
                    <span
                      key={year}
                      className="absolute -translate-x-1/2"
                      style={{ left: `${((index + 0.5) / Math.max(years.length, 1)) * 100}%` }}
                    >
                      {year}
                    </span>
                  ))}
                </div>
                <div className="text-right">Raised</div>
              </div>
              <div className="min-w-[1055px] sm:min-w-[1120px]">
                {rows.map((row, rowIndex) => {
                  const milestones = data.milestones.filter((milestone) => milestone.companySlug === row.slug);
                  return (
                    <button
                      key={row.slug}
                      type="button"
                      onClick={() => setSelectedSlug(row.slug)}
                      className={`grid w-full grid-cols-[220px_minmax(700px,1fr)_110px] sm:grid-cols-[330px_minmax(655px,1fr)_110px] items-center px-5 py-3.5 text-left transition hover:bg-nav/60 focus:bg-nav/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent ${rowIndex ? "border-t border-border" : ""}`}
                    >
                      <div className="flex min-w-0 items-center gap-3 pr-5">
                        <FirmLogo name={row.name} src={row.logo} size={38} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold tracking-[-0.01em]">{row.name}</div>
                          <div className="mt-0.5 text-[11px] text-muted" data-founding-year={row.slug}>Founding year · <span className="font-medium tabular-nums text-foreground">{row.founding?.year ?? "Unknown"}</span></div>
                          <div className="mt-0.5 truncate text-[11px] text-muted" title={`${row.modality} · ${row.latestStage}`}>{row.modality} · {row.latestStage}</div>
                        </div>
                      </div>
                      <div className="relative h-12 border-x border-border">
                        {years.map((year, yearIndex) => (
                          <span
                            key={year}
                            className="absolute inset-y-0 w-px bg-foreground/10"
                            style={{ left: `${(yearIndex / Math.max(years.length, 1)) * 100}%` }}
                          />
                        ))}
                        {row.rounds.map((round, index) => {
                          const position = getTimelinePosition(round.announcedOn, data.summary.firstYear, data.summary.lastYear);
                          const width = Math.min(76, 20 + Math.sqrt(round.amountUsdM) * 2.1);
                          return (
                            <span
                              key={`${round.announcedOn}-${round.stage}`}
                              className="absolute z-10 flex h-5 items-center justify-center rounded-full border border-accent/20 bg-accent px-1 text-[9px] font-bold text-white shadow-sm"
                              style={{ left: `calc(${position}% - ${width / 2}px)`, top: `${4 + (index % 2) * 22}px`, width: `${width}px` }}
                              title={`${row.name} · ${round.stage} · ${round.displayAmount}`}
                            >
                              {round.amountUsdM >= 20 ? round.displayAmount : ""}
                            </span>
                          );
                        })}
                        {milestones.map((milestone, index) => (
                          <span
                            key={`${milestone.announcedOn}-${milestone.marker}`}
                            className="absolute z-20 -translate-x-1/2 cursor-help rounded bg-[#151821] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm"
                            style={{ left: `${getTimelinePosition(milestone.announcedOn, data.summary.firstYear, data.summary.lastYear)}%`, top: `${29 - (index % 2) * 22}px` }}
                            onMouseEnter={(event) => { event.stopPropagation(); showMarkerTip(event, milestone.marker, milestone.indication); }}
                            onMouseLeave={() => setMarkerTip(null)}
                            aria-label={markerTitle(milestone.marker, milestone.indication)}
                          >
                            {milestone.marker}
                          </span>
                        ))}
                      </div>
                      <div className="pl-4 text-right">
                        <div className="text-sm font-semibold">{formatCapital(row.observedCapitalUsdM)}</div>
                        <div className="mt-0.5 text-[10px] text-faint">{row.rounds.length} {row.rounds.length === 1 ? "round" : "rounds"}</div>
                        {row.rounds.some((round) => round.sourceKind) && <div className="mt-1 text-[10px] text-muted">{[...new Set(row.rounds.flatMap((round) => round.sourceKind ? [sourceKindLabel(round.sourceKind)] : []))].join(" · ")}</div>}
                        {row.rounds.some((round) => round.reviewedOn) && <div className="mt-0.5 text-[10px] text-muted">{[...new Set(row.rounds.flatMap((round) => round.reviewedOn ? [sourceReviewLabel(round.reviewedOn)] : []))].join(" · ")}</div>}
                      </div>
                    </button>
                  );
                })}
                {rows.length === 0 && <div className="px-6 py-20 text-center text-sm text-muted">No companies match these filters.</div>}
              </div>
              <div className="flex flex-wrap items-center gap-5 border-t border-border bg-nav/40 px-5 py-3 text-[10px] text-muted">
                <span><b className="mr-1.5 inline-block h-2.5 w-5 rounded-full bg-accent align-middle" />Financing (width scales with disclosed amount)</span>
                <span className="inline-flex items-center"><b className="mr-1.5 cursor-help rounded bg-[#151821] px-1 py-0.5 text-[9px] text-white" onMouseEnter={(event) => showMarkerTip(event, "IDE")} onMouseLeave={() => setMarkerTip(null)}>IDE</b>Regulatory marker</span>
                <span className="ml-auto">{rows.length} of {data.summary.selectedCompanies} companies</span>
              </div>
            </div>
          )}

          {primaryView === "companies" && companyView === "stage" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stageGroups.map((group) => (
                <article key={group.stage} className="rounded-3xl border border-border bg-surface-raised p-6 shadow-[0_12px_40px_rgba(28,34,55,0.06)]">
                  <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Latest indexed stage</div>
                      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{group.stage}</h2>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{formatCapital(group.capital)}</div>
                      <div className="text-[10px] text-muted">indexed capital raised</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {group.companies.map((row) => (
                      <button key={row.slug} type="button" onClick={() => setSelectedSlug(row.slug)} className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-nav focus:outline-none focus:ring-2 focus:ring-accent">
                        <FirmLogo name={row.name} src={row.logo} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3 text-xs font-semibold"><span className="truncate">{row.name}</span><span>{formatCapital(row.observedCapitalUsdM)}</span></div>
                          <div className="mt-1 text-[11px] text-muted" data-founding-year={row.slug}>Founding year · <span className="font-medium tabular-nums text-foreground">{row.founding?.year ?? "Unknown"}</span></div>
                          {row.rounds.some((round) => round.sourceKind || round.reviewedOn) && <div className="mt-1 text-[10px] text-muted">{[...new Set(row.rounds.flatMap((round) => [round.sourceKind ? sourceKindLabel(round.sourceKind) : "", round.reviewedOn ? sourceReviewLabel(round.reviewedOn) : ""].filter(Boolean)))].join(" · ")}</div>}
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, (row.observedCapitalUsdM / Math.max(group.companies[0]?.observedCapitalUsdM ?? 1, 1)) * 100)}%` }} /></div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 border-t border-border pt-3 text-[10px] text-muted">Bars are scaled within this stage.</p>
                </article>
              ))}
            </div>
          )}

          {primaryView === "investors" && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="overflow-hidden rounded-3xl border border-border bg-surface-raised shadow-[0_20px_60px_rgba(28,34,55,0.08)]">
                <div className="border-b border-border px-6 py-5">
                  <h2 className="text-2xl font-semibold tracking-[-0.04em]">Most active indexed investors</h2>
                  <p className="mt-1 text-sm text-muted">Ranked by participations in the sourced rounds below. Associated capital is the full round size, not attributed check size.</p>
                </div>
                <div className="divide-y divide-black/[0.07]">
                  {data.investors.slice(0, 24).map((investor, index) => (
                    <div key={investor.name} className="grid grid-cols-[32px_minmax(0,1fr)_90px] items-center gap-4 px-6 py-3.5">
                      <div className="text-xs font-semibold text-faint">{String(index + 1).padStart(2, "0")}</div>
                      <div>
                        <div className="text-sm font-semibold">{investor.name}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex gap-1" aria-hidden="true">
                            {Array.from({ length: maxInvestorRounds }, (_, dot) => (
                              <span key={dot} className={`h-2 w-2 rounded-full ${dot < investor.roundCount ? "bg-accent" : "bg-border"}`} />
                            ))}
                          </div>
                          <span className="text-[10px] text-faint">{investor.roundCount} {investor.roundCount === 1 ? "round" : "rounds"} · {investor.companyCount} {investor.companyCount === 1 ? "company" : "companies"}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] uppercase tracking-wide text-muted">associated rounds</div>
                        <div className="mt-0.5 text-xs font-semibold">{formatCapital(investor.associatedCapitalUsdM)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <aside className="self-start rounded-3xl bg-[#171a21] p-7 text-white lg:sticky lg:top-40">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c9f36b]">How to read this</div>
                <h3 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.045em]">Participation, not portfolio exposure.</h3>
                <p className="mt-4 text-sm leading-relaxed text-white/62">The leaderboard counts named investor appearances in the indexed rounds. It does not estimate check size, ownership, reserves, or returns.</p>
                <div className="mt-7 border-t border-white/12 pt-5 text-xs leading-relaxed text-white/65">Round announcements do not always publish every participant. A low count may mean incomplete disclosure, not low conviction.</div>
              </aside>
            </div>
          )}

          <div className="mt-10 grid gap-5 border-t border-border pt-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.17em] text-muted">Screen</div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{data.methodology.scope}</p>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.17em] text-muted">Coverage</div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{data.methodology.coverage} Latest selective review {formatFundingDate(data.summary.asOf, "day")}. Financing histories remain partial, and the indexed sum is not an all-time total.</p>
            </div>
          </div>
        </div>
      </section>

      {markerTip && (
        <div
          className="pointer-events-none fixed z-[80] w-64 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-3 py-2 text-left shadow-lg"
          style={{ left: markerTip.x, top: markerTip.y }}
        >
          <div className="text-[11px] font-semibold leading-snug text-background">{markerTip.title}</div>
          {markerTip.body && <div className="mt-0.5 text-[10px] leading-snug text-background/70">{markerTip.body}</div>}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close company detail" onClick={() => setSelectedSlug(null)} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
          <aside role="dialog" aria-modal="true" aria-labelledby="company-detail-title" className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto bg-surface shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-6 py-4 backdrop-blur">
              <span className="text-[10px] font-bold uppercase tracking-[0.17em] text-muted">Company detail</span>
              <button ref={closeRef} type="button" onClick={() => setSelectedSlug(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-lg text-white outline-none ring-accent focus:ring-2" aria-label="Close detail panel">×</button>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <FirmLogo name={selected.name} src={selected.logo} size={56} />
                <div>
                  <h2 id="company-detail-title" className="text-3xl font-semibold tracking-[-0.045em]">{selected.name}</h2>
                  <p className="mt-1 text-sm text-muted">{selected.hq}</p>
                </div>
              </div>
              <div className="mt-7 flex flex-wrap gap-2">
                {[selected.scope, selected.modality, selected.interfaceDepth].filter(Boolean).map((item) => <span key={item} className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold">{item}</span>)}
              </div>
              <div className="mt-6 rounded-2xl bg-[#11131a] p-6 text-white">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Indexed capital raised</div>
                <div className="mt-1 text-4xl font-semibold tracking-[-0.05em]">{formatCapital(selected.observedCapitalUsdM)}</div>
                <p className="mt-3 text-sm text-white/58">{selected.indication}</p>
              </div>

              <section className="mt-8 rounded-2xl border border-border bg-surface-raised p-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Founding year</h3>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{selected.founding?.year ?? "Unknown"}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{selected.founding?.note ?? "Founding year not yet verified. No date is inferred from financing history."}</p>
                {selected.founding?.reviewedOn && <p className="mt-3 text-xs text-muted">{selected.founding.sourceKind ? `${sourceKindLabel(selected.founding.sourceKind)} · ` : ""}{sourceReviewLabel(selected.founding.reviewedOn)}</p>}
                {selected.founding?.sourceUrl && <a href={selected.founding.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-accent underline decoration-accent/35 underline-offset-4 hover:decoration-accent">Founding source ↗</a>}
              </section>

              <section className="mt-8">
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Financing history</h3>
                <div className="mt-3 space-y-3">
                  {[...selected.rounds].reverse().map((round) => (
                    <article key={`${round.announcedOn}-${round.stage}`} className="rounded-2xl border border-border bg-surface-raised p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div><div className="text-sm font-semibold">{round.stage}</div><div className="mt-1 text-xs text-muted">{formatFundingDate(round.announcedOn, round.datePrecision)}</div></div>
                        <div className="text-lg font-semibold text-accent">{round.displayAmount}</div>
                      </div>
                      {round.sourceKind && <p className="mt-3 text-xs font-semibold">{sourceKindLabel(round.sourceKind)}{round.reviewedOn ? ` · ${sourceReviewLabel(round.reviewedOn)}` : ""}</p>}
                      {round.investors && round.investors.length > 0 && <p className="mt-3 text-xs leading-relaxed text-muted">{round.investors.join(" · ")}</p>}
                      {round.note && <p className="mt-2 text-[11px] leading-relaxed text-faint">{round.note}</p>}
                      {round.sourceUrl && <a href={round.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-accent underline decoration-accent/35 underline-offset-4 hover:decoration-accent">Source ↗</a>}
                    </article>
                  ))}
                </div>
              </section>

              {selectedMilestones.length > 0 && (
                <section className="mt-8">
                  <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Regulatory markers</h3>
                  <div className="mt-3 space-y-3">
                    {selectedMilestones.map((milestone) => (
                      <article key={`${milestone.announcedOn}-${milestone.marker}`} className="rounded-2xl border border-border bg-positive-soft p-4">
                        <div className="flex items-center justify-between gap-3"><span className="cursor-help rounded bg-[#11131a] px-2 py-1 text-[10px] font-bold text-white" onMouseEnter={(event) => showMarkerTip(event, milestone.marker, milestone.indication)} onMouseLeave={() => setMarkerTip(null)} aria-label={markerTitle(milestone.marker, milestone.indication)}>{milestone.marker}</span><span className="text-xs text-muted">{formatFundingDate(milestone.announcedOn, milestone.datePrecision)}</span></div>
                        <p className="mt-3 text-sm font-medium">{milestone.indication}</p>
                        {milestone.note && <p className="mt-1.5 text-xs leading-relaxed text-muted">{milestone.note}</p>}
                        <a href={milestone.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold underline decoration-black/20 underline-offset-4">Source ↗</a>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {selected.website && <a href={selected.website} target="_blank" rel="noreferrer" className="mt-8 flex w-full items-center justify-between rounded-2xl border border-border bg-surface-raised px-5 py-4 text-sm font-semibold hover:border-black/25"><span>Visit company website</span><span>↗</span></a>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
