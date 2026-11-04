"use client";

import { useState } from "react";
import { canonicalMetricAnchor } from "@/data/draft-chart-links";
import { navigatePerformance, performanceUrl } from "@/lib/field-velocity/navigation";

export function DraftChartShare({ anchor: legacyAnchor, label, card = false, className = "draft-chart-share" }: { anchor: string; label: string; card?: boolean; className?: string }) {
  const anchor = canonicalMetricAnchor(legacyAnchor);
  // Clipboard feedback belongs to the exact URL that was attempted. A view
  // change must not relabel an old fallback or a late clipboard result.
  const [result, setResult] = useState({ url: "", status: "", fallback: "" });
  const isCurrent = !!result.url && typeof window !== "undefined" && result.url === performanceUrl(window.location.href, anchor);
  const { status, fallback } = isCurrent ? result : { status: "", fallback: "" };
  return <div className={className}>
    <button type="button" data-copy-draft-link={anchor} aria-label={`Copy ${card ? "card " : ""}link to ${label}`} onClick={async () => {
      const url = performanceUrl(window.location.href, anchor);
      try {
        await navigator.clipboard.writeText(url);
        setResult({ url, fallback: "", status: "Copied" });
      } catch {
        setResult({ url, fallback: url, status: "Copy failed — select the chart URL below" });
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
