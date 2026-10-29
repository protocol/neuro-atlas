"use client";

import { useState } from "react";
import { canonicalMetricAnchor } from "@/data/draft-chart-links";
import { navigatePerformance, performanceUrl } from "@/lib/field-velocity/navigation";

export function DraftChartShare({ anchor: legacyAnchor, label, card = false }: { anchor: string; label: string; card?: boolean }) {
  const anchor = canonicalMetricAnchor(legacyAnchor);
  const [status, setStatus] = useState("");
  return <div className="draft-chart-share">
    <a href={`#${anchor}`} aria-label={`Direct ${card ? "card " : ""}link to ${label}`} onClick={event => {
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        navigatePerformance(anchor);
      }
    }}>{card ? "Card link" : "Direct link"}</a>
    <button type="button" data-copy-draft-link={anchor} aria-label={`Copy ${card ? "card " : ""}link to ${label}`} onClick={async () => {
      try {
        await navigator.clipboard.writeText(performanceUrl(window.location.href, anchor));
        setStatus("Copied");
      } catch {
        setStatus("Copy failed — use Direct link");
      }
    }}>{card ? "Copy card link" : "Copy link"}</button>
    <span role="status">{status}</span>
  </div>;
}
