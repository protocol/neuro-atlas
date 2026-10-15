"use client";

import { useSyncExternalStore } from "react";
import { isDraftAnchor } from "@/data/draft-chart-links";

export const performanceAnchors = ["performance_curves", "simultaneously-recorded-neurons", "tissue-mapped", "neural-recording-hours", "idea_vintage", "latency_compression", "expectations", "draft-charts", "google-trends-neurotech", "google-trends-neuralink"] as const;
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

/** Wait for the revealed pane and its responsive plots to finish layout before scrolling.
 * Only exact Draft targets scroll; section and existing modal locations retain their behavior.
 */
export function revealDraftTarget(anchor: string) {
  if (anchor === "draft-charts" || !isDraftAnchor(anchor)) return;
  const target = document.getElementById(anchor);
  if (!target || target.closest("[hidden]")) return;
  const gap = target.querySelector<HTMLDetailsElement>("[data-draft-gap-details]");
  if (gap) gap.open = true;
  let frame = window.requestAnimationFrame(() => {
    frame = window.requestAnimationFrame(() => {
      if (window.location.hash === `#${anchor}` && target.isConnected && !target.closest("[hidden]")) {
        target.scrollIntoView({ block: "start", behavior: "instant" });
      }
    });
  });
  return () => window.cancelAnimationFrame(frame);
}

export function navigatePerformance(anchor: string) {
  const url = performanceUrl(window.location.href, anchor);
  if (url === window.location.href) {
    revealDraftTarget(anchor);
    return;
  }
  const isChart = !isDraftAnchor(anchor) && !["performance_curves", "expectations"].includes(anchor);
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
