"use client";

import { useRef, useState } from "react";
import { buildChartImage, copyChartImage, downloadChartImage, type ChartExport } from "@/lib/chart-export";

/** Only explicit clicks snapshot/export. Mounting, hovering and permission failure never write. */
export function ChartShare({ anchor, title, getChart, disabled = false }: {
  anchor: string; title: string; getChart: () => ChartExport; disabled?: boolean;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function run(download: boolean) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setStatus(download ? "Preparing PNG…" : "Preparing chart…");
    try {
      const image = buildChartImage(getChart(), window.location.href);
      if (download) { await downloadChartImage(image); setStatus("PNG downloaded. Use Copy link to share its source."); }
      else { await copyChartImage(image); setStatus("Chart copied. Paste support varies: your app may choose the image or link, not both."); }
    } catch {
      setStatus(download ? "PNG unavailable. Try again, or use Copy link." : "Chart copy unavailable. Use Download PNG and Copy link instead.");
    } finally { pending.current = false; setBusy(false); }
  }
  return <div className="pc-share" data-chart-share>
    <button type="button" data-copy-chart={anchor} aria-label={`Copy chart: ${title}`} disabled={busy || disabled} onClick={() => void run(false)}>Copy chart</button>
    <button type="button" data-download-chart={anchor} aria-label={`Download PNG: ${title}`} disabled={busy || disabled} onClick={() => void run(true)}>Download PNG</button>
    <span role="status" aria-live="polite">{status}</span>
  </div>;
}
