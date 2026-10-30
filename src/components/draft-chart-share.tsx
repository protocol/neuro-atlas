"use client";

import { useState } from "react";
import { canonicalMetricAnchor } from "@/data/draft-chart-links";
import { navigatePerformance, performanceUrl } from "@/lib/field-velocity/navigation";

export function DraftChartShare({ anchor: legacyAnchor, label, card = false, className = "draft-chart-share" }: { anchor: string; label: string; card?: boolean; className?: string }) {
  const anchor = canonicalMetricAnchor(legacyAnchor);
  const [status, setStatus] = useState("");
  const [fallback, setFallback] = useState("");
  return <div className={className}>
    <button type="button" data-copy-draft-link={anchor} aria-label={`Copy ${card ? "card " : ""}link to ${label}`} onClick={async () => {
      const url = performanceUrl(window.location.href, anchor);
      try {
        await navigator.clipboard.writeText(url);
        setFallback("");
        setStatus("Copied");
      } catch {
        setFallback(url);
        setStatus("Copy failed — select the chart URL below");
      }
    }}>Copy link</button>
    <span role="status">{status}</span>
    {fallback && <div className="chart-link-fallback">
      <input readOnly value={fallback} aria-label={`Chart URL for ${label}`} onFocus={event => event.currentTarget.select()} />
      <a href={fallback} onClick={event => {
        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          navigatePerformance(anchor);
        }
      }}>Open chart link</a>
    </div>}
  </div>;
}
