"use client";

import type { ReactNode } from "react";
import { DraftChartShare } from "@/components/draft-chart-share";
import { ModalSlot } from "@/components/chart-modal-slots";

/** One action row in every expanded chart; status/fallback content occupies later rows. */
export function ChartActions({ anchor, title, link, children }: {
  anchor: string; title: string; link?: ReactNode; children?: ReactNode;
}) {
  // In a pop-out the row sits in the header, beside Close.
  return <ModalSlot kind="actions"><div className="chart-actions" data-chart-actions role="group" aria-label={`${title} sharing actions`}>
    {link ?? <DraftChartShare anchor={anchor} label={title} />}
    {children}
  </div></ModalSlot>;
}
