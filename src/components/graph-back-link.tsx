"use client";
import { useEffect, useSyncExternalStore } from "react";
import { claimGraphOrigin, graphOrigin, prepareOverviewReturn } from "@/lib/field-velocity/overview-return";

const ready = "atlas-graph-origin-ready";
function subscribe(callback: () => void) {
  window.addEventListener(ready, callback);
  return () => window.removeEventListener(ready, callback);
}
export function GraphBackLink({ fallback }: { fallback: string }) {
  useEffect(() => {
    claimGraphOrigin(window);
    window.dispatchEvent(new Event(ready));
  }, []);
  const href = useSyncExternalStore(subscribe, () => graphOrigin(window)?.href ?? fallback, () => fallback);
  return <a data-graph-back className="graph-back" href={href} onClick={event => {
    if (!event.button && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) prepareOverviewReturn(window);
  }}><span aria-hidden="true">← </span>Field velocity</a>;
}
