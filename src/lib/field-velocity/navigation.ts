"use client";

import { useSyncExternalStore } from "react";

export const performanceAnchors = ["performance_curves", "simultaneously-recorded-neurons", "tissue-mapped", "neural-recording-hours", "idea_vintage", "latency_compression", "expectations", "draft-charts"] as const;
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
  if (!(performanceAnchors as readonly string[]).includes(anchor)) throw new Error("Unknown performance anchor");
  const url = new URL(currentUrl);
  url.hash = anchor;
  return url.href;
}

export function navigatePerformance(anchor: string) {
  const url = performanceUrl(window.location.href, anchor);
  if (url === window.location.href) return;
  const isChart = !["performance_curves", "expectations", "draft-charts"].includes(anchor);
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
