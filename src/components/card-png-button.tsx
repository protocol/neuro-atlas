"use client";

import { useEffect, useRef, useState } from "react";
import { buildChartImage, copyDeferredChartImage } from "@/lib/chart-export";
import { withCardExport } from "@/lib/field-velocity/card-export";

/** Copy the same branded PNG as the pop-out's Copy chart, straight from a rail card. */
export function CardPngButton({ anchor, title, disabled = false }: { anchor: string; title: string; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const settle = (next: "done" | "failed") => {
    setState(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2400);
  };
  const label = state === "busy" ? "Copying…" : state === "done" ? "Copied" : state === "failed" ? "Open to copy" : "Copy PNG";
  return <span className="card-png">
    <button type="button" data-copy-card-png={anchor} aria-label={`Copy PNG: ${title}`} disabled={disabled || state === "busy"} onClick={() => {
      setState("busy");
      const image = withCardExport(anchor, getChart => buildChartImage(getChart(), window.location.href));
      copyDeferredChartImage(image).then(() => settle("done"), () => settle("failed"));
    }}>{label}</button>
    <span role="status" aria-live="polite" className="sr-only">{state === "done" ? "Chart PNG copied." : state === "failed" ? "PNG copy unavailable here. Open the chart to copy or download it." : ""}</span>
  </span>;
}
