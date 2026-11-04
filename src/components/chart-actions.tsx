"use client";

import type { ReactNode } from "react";
import { DraftChartShare } from "@/components/draft-chart-share";

/** One action row in every expanded chart; status/fallback content occupies later rows. */
export function ChartActions({ anchor, title, link, children }: {
  anchor: string; title: string; link?: ReactNode; children?: ReactNode;
}) {
  return <div className="chart-actions" data-chart-actions role="group" aria-label={`${title} sharing actions`}>
    {link ?? <DraftChartShare anchor={anchor} label={title} />}
    {children}
  </div>;
}
