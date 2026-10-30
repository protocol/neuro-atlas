"use client";

import { useSyncExternalStore } from "react";
import { isDraftAnchor } from "@/data/draft-chart-links";

export const performanceAnchors = ["performance_curves", "simultaneously-recorded-neurons", "tissue-mapped", "neural-recording-hours", "idea_vintage", "latency_compression", "expectations", "draft-charts", "google-trends-neurotech", "google-trends-neuralink", "revealed_commitments"] as const;
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
  if (!(performanceAnchors as readonly string[]).includes(anchor) && !isDraftAnchor(anchor)) throw new Error("Unknown performance anchor");
  const url = new URL(currentUrl);
  url.hash = anchor;
  return url.href;
}

/** Only mounted curated panels opt into modal behavior; retired targets stay inline.
 * Metadata works even while the owning category is hidden, before it reveals.
 */
function isCuratedPopupTarget(anchor: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-draft-popout]")).some(panel =>
    panel.dataset.draftPopout === anchor || panel.dataset.draftPopoutAliases?.split(" ").includes(anchor));
}

/** Wait for the revealed pane and its responsive plots to finish layout before scrolling.
 * Only exact inline metric targets scroll; existing modal locations retain their behavior.
 */
export function revealDraftTarget(anchor: string) {
  if (isCuratedPopupTarget(anchor)) return;
  if (anchor === "draft-charts" || (!isDraftAnchor(anchor) && !["revealed_commitments", "neural-recording-hours", "tissue-mapped"].includes(anchor))) return;
  const target = document.getElementById(anchor);
  if (!target || target.closest("[hidden]")) return;
  const gap = target.closest("[data-draft-chart-card]")?.querySelector<HTMLDetailsElement>("[data-draft-gap-details]");
  if (gap) gap.open = true;
  let frame = window.requestAnimationFrame(() => {
    frame = window.requestAnimationFrame(() => {
      if (window.location.hash === `#${anchor}` && target.isConnected && !target.closest("[hidden]")) {
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
  const url = performanceUrl(window.location.href, anchor);
  if (url === window.location.href) {
    window.dispatchEvent(new Event("atlas-metric-reveal"));
    revealDraftTarget(anchor);
    return;
  }
  const inlineAlias = ["neural-recording-hours", "tissue-mapped"].includes(anchor)
    && !!document.getElementById(anchor)?.closest("[data-draft-chart-card]");
  const isChart = isCuratedPopupTarget(anchor) || (!isDraftAnchor(anchor) && !inlineAlias && !["performance_curves", "expectations", "revealed_commitments"].includes(anchor));
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
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  window.addEventListener(changedEvent, callback);
  return () => {
    if (--subscriptions === 0) window.history.scrollRestoration = previousRestoration;
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
    window.removeEventListener(changedEvent, callback);
  };
}
const snapshot = () => window.location.hash;
const serverSnapshot = () => "";
export function usePerformanceHash() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
