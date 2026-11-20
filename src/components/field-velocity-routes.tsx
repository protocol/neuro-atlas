"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { captureOverviewDeparture } from "@/lib/field-velocity/overview-return";
import { atlasBasePath } from "@/lib/atlas-path";
import { legacyGraphDestination, nativeOverviewPath } from "@/lib/field-velocity/graph-navigation";
import { FieldVelocityRouteContext } from "@/components/field-velocity-route-context";

export const fieldLocationEvents = ["popstate", "hashchange", "atlas-performance-location"];
function subscribe(callback: () => void) {
  for (const event of fieldLocationEvents) window.addEventListener(event, callback);
  return () => { for (const event of fieldLocationEvents) window.removeEventListener(event, callback); };
}

export function FieldVelocityRoutes({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSyncExternalStore(subscribe, () => window.location.href, () => "");
  const translated = useRef("");
  useEffect(() => {
    // Read from the browser after hydration: an HTTP request never sees a fragment.
    const legacy = window.location.href;
    const target = legacyGraphDestination(legacy);
    if (!target) { translated.current = ""; return; }
    if (translated.current === legacy) return;
    translated.current = legacy;
    router.replace(target.slice(atlasBasePath.length));
  }, [current, pathname, router]);
  return <FieldVelocityRouteContext.Provider value={current}>
    <div data-field-velocity-routes onClickCapture={event => {
      if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || window.location.pathname !== nativeOverviewPath) return;
      const link = (event.target as Element).closest?.<HTMLAnchorElement>("a[data-graph-link]");
      if (link?.dataset.graphLink) captureOverviewDeparture(window, link.pathname + link.search + link.hash, link.dataset.graphLink);
    }}>{children}</div>
  </FieldVelocityRouteContext.Provider>;
}
