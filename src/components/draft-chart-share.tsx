"use client";

import { useState } from "react";
import { canonicalMetricAnchor } from "@/data/draft-chart-links";
import { navigatePerformance, performanceUrl } from "@/lib/field-velocity/navigation";

export function DraftChartShare({ anchor: legacyAnchor, label }: { anchor: string; label: string }) {
  const anchor = canonicalMetricAnchor(legacyAnchor);
  const [status, setStatus] = useState("");
  return <div className="draft-chart-share">
    <a href={`#${anchor}`} aria-label={`Direct link to ${label}`} onClick={event => {
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        navigatePerformance(anchor);
      }
    }}>Direct link</a>
    <button type="button" data-copy-draft-link={anchor} aria-label={`Copy link to ${label}`} onClick={async () => {
      try {
        await navigator.clipboard.writeText(performanceUrl(window.location.href, anchor));
        setStatus("Copied");
      } catch {
        setStatus("Copy failed — use Direct link");
      }
    }}>Copy link</button>
    <span role="status">{status}</span>
  </div>;
}
