"use client";

import { useLayoutEffect } from "react";
import { canonicalPerformanceAnchor, performanceTarget } from "@/data/field-velocity-links";
import { navigatePerformance, usePerformanceHash } from "@/lib/field-velocity/navigation";
import MARKETS from "@/data/velocity/neurotech_market_signals.json";
import INFLECTIONS from "@/data/velocity/neurotech_inflection_points.json";
import { RELATED_MEASUREMENTS } from "@/data/related-measurements";
import { INFLECTION_COPY } from "@/data/inflection-copy";

const PLATFORM_LABEL: Record<string, string> = {
  kalshi: "Kalshi",
  polymarket: "Polymarket",
  metaculus: "Metaculus",
};

export function ExpectationsSection() {
  const hash = usePerformanceHash();
  useLayoutEffect(() => {
    const anchor = window.history.state?.atlasRelatedMeasurement;
    if (!Object.values(RELATED_MEASUREMENTS).flat().some(measurement => measurement.anchor === anchor)) return;
    const link = document.querySelector<HTMLAnchorElement>(`[data-related-measurement="${anchor}"]`);
    if (!link || (hash !== "#inflection-points" && hash !== `#${canonicalPerformanceAnchor(anchor)}`)) return;
    let attempts = 0;
    let frame: number;
    const focus = () => {
      // The chart dialog owns entry focus; never move it back into its inert background.
      if (hash !== "#inflection-points" && document.querySelector("dialog[open]")) return;
      const target = hash === "#inflection-points" ? link : document.getElementById(performanceTarget(hash.slice(1)));
      if (!target || target.closest("[hidden]")) {
        if (++attempts < 30) frame = requestAnimationFrame(focus);
        return;
      }
      const destination = target === link ? link : target.closest("article")?.querySelector<HTMLElement>("h4");
      if (!destination) return;
      if (destination !== link) destination.tabIndex = -1;
      destination.focus({ preventScroll: true });
      if (destination === link) link.scrollIntoView({ block: "nearest", behavior: "instant" });
    };
    frame = requestAnimationFrame(focus);
    return () => cancelAnimationFrame(frame);
  }, [hash]);
  return <section className="inflection-index" aria-label="Inflection points and related measurements">
    <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted">
      Inflection signals describe observable milestones; related measurements track supporting capabilities and adoption.
    </p>
    <div className="flex flex-col gap-4">
      {INFLECTIONS.points.map((point, index) => {
        const market = MARKETS.mappings.find(mapping => mapping.title === point.title);
        const primary = market?.match === "proxy" ? market.primary : undefined;
        const fallback = market && "fallback" in market ? market.fallback : undefined;
        return <article key={point.title} data-inflection={point.title} aria-labelledby={`inflection-${index}-title`} className="rounded-xl border border-border px-4 py-5 sm:px-6">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-8">
            <div className="min-w-0">
              <h3 id={`inflection-${index}-title`} className="text-base font-semibold tracking-tight">{point.title}</h3>
              <p data-inflection-signal className="mt-2 text-sm leading-relaxed text-muted">{INFLECTION_COPY[point.title]?.signal ?? point.signal}</p>
              {primary && <details data-related-forecasts className="mt-4 text-xs text-muted">
                <summary className="w-fit cursor-pointer rounded-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">Related forecasts</summary>
                <p className="mt-2 leading-relaxed">{INFLECTION_COPY[point.title]?.forecastScope ?? "External forecasts address related proxy questions."}</p>
                <a href={primary.url} target="_blank" rel="noreferrer" className="mt-2 block rounded-sm leading-relaxed text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
                  {PLATFORM_LABEL[primary.platform] ?? primary.platform}: “{primary.question}” ↗
                </a>
                {fallback && <a href={fallback.url} target="_blank" rel="noreferrer" className="mt-2 block rounded-sm leading-relaxed text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
                  {PLATFORM_LABEL[fallback.platform] ?? fallback.platform}: “{fallback.question}” ↗
                </a>}
              </details>}
            </div>
            <div data-related-measurements className="min-w-0 border-t border-border pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Related measurements</h4>
              <ul className="mt-3 space-y-4">
                {RELATED_MEASUREMENTS[point.title]?.map(measurement => <li key={measurement.anchor}>
                  <p data-measurement-relationship>{measurement.relationship}</p>
                  <a data-related-measurement={measurement.anchor} href={`#${canonicalPerformanceAnchor(measurement.anchor)}`} onClick={event => {
                    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                      event.preventDefault();
                      // Bind return focus to this history entry, not the latest clicked link.
                      window.history.replaceState({ ...window.history.state, atlasRelatedMeasurement: measurement.anchor }, "", window.location.href);
                      navigatePerformance(measurement.anchor);
                    }
                  }} className="inline-block rounded-sm text-sm font-semibold leading-relaxed text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
                    {measurement.label} <span aria-hidden="true">→</span>
                  </a>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{measurement.scope}</p>
                </li>)}
              </ul>
            </div>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
