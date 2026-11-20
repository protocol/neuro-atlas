"use client";

import { useSyncExternalStore } from "react";
import { chartToggle, chartToggleEnabled, acquisitionMetricFromUrl, acquisitionMetricQuery, type AcquisitionMetricSelection } from "@/lib/chart-toggle-url";
import { fieldVelocityLink, canonicalPerformanceAnchor, performanceTarget } from "@/data/field-velocity-links";

export const performanceAnchors = ["performance_curves", "simultaneously-recorded-neurons", "tissue-mapped", "neural-recording-hours", "idea_vintage", "latency_compression", "expectations", "draft-charts", "google-trends-neurotech", "google-trends-neuralink", "revealed_commitments", "publication-output", "publication-growth", "researcher-sectors", "researcher-sector-changes"] as const;
const changedEvent = "atlas-performance-location";
let performanceFocusReturn: HTMLElement | null = null;

/** Keep a cross-tab trigger alive until the modal has restored its originating pane. */
export function setPerformanceFocusReturn(target: HTMLElement | null) {
  performanceFocusReturn = target;
}

export function takePerformanceFocusReturn() {
  const target = performanceFocusReturn?.isConnected ? performanceFocusReturn : null;
  performanceFocusReturn = null;
  return target;
}

/** Relative to the actual current origin/path/query; never hardcode a deployment. */
export function performanceUrl(currentUrl: string, anchor: string) {
  if (!fieldVelocityLink(anchor)) throw new Error("Unknown performance anchor");
  const url = new URL(currentUrl);
  // A toggle belongs to this exact chart, not the next fragment we navigate to.
  const toggle = chartToggle(anchor);
  for (const query of ["brainScale", "extrapolation"]) {
    if (query !== toggle?.query || !chartToggleEnabled(url, anchor)) url.searchParams.delete(query);
  }
  if (acquisitionMetricFromUrl(url, anchor) === "human-brain") url.searchParams.delete(acquisitionMetricQuery);
  url.hash = canonicalPerformanceAnchor(anchor);
  return url.href;
}

/** Set just the acquisition view; the default and invalid runtime values carry no token. */
export function acquisitionMetricUrl(currentUrl: string, anchor: string, metric: AcquisitionMetricSelection) {
  const url = new URL(performanceUrl(currentUrl, anchor));
  if (performanceTarget(anchor) === "metric-panel-acquisition-economics"
    && (metric === "voxels-per-dollar" || metric === "dollars-per-voxel")) url.searchParams.set(acquisitionMetricQuery, metric);
  else url.searchParams.delete(acquisitionMetricQuery);
  return url.href;
}

/** Only mounted curated panels opt into modal behavior; retired targets stay inline.
 * Metadata works even while the owning category is hidden, before it reveals.
 */
function isCuratedPopupTarget(anchor: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-draft-popout], [data-performance-card], [data-trends-card]")).some(panel =>
    [panel.dataset.performanceCard, panel.dataset.draftPopout, ...(panel.dataset.draftPopoutAliases?.split(" ") ?? []), ...(panel.dataset.trendsCard ? [`google-trends-${panel.dataset.trendsCard}`] : [])]
      .some(id => id && canonicalPerformanceAnchor(id) === canonicalPerformanceAnchor(anchor)));
}

/** Wait for the revealed pane and its responsive plots to finish layout before scrolling.
 * Only exact inline metric targets scroll; existing modal locations retain their behavior.
 */
export function revealDraftTarget(anchor: string) {
  if (isCuratedPopupTarget(anchor)) return;
  const link = fieldVelocityLink(anchor);
  if (!link || link.kind === "tab") return;
  const target = document.getElementById(performanceTarget(anchor)) ?? (link.fallback ? document.getElementById(link.fallback) : null);
  if (!target || target.closest("[hidden]")) return;
  const gap = target.closest("[data-draft-chart-card]")?.querySelector<HTMLDetailsElement>("[data-draft-gap-details]");
  if (gap) gap.open = true;
  let frame = window.requestAnimationFrame(() => {
    frame = window.requestAnimationFrame(() => {
      if (snapshot() === `#${canonicalPerformanceAnchor(anchor)}` && target.isConnected && !target.closest("[hidden]")) {
        if (anchor === "neural-recording-hours" || anchor === "tissue-mapped") {
          const heading = target.closest("article")?.querySelector("h4");
          if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
        }
        target.scrollIntoView({ block: "start", behavior: "instant" });
      }
    });
  });
  return () => window.cancelAnimationFrame(frame);
}

export function navigatePerformance(anchor: string) {
  canonicalizePerformanceLocation();
  const url = performanceUrl(window.location.href, anchor);
  if (url === window.location.href) {
    window.dispatchEvent(new Event("atlas-metric-reveal"));
    revealDraftTarget(anchor);
    return;
  }
  const link = fieldVelocityLink(anchor)!; // performanceUrl already validated it.
  const isChart = link.kind === "chart" && (!link.fallback || isCuratedPopupTarget(anchor));
  window.history.pushState({ ...window.history.state, atlasModalFrom: isChart ? window.location.href : null }, "", url);
  window.dispatchEvent(new Event(changedEvent));
}

export function closePerformance() {
  if (window.history.state?.atlasModalFrom) window.history.back();
  else {
    window.history.replaceState(window.history.state, "", performanceUrl(window.location.href, "performance_curves"));
    window.dispatchEvent(new Event(changedEvent));
  }
}

let subscriptions = 0;
let previousRestoration: ScrollRestoration;
function subscribe(callback: () => void) {
  if (subscriptions++ === 0) {
    previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
  }
  const changed = () => { canonicalizePerformanceLocation(); callback(); };
  window.addEventListener("hashchange", changed);
  window.addEventListener("popstate", changed);
  window.addEventListener(changedEvent, changed);
  // Side effects belong in subscription/notification, never the React snapshot read.
  canonicalizePerformanceLocation();
  return () => {
    if (--subscriptions === 0) window.history.scrollRestoration = previousRestoration;
    window.removeEventListener("hashchange", changed);
    window.removeEventListener("popstate", changed);
    window.removeEventListener(changedEvent, changed);
  };
}
function canonicalizePerformanceLocation() {
  const anchor = window.location.hash.slice(1);
  const link = fieldVelocityLink(anchor);
  const url = new URL(window.location.href);
  const clearMetric = url.searchParams.has(acquisitionMetricQuery) && acquisitionMetricFromUrl(url, anchor) === "human-brain";
  if (link && (anchor !== link.slug || clearMetric)) {
    window.history.replaceState(window.history.state, "", performanceUrl(window.location.href, anchor));
  }
}
const snapshot = () => {
  const hash = window.location.hash;
  return hash ? `#${canonicalPerformanceAnchor(hash.slice(1))}` : "";
};
const serverSnapshot = () => "";
export function usePerformanceHash() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/** View changes are history entries, like recordingView. Clearing only the
 * modal-origin marker lets Close/Escape dismiss in one action after any change. */
export function useChartToggle(anchor?: string) {
  const enabled = useSyncExternalStore(subscribe,
    () => !!anchor && chartToggleEnabled(new URL(window.location.href), anchor), () => false);
  const setEnabled = (update: (current: boolean) => boolean) => {
    const toggle = anchor ? chartToggle(anchor) : undefined;
    if (!toggle || !anchor) return;
    const url = new URL(performanceUrl(window.location.href, anchor));
    if (update(chartToggleEnabled(url, anchor))) url.searchParams.set(toggle.query, toggle.value);
    else url.searchParams.delete(toggle.query);
    window.history.pushState({ ...window.history.state, atlasModalFrom: null }, "", url);
    window.dispatchEvent(new Event(changedEvent));
  };
  return [enabled, setEnabled] as const;
}

/** Acquisition units share the existing location subscription/history contract. */
export function useAcquisitionMetric(anchor?: string) {
  const metric = useSyncExternalStore(subscribe,
    () => anchor ? acquisitionMetricFromUrl(new URL(window.location.href), anchor) : "human-brain", () => "human-brain" as const);
  const setMetric = (next: AcquisitionMetricSelection) => {
    if (!anchor || performanceTarget(anchor) !== "metric-panel-acquisition-economics") return;
    const url = acquisitionMetricUrl(window.location.href, anchor, next);
    if (url === window.location.href) return;
    window.history.pushState({ ...window.history.state, atlasModalFrom: null }, "", url);
    window.dispatchEvent(new Event(changedEvent));
  };
  return [metric, setMetric] as const;
}
