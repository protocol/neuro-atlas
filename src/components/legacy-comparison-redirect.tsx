"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { atlasBasePath, atlasPath } from "@/lib/atlas-path";
import { legacyComparisonDestination } from "@/lib/field-velocity/legacy-comparison";

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("hashchange", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("hashchange", callback);
  };
}

/** Retired comparison addresses remain a recovery path, not a chart composer. */
export function LegacyComparisonRedirect() {
  const router = useRouter();
  const current = useSyncExternalStore(subscribe, () => window.location.href, () => "");
  const target = current ? legacyComparisonDestination(current) : null;
  const translated = useRef("");
  useEffect(() => {
    if (!target || translated.current === current) return;
    translated.current = current;
    router.replace(target.slice(atlasBasePath.length));
  }, [current, target, router]);
  return <a className="graph-back" href={target ?? atlasPath("/field-velocity")}>
    {target?.startsWith(atlasPath("/field-velocity/")) ? "Open chart" : "Back to Field velocity"}
  </a>;
}
