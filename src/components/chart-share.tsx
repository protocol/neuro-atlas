"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { buildChartImage, copyChartImage, downloadChartImage, type ChartExport } from "@/lib/chart-export";
import { ChartExplorationContext, explorationExportReason } from "@/components/chart-exploration-context";
import { GraphExportContext } from "@/components/graph-export-context";
import { registerChart } from "@/lib/chart-export-api";

/** Only explicit clicks snapshot/export. Mounting, hovering and permission failure never write. */
export function ChartShare({ anchor, title, getChart, disabled = false }: {
  anchor: string; title: string; getChart: () => ChartExport; disabled?: boolean;
}) {
  const unavailable = explorationExportReason(useContext(ChartExplorationContext));
  const exportRequest = useContext(GraphExportContext);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  // Expose this chart's exact export (same svg/notes/legend) on window.neuroAtlas while mounted.
  useEffect(() => {
    if (disabled || unavailable) return;
    return registerChart(anchor, { title, getChart }, exportRequest?.id);
  }, [anchor, title, getChart, disabled, exportRequest, unavailable]);
  async function run(download: boolean) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setStatus(download ? "Preparing PNG…" : "Preparing chart…");
    try {
      const image = buildChartImage(getChart(), window.location.href);
      if (download) { await downloadChartImage(image); setStatus("PNG downloaded."); }
      else { await copyChartImage(image); setStatus("Chart copied. The receiving app chooses which clipboard formats to paste."); }
    } catch {
      setStatus(download ? "PNG unavailable. Try again, or use Copy link." : "Chart copy unavailable. Use Download PNG and Copy link instead.");
    } finally { pending.current = false; setBusy(false); }
  }
  if (unavailable) return <p className="exploration-export-note" data-exploration-export-disabled>{unavailable}</p>;
  return <div className="pc-share" data-chart-share>
    <button type="button" data-copy-chart={anchor} aria-label={`Copy chart: ${title}`} disabled={busy || disabled} onClick={() => void run(false)}>Copy chart</button>
    <button type="button" data-download-chart={anchor} aria-label={`Download PNG: ${title}`} disabled={busy || disabled} onClick={() => void run(true)}>Download PNG</button>
    <span role="status" aria-live="polite">{status}</span>
  </div>;
}
