"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { FirmLogo } from "@/components/firm-logo";
import { lookupAcronym } from "@/components/abbr";
import {
  buildCompanyRows,
  formatCapital,
  formatFundingDate,
  formatFundingFxBasis,
  formatFundingRecordDate,
  reportedTotalFootnote,
  getTimelinePosition,
  type FundingCompanyRow,
  type FundingIndexData,
  type FundingReportedTotal,
} from "@/lib/funding-index";
import { capitalExclusionLabel } from "@/lib/funding-capital.mjs";
import { clampCenteredTooltipX } from "@/lib/tooltip-position";

function sourceReviewLabel(date: string) {
  const precision = date.length === 10 ? "day" : date.length === 7 ? "month" : "year";
  return `Source reviewed ${formatFundingDate(date, precision)}`;
}

function sourceKindLabel(kind: "primary" | "reporting") {
  return kind === "primary" ? "Primary source" : "Reported source";
}

function ReportedTotalAnnotation({ total }: { total?: FundingReportedTotal }) {
  if (!total) return null;
  const footnote = reportedTotalFootnote(total);
  return <span data-reported-company-total title={total.sourceUrl} className="mt-2 block text-xs leading-relaxed text-foreground">
    <span className="font-semibold">{formatCapital(total.amountUsdM)}{footnote && <sup aria-label="See possible-overlap note">*</sup>} company-reported total</span>
    <span className="block text-muted">{total.scope} · Reported <time dateTime={total.reportedOn}>{formatFundingDate(total.reportedOn, "day")}</time> · Source in detail</span>
    {footnote && <span data-reported-total-footnote className="block text-muted">* {footnote}</span>}
  </span>;
}

function markerTitle(marker: string, indication?: string) {
  const expansion = lookupAcronym(marker)?.expansion ?? marker;
  return indication ? `${marker} — ${expansion} · ${indication}` : `${marker} — ${expansion}`;
}

type PrimaryView = "companies" | "investors";
type CompanyView = "timeline" | "stage";

const fundingViewEvent = "funding-index:view-change";
function subscribeFundingView(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(fundingViewEvent, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(fundingViewEvent, onChange);
  };
}
function currentFundingView(): PrimaryView {
  return new URLSearchParams(window.location.search).get("view") === "investors" ? "investors" : "companies";
}
function navigateFundingView(view: PrimaryView) {
  if (currentFundingView() === view) return;
  const url = new URL(window.location.href);
  if (view === "investors") url.searchParams.set("view", view);
  else url.searchParams.delete("view");
  // Next.js integrates native history updates without a route reload or scroll reset.
  window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new Event(fundingViewEvent));
}

export function FundingIndexDashboard({ data }: { data: FundingIndexData }) {
  const primaryView = useSyncExternalStore(subscribeFundingView, currentFundingView, () => "companies");
  const [companyView, setCompanyView] = useState<CompanyView>("timeline");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const filtersToggleRef = useRef<HTMLButtonElement>(null);
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
  const selectedReportedTotal = data.reportedTotals?.find((total) => total.companySlug === selectedSlug);
  const selectedReportedTotalFootnote = selectedReportedTotal ? reportedTotalFootnote(selectedReportedTotal) : null;
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
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

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
      <section data-funding-toolbar className="sticky top-0 z-30 -mx-5 mt-8 border-y border-border bg-background/95 px-5 py-2 backdrop-blur-md sm:-mx-7 sm:px-7 sm:py-4 lg:-mx-9 lg:px-9">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 sm:flex sm:flex-wrap sm:gap-3 xl:justify-between">
          <div className="inline-flex w-fit rounded-full border border-border bg-nav p-0.5" aria-label="Funding view">
            {(["companies", "investors"] as PrimaryView[]).map((view) => (
              <button
                key={view}
                type="button"
                aria-pressed={primaryView === view}
                onClick={() => navigateFundingView(view)}
                className={`min-h-9 rounded-full px-3 py-1.5 text-sm font-medium capitalize outline-none ring-accent transition-colors focus-visible:ring-2 sm:px-4 ${primaryView === view ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
              >
                {view}
              </button>
            ))}
          </div>
          {primaryView === "companies" && <>
            <button
              ref={searchToggleRef}
              type="button"
              aria-label="Toggle company search"
              aria-controls="funding-company-search"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(!searchOpen)}
              className={`relative col-start-2 row-start-1 flex h-10 w-10 items-center justify-center rounded-full border border-border outline-none ring-accent focus-visible:ring-2 sm:hidden ${query || searchOpen ? "bg-foreground text-background" : "bg-surface-raised text-muted"}`}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m12.5 12.5 4 4" /></svg>
              {query && <span className="sr-only">Search active</span>}
            </button>
            <div className="col-start-1 row-start-2 inline-flex w-fit rounded-full border border-border bg-nav p-0.5" aria-label="Company view">
              {(["timeline", "stage"] as CompanyView[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  aria-pressed={companyView === view}
                  onClick={() => setCompanyView(view)}
                  className={`min-h-9 rounded-full px-3 py-1.5 text-sm font-medium capitalize outline-none ring-accent transition-colors focus-visible:ring-2 sm:px-4 ${companyView === view ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
                >
                  {view}
                </button>
              ))}
            </div>
            <button
              ref={filtersToggleRef}
              type="button"
              aria-label="Toggle company filters"
              aria-controls="funding-company-filters"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`col-start-2 row-start-2 min-h-10 rounded-full border border-border px-3 text-xs font-medium outline-none ring-accent focus-visible:ring-2 sm:hidden ${scope !== "All" || modality !== "All" ? "bg-foreground text-background" : "bg-surface-raised text-muted"}`}
            >
              Filters{scope !== "All" || modality !== "All" ? ` · ${Number(scope !== "All") + Number(modality !== "All")}` : ""}
            </button>
            <label id="funding-company-search" className={`${searchOpen ? "block" : "hidden"} relative col-span-2 sm:block xl:ml-auto`}>
              <span className="sr-only">Search companies</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-current text-muted" strokeWidth="1.8">
                <circle cx="8.5" cy="8.5" r="5.5" /><path d="m12.5 12.5 4 4" />
              </svg>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSearchOpen(false);
                    searchToggleRef.current?.focus();
                  }
                }}
                placeholder="Search name or modality…"
                className="h-10 w-full min-w-0 rounded-full border border-border bg-surface-raised pl-10 pr-4 text-sm outline-none ring-accent placeholder:text-muted focus:ring-2 sm:w-[260px]"
              />
            </label>
            <div
              id="funding-company-filters"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setFiltersOpen(false);
                  filtersToggleRef.current?.focus();
                }
              }}
              className={`${filtersOpen ? "block" : "hidden"} absolute inset-x-0 top-full max-h-[70dvh] space-y-3 overflow-y-auto border-b border-border bg-background p-4 shadow-lg sm:static sm:flex sm:max-h-none sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0 sm:overflow-visible sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`}
            >
              <label className="block sm:hidden">
                <span className="mb-1 block text-xs font-medium text-muted">Scope</span>
                <select aria-label="Filter by scope" value={scope} onChange={(event) => setScope(event.target.value)} className="h-10 w-full rounded-full border border-border bg-surface-raised px-4 text-sm outline-none ring-accent focus:ring-2">
                  {["All", "Implanted", "Minimally invasive", "Implant-adjacent"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted sm:hidden">Modality</span>
                <select aria-label="Filter by modality" value={modality} onChange={(event) => setModality(event.target.value)} className="h-10 w-full rounded-full border border-border bg-surface-raised px-4 text-sm font-medium outline-none ring-accent focus:ring-2 sm:w-[190px]">
                  {modalities.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <div className="hidden max-w-full overflow-x-auto rounded-full border border-border bg-surface-raised p-1 sm:flex" aria-label="Filter by scope">
                {["All", "Implanted", "Minimally invasive", "Implant-adjacent"].map((item) => (
                  <button key={item} type="button" aria-pressed={scope === item} onClick={() => setScope(item)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium outline-none ring-accent focus-visible:ring-2 ${scope === item ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>{item}</button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 sm:contents">
                {(query || scope !== "All" || modality !== "All") && <button type="button" onClick={() => { setQuery(""); setScope("All"); setModality("All"); }} className="min-h-10 rounded-full px-3 text-xs font-medium underline underline-offset-4 outline-none ring-accent focus-visible:ring-2">Reset filters</button>}
                <button type="button" onClick={() => { setFiltersOpen(false); filtersToggleRef.current?.focus(); }} className="ml-auto min-h-10 rounded-full bg-foreground px-4 text-xs font-medium text-background outline-none ring-accent focus-visible:ring-2 sm:hidden">Done</button>
              </div>
            </div>
          </>}
        </div>
      </section>

      <section className="py-8 lg:py-10">
        <div className="mx-auto max-w-[1480px]">
          {primaryView === "companies" && companyView === "timeline" && (
            <div role="region" aria-label="Company financing timeline. Scroll horizontally for later years." tabIndex={0} className="isolate overflow-x-auto rounded-3xl border border-border bg-surface-raised outline-none ring-accent focus-visible:ring-2 shadow-[0_20px_60px_rgba(28,34,55,0.08)]">
              <div className="grid min-w-[1055px] grid-cols-[100px_minmax(700px,1fr)_110px] sm:min-w-[1120px] sm:grid-cols-[330px_minmax(655px,1fr)_110px] border-b border-border bg-nav px-5 py-3 text-xs font-bold text-muted">
                <div className="sticky left-0 z-30 -ml-5 bg-nav px-3 sm:px-5"><span className="hidden sm:inline">Company · click for detail</span><span className="sm:hidden">Company</span></div>
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
                <div className="text-right">Indexed financing</div>
              </div>
              <div className="min-w-[1055px] sm:min-w-[1120px]">
                {rows.map((row, rowIndex) => {
                  const milestones = data.milestones.filter((milestone) => milestone.companySlug === row.slug);
                  return (
                    <button
                      key={row.slug}
                      type="button"
                      onClick={() => setSelectedSlug(row.slug)}
                      className={`group grid w-full grid-cols-[100px_minmax(700px,1fr)_110px] sm:grid-cols-[330px_minmax(655px,1fr)_110px] items-center px-5 py-3.5 text-left transition hover:bg-nav/60 focus:bg-nav/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent ${rowIndex ? "border-t border-border" : ""}`}
                    >
                      <div data-funding-company-identity={row.slug} className="sticky left-0 z-30 -my-3.5 -ml-5 flex min-w-0 self-stretch items-center gap-3 bg-surface-raised px-3 py-3.5 group-hover:bg-nav group-focus:bg-nav sm:px-5">
                        <span className="hidden sm:block"><FirmLogo name={row.name} src={row.logo} size={38} /></span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold tracking-[-0.01em] sm:text-sm" title={row.name}>{row.name}</div>
                          <div className="mt-0.5 text-xs text-muted" data-founding-year={row.slug}>Founding year · <span className="font-medium tabular-nums text-foreground">{row.founding?.year ?? "Unknown"}</span></div>
                          <div className="mt-0.5 hidden truncate text-xs text-muted sm:block" title={`${row.modality} · ${row.latestStage}`}>{row.modality} · {row.latestStage}</div>
                        </div>
                      </div>
                      <div className="min-w-0">
                      <div className="relative h-14 border-x border-border">
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
                              className={`absolute z-10 h-5 rounded-full border shadow-sm ${round.capitalTreatment ? "border-dashed border-foreground bg-surface-raised" : "border-accent/20 bg-accent"}`}
                              style={{ left: `calc(${position}% - ${width / 2}px)`, top: `${4 + (index % 2) * 22}px`, width: `${width}px` }}
                              title={`${row.name} · ${round.stage} · ${round.displayAmount}${round.capitalTreatment ? ` · ${capitalExclusionLabel(round)}` : ""}`}
                            />
                          );
                        })}
                        {milestones.map((milestone, index) => (
                          <span
                            key={`${milestone.announcedOn}-${milestone.marker}`}
                            className="absolute z-20 -translate-x-1/2 cursor-help rounded bg-[#151821] px-1.5 py-0.5 text-xs font-bold text-white shadow-sm"
                            style={{ left: `${getTimelinePosition(milestone.announcedOn, data.summary.firstYear, data.summary.lastYear)}%`, top: `${29 - (index % 2) * 22}px` }}
                            onMouseEnter={(event) => { event.stopPropagation(); showMarkerTip(event, milestone.marker, milestone.indication); }}
                            onMouseLeave={() => setMarkerTip(null)}
                            aria-label={markerTitle(milestone.marker, milestone.indication)}
                          >
                            {milestone.marker}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-muted">
                        {row.rounds.map((round) => (
                          <span key={`${round.announcedOn}-${round.stage}`} data-financing-readout className="text-xs leading-relaxed">
                            {formatFundingRecordDate(round.announcedOn, round.datePrecision, round.dateBasis)} · {round.stage} · <span className="font-semibold tabular-nums text-foreground">{round.displayAmount}</span>
                            {round.capitalTreatment && <span className="block font-medium text-foreground">{capitalExclusionLabel(round)}</span>}
                          </span>
                        ))}
                      </div>
                      <ReportedTotalAnnotation total={data.reportedTotals?.find((total) => total.companySlug === row.slug)} />
                      </div>
                      <div className="pl-4 text-right">
                        <div className="text-sm font-semibold">{formatCapital(row.observedCapitalUsdM)}</div>
                        <div className="mt-0.5 text-xs text-muted">{row.rounds.length} financing {row.rounds.length === 1 ? "record" : "records"}</div>
                        {row.rounds.some((round) => round.capitalTreatment) && <div className="mt-1 text-xs font-medium">{row.rounds.filter((round) => round.capitalTreatment).length} {row.rounds.filter((round) => round.capitalTreatment).length === 1 ? "record" : "records"} excluded from total</div>}
                        {row.rounds.some((round) => round.sourceKind) && <div className="mt-1 text-xs text-muted">{[...new Set(row.rounds.flatMap((round) => round.sourceKind ? [sourceKindLabel(round.sourceKind)] : []))].join(" · ")}</div>}
                        {row.rounds.some((round) => round.reviewedOn) && <div className="mt-0.5 text-xs text-muted">{[...new Set(row.rounds.flatMap((round) => round.reviewedOn ? [sourceReviewLabel(round.reviewedOn)] : []))].join(" · ")}</div>}
                      </div>
                    </button>
                  );
                })}
                {rows.length === 0 && <div className="px-6 py-20 text-center text-sm text-muted">Try another company name or filter.</div>}
              </div>
              <div className="flex flex-wrap items-center gap-5 border-t border-border bg-nav/40 px-5 py-3 text-xs text-muted">
                <span><b className="mr-1.5 inline-block h-2.5 w-5 rounded-full bg-accent align-middle" />Financing (width scales with disclosed amount)</span>
                <span><b className="mr-1.5 inline-block h-2.5 w-5 rounded-full border border-dashed border-foreground align-middle" />Disclosed amount excluded from totals · reason shown per record</span>
                <span className="inline-flex items-center"><b className="mr-1.5 cursor-help rounded bg-[#151821] px-1 py-0.5 text-xs text-white" onMouseEnter={(event) => showMarkerTip(event, "IDE")} onMouseLeave={() => setMarkerTip(null)}>IDE</b>Regulatory marker</span>
                <span className="ml-auto">{rows.length} of {data.summary.selectedCompanies} companies</span>
              </div>
            </div>
          )}

          {primaryView === "companies" && companyView === "stage" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stageGroups.map((group) => (
                <article key={group.stage} className="min-w-0 rounded-3xl border border-border bg-surface-raised p-4 shadow-[0_12px_40px_rgba(28,34,55,0.06)] sm:p-6">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border pb-5">
                    <div>
                      <div className="text-xs font-bold text-muted">Latest indexed stage</div>
                      <h2 className="mt-1 text-base font-semibold tracking-[-0.01em]">{group.stage}</h2>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{formatCapital(group.capital)}</div>
                      <div className="text-xs text-muted">indexed financing</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {group.companies.map((row) => (
                      <button key={row.slug} type="button" onClick={() => setSelectedSlug(row.slug)} className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-nav focus:outline-none focus:ring-2 focus:ring-accent">
                        <FirmLogo name={row.name} src={row.logo} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3 text-xs font-semibold"><span className="truncate">{row.name}</span><span>{formatCapital(row.observedCapitalUsdM)}</span></div>
                          <div className="mt-1 text-xs text-muted" data-founding-year={row.slug}>Founding year · <span className="font-medium tabular-nums text-foreground">{row.founding?.year ?? "Unknown"}</span></div>
                          {row.rounds.some((round) => round.sourceKind || round.reviewedOn) && <div className="mt-1 text-xs text-muted">{[...new Set(row.rounds.flatMap((round) => [round.sourceKind ? sourceKindLabel(round.sourceKind) : "", round.reviewedOn ? sourceReviewLabel(round.reviewedOn) : ""].filter(Boolean)))].join(" · ")}</div>}
                          {row.rounds.some((round) => round.capitalTreatment) && <div className="mt-1 text-xs font-medium">{row.rounds.filter((round) => round.capitalTreatment).length} {row.rounds.filter((round) => round.capitalTreatment).length === 1 ? "record" : "records"} excluded from total</div>}
                          <ReportedTotalAnnotation total={data.reportedTotals?.find((total) => total.companySlug === row.slug)} />
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, (row.observedCapitalUsdM / Math.max(group.companies[0]?.observedCapitalUsdM ?? 1, 1)) * 100)}%` }} /></div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 border-t border-border pt-3 text-xs text-muted">Bars are scaled within this stage.</p>
                </article>
              ))}
            </div>
          )}

          {primaryView === "investors" && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="overflow-hidden rounded-3xl border border-border bg-surface-raised shadow-[0_20px_60px_rgba(28,34,55,0.08)]">
                <div className="border-b border-border px-6 py-5">
                  <h2 className="text-base font-semibold tracking-[-0.01em]">Most active indexed investors and funders</h2>
                  <p className="mt-1 text-sm text-muted">Ranked by appearances in the financing records below. Associated capital sums the full financing amounts for records naming each backer, including disclosed commitments and combined rounds.</p>
                </div>
                <div className="divide-y divide-black/[0.07]">
                  {data.investors.slice(0, 24).map((investor, index) => (
                    <div key={investor.name} data-indexed-investor={investor.name} className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-4 py-4 sm:grid-cols-[32px_minmax(0,1fr)_140px] sm:items-center sm:gap-x-4 sm:px-6">
                      <div className="text-xs font-semibold text-muted">{String(index + 1).padStart(2, "0")}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold [overflow-wrap:anywhere]">{investor.name}</div>
                        <div className="mt-2 flex flex-col items-start gap-1.5">
                          <div className="flex flex-wrap gap-1" aria-hidden="true">
                            {Array.from({ length: maxInvestorRounds }, (_, dot) => (
                              <span key={dot} className={`h-2 w-2 shrink-0 rounded-full ${dot < investor.roundCount ? "bg-accent" : "bg-border"}`} />
                            ))}
                          </div>
                          <span className="text-xs text-muted">{investor.roundCount} financing {investor.roundCount === 1 ? "record" : "records"} · {investor.companyCount} {investor.companyCount === 1 ? "company" : "companies"}</span>
                        </div>
                      </div>
                      <div className="col-start-2 min-w-0 sm:col-start-3 sm:row-start-1 sm:text-right">
                        <div className="text-xs text-muted">associated financing</div>
                        <div className="mt-0.5 text-xs font-semibold">{formatCapital(investor.associatedCapitalUsdM)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <aside className="self-start rounded-3xl bg-[#171a21] p-7 text-white lg:sticky lg:top-40">
                <div className="text-xs font-bold text-white/80">How to read this</div>
                <h3 className="mt-3 text-base font-semibold leading-snug tracking-[-0.01em]">Named participation in indexed financings.</h3>
                <p className="mt-4 text-sm leading-relaxed text-white/75">The leaderboard counts financing records that name each backer, including disclosed funding commitments.</p>
                <p className="mt-4 text-sm leading-relaxed text-white/75">Reviewed investor families group related names for counting. Company records retain the original investor names; legal identities follow the sources.</p>
                <div className="mt-7 border-t border-white/12 pt-5 text-xs leading-relaxed text-white/65">Participant lists reflect each announcement’s disclosures. Counts depend on how fully sources name backers.</div>
              </aside>
            </div>
          )}

          <div className="mt-10 grid gap-5 border-t border-border pt-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <div className="text-xs font-bold text-muted">Company criteria</div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{data.methodology.scope}</p>
            </div>
            <div>
              <div className="text-xs font-bold text-muted">Coverage</div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{data.methodology.coverage} Latest selective review {formatFundingDate(data.summary.asOf, "day")}. Financing histories remain partial, and the indexed sum is not an all-time total. Indexed totals cover the financing records shown.</p>
            </div>
          </div>
        </div>
      </section>

      {markerTip && (
        <div
          className="pointer-events-none fixed z-[80] w-64 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-3 py-2 text-left shadow-lg"
          style={{ left: markerTip.x, top: markerTip.y }}
        >
          <div className="text-xs font-semibold leading-snug text-background">{markerTip.title}</div>
          {markerTip.body && <div className="mt-0.5 text-xs leading-snug text-background/70">{markerTip.body}</div>}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close company detail" onClick={() => setSelectedSlug(null)} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
          <aside role="dialog" aria-modal="true" aria-labelledby="company-detail-title" className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto bg-surface shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-6 py-4 backdrop-blur">
              <span className="text-xs font-bold text-muted">Company detail</span>
              <button ref={closeRef} type="button" onClick={() => setSelectedSlug(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-lg text-white outline-none ring-accent focus:ring-2" aria-label="Close detail panel">×</button>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <FirmLogo name={selected.name} src={selected.logo} size={56} />
                <div>
                  <h2 id="company-detail-title" className="text-lg font-semibold tracking-[-0.045em]">{selected.name}</h2>
                  <p className="mt-1 text-sm text-muted">{selected.hq}</p>
                </div>
              </div>
              <div className="mt-7 flex flex-wrap gap-2">
                {[selected.scope, selected.modality, selected.interfaceDepth].filter(Boolean).map((item) => <span key={item} className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold">{item}</span>)}
              </div>
              <div className="mt-6 rounded-2xl bg-[#11131a] p-6 text-white">
                <div className="text-xs font-bold text-white/70">{selectedReportedTotal ? "Company-reported total" : "Indexed financing"}</div>
                <div className="mt-1 text-4xl font-semibold tracking-[-0.05em]">{formatCapital(selectedReportedTotal?.amountUsdM ?? selected.observedCapitalUsdM)}{selectedReportedTotalFootnote && <sup className="ml-0.5 align-super text-lg" aria-label="See possible-overlap note">*</sup>}</div>
                {selectedReportedTotal && <div className="mt-3 space-y-2 text-sm text-white/85">
                  <p className="font-semibold">{selectedReportedTotal.scope}</p>
                  {selectedReportedTotalFootnote && <p data-reported-total-footnote className="text-xs leading-relaxed">* {selectedReportedTotalFootnote}</p>}
                  <p className="text-xs">Public company self-report · Reported <time dateTime={selectedReportedTotal.reportedOn}>{formatFundingDate(selectedReportedTotal.reportedOn, "day")}</time></p>
                  <a href={selectedReportedTotal.sourceUrl} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold underline underline-offset-4">Company-reported total source ↗</a>
                  <div data-indexed-financing-summary className="border-t border-white/20 pt-3">
                    <p className="font-semibold">Indexed financing · <span className="text-xl tabular-nums">{formatCapital(selected.observedCapitalUsdM)}</span></p>
                    {selected.rounds.some((round) => round.capitalTreatment) && <p className="mt-2 text-xs leading-relaxed text-white/70">{selected.rounds.filter((round) => round.capitalTreatment).length} financing {selected.rounds.filter((round) => round.capitalTreatment).length === 1 ? "record" : "records"} excluded from indexed financing.</p>}
                  </div>
                </div>}
                <p className="mt-3 text-sm text-white/75">{selected.indication}</p>
                {!selectedReportedTotal && <>
                  <p className="mt-2 text-xs leading-relaxed text-white/65">Sum of indexed financing amounts, including labeled commitments.</p>
                  {selected.rounds.some((round) => round.capitalTreatment) && <p className="mt-2 text-xs font-medium text-white">{selected.rounds.filter((round) => round.capitalTreatment).length} {selected.rounds.filter((round) => round.capitalTreatment).length === 1 ? "record" : "records"} excluded from total.</p>}
                </>}
              </div>
              {selectedReportedTotal && <details className="mt-3 rounded-xl border border-border p-3 text-xs leading-relaxed text-muted">
                <summary className="cursor-pointer font-semibold text-foreground">Source notes</summary>
                <p className="mt-2">{selectedReportedTotal.note}</p>
              </details>}

              <section className="mt-8 rounded-2xl border border-border bg-surface-raised p-4">
                <h3 className="text-sm font-bold text-muted">Founding year</h3>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{selected.founding?.year ?? "Unknown"}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{selected.founding?.note ?? "Founding year: unknown."}</p>
                {selected.founding?.reviewedOn && <p className="mt-3 text-xs text-muted">{selected.founding.sourceKind ? `${sourceKindLabel(selected.founding.sourceKind)} · ` : ""}{sourceReviewLabel(selected.founding.reviewedOn)}</p>}
                {selected.founding?.sourceUrl && <a href={selected.founding.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-accent underline decoration-accent/35 underline-offset-4 hover:decoration-accent">Founding source ↗</a>}
              </section>

              <section className="mt-8">
                <h3 className="text-sm font-bold text-muted">Financing history</h3>
                <div className="mt-3 space-y-3">
                  {[...selected.rounds].reverse().map((round) => (
                    <article key={`${round.announcedOn}-${round.stage}`} className="rounded-2xl border border-border bg-surface-raised p-4">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0 [overflow-wrap:anywhere]"><div className="text-sm font-semibold">{round.stage}</div><div className="mt-1 text-xs text-muted">{formatFundingRecordDate(round.announcedOn, round.datePrecision, round.dateBasis)}</div></div>
                        <div className="shrink-0 text-lg font-semibold tabular-nums text-accent">{round.displayAmount}</div>
                      </div>
                      {round.capitalTreatment && <p className="mt-3 text-xs font-semibold">{capitalExclusionLabel(round)}</p>}
                      {round.sourceKind && <p className="mt-3 text-xs font-semibold">{sourceKindLabel(round.sourceKind)}{round.reviewedOn ? ` · ${sourceReviewLabel(round.reviewedOn)}` : ""}</p>}
                      {round.investors && round.investors.length > 0 && <p className="mt-3 text-xs leading-relaxed text-muted">{round.investors.join(" · ")}</p>}
                      {round.fx && <p className="mt-2 text-xs leading-relaxed text-muted">{formatFundingFxBasis(round.fx)} · {round.fx.nativePerUsd} {round.fx.currency}/USD · <a href={round.fx.rateSourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">Exchange-rate source</a></p>}
                      {round.note && <p className="mt-2 text-xs leading-relaxed text-muted [overflow-wrap:anywhere]">{round.note}</p>}
                      {round.sourceUrl && <a href={round.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-accent underline decoration-accent/35 underline-offset-4 hover:decoration-accent">Source ↗</a>}
                      {round.investorEvidence?.map((evidence) => <div key={`${evidence.investorName}-${evidence.sourceUrl}`} className="mt-2">
                        <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent underline decoration-accent/35 underline-offset-4 hover:decoration-accent">{evidence.investorName} participation source ↗</a>
                      </div>)}
                    </article>
                  ))}
                </div>
              </section>

              {selectedMilestones.length > 0 && (
                <section className="mt-8">
                  <h3 className="text-sm font-bold text-muted">Regulatory markers</h3>
                  <div className="mt-3 space-y-3">
                    {selectedMilestones.map((milestone) => (
                      <article key={`${milestone.announcedOn}-${milestone.marker}`} className="rounded-2xl border border-border bg-positive-soft p-4">
                        <div className="flex items-center justify-between gap-3"><span className="cursor-help rounded bg-[#11131a] px-2 py-1 text-xs font-bold text-white" onMouseEnter={(event) => showMarkerTip(event, milestone.marker, milestone.indication)} onMouseLeave={() => setMarkerTip(null)} aria-label={markerTitle(milestone.marker, milestone.indication)}>{milestone.marker}</span><span className="text-xs text-muted">{formatFundingRecordDate(milestone.announcedOn, milestone.datePrecision, milestone.dateBasis)}</span></div>
                        <p className="mt-3 text-sm font-medium">{milestone.indication}</p>
                        {milestone.note && <p className="mt-1.5 text-xs leading-relaxed text-muted">{milestone.note}</p>}
                        <a href={milestone.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold underline decoration-black/20 underline-offset-4">Source ↗</a>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {selected.website && <a href={selected.website} target="_blank" rel="noreferrer" className="mt-8 flex w-full items-center justify-between rounded-2xl border border-border bg-surface-raised px-5 py-4 text-sm font-semibold hover:border-black/25"><span>{selected.websiteLabel || "Visit company website"}</span><span>↗</span></a>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
