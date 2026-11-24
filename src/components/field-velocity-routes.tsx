"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { captureOverviewDeparture } from "@/lib/field-velocity/overview-return";
import { nativeOverviewPath } from "@/lib/field-velocity/graph-navigation";
import { FieldVelocityRouteContext } from "@/components/field-velocity-route-context";

export const fieldLocationEvents = ["popstate", "hashchange", "atlas-performance-location"];
function subscribe(callback: () => void) {
  for (const event of fieldLocationEvents) window.addEventListener(event, callback);
  return () => { for (const event of fieldLocationEvents) window.removeEventListener(event, callback); };
}

export function FieldVelocityRoutes({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(subscribe, () => window.location.href, () => "");
  // Overview fragments belong to in-place exploration, not page redirects.
  return <FieldVelocityRouteContext.Provider value={current}>
    <div data-field-velocity-routes onClickCapture={event => {
      if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || window.location.pathname !== nativeOverviewPath) return;
      const link = (event.target as Element).closest?.<HTMLAnchorElement>("a[data-graph-link]");
      if (link?.dataset.graphLink) captureOverviewDeparture(window, link.pathname + link.search + link.hash, link.dataset.graphLink);
    }}>{children}</div>
  </FieldVelocityRouteContext.Provider>;
}
