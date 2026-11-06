"use client";

import React from "react";
import type { usePointTooltip } from "./point-source-tooltip";
import { CHART_PRESENTATION } from "@/lib/chart-presentation";
import { usePreviewFont } from "./use-preview-font";
import { buildPublicationSankey } from "@/lib/publication-sankey";
import { SECTOR_LABELS, type PublicationChartData } from "@/lib/publication-data";

const number = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 1 });

/** A shared count-scaled Sankey; the archived changes-only matrix is never zero-filled. */
type Inspect = (text: string) => ReturnType<ReturnType<typeof usePointTooltip<string>>["pointProps"]>;
export function PublicationSankey({ data, compact = false, inspect, activeInspection }: { data: PublicationChartData; compact?: boolean; inspect?: Inspect; activeInspection?: string | null }) {
  const { ref, fontSize } = usePreviewFont(900, true);
  const available = data.endpointTransitions !== null;
  const options = compact ? { top: fontSize * 2.1, height: fontSize * 17.1, gap: fontSize * .7, labelHeight: fontSize * 3.3 } : undefined;
  const layout = buildPublicationSankey(data.endpointTransitions ?? data.transitions.map(row => ({ ...row, total: 0, destinations: row.destinations.map(dest => ({ ...dest, count: 0, share: 0 })) })), options);
  const height = compact ? fontSize * 20 : 580;
  const nodes = [...layout.sources, ...layout.targets];
  return <svg ref={ref} className="publication-sankey" data-export-font-size={CHART_PRESENTATION.labelFontSize} viewBox={`0 0 900 ${height}`} role="img" aria-label="First-to-latest publication affiliations, all four origins and destinations, shared people-count scale" data-has-active={activeInspection ? "true" : undefined} style={{ fontSize }}>
    <title>First and latest publication-affiliation sectors, including same-sector endpoints</title>
    {!available ? <text x="12" y={fontSize * 3}>Complete endpoint counts unavailable in this snapshot.</text> : layout.total === 0 ? <text x="12" y={fontSize * 3}>No researchers qualify for the first/latest publication cohort.</text> : <>
      <text x="0" y={fontSize * 1.1} fontWeight="700">First paper</text>
      <text x="450" y={fontSize * 1.1} textAnchor="middle">{number(layout.total)} people</text>
      <text x="714" y={fontSize * 1.1} fontWeight="700">Latest paper</text>
      {layout.links.map(link => {
        const id = `${link.from}:${link.to}`;
        const description = `${SECTOR_LABELS[link.from]} → ${SECTOR_LABELS[link.to]}: ${number(link.count)} of ${number(link.originTotal)} people (${number(link.share)}% of this starting sector’s cohort). ${link.sameSector ? link.from === "No listed affiliation" ? "Affiliation metadata missing at both first and latest paper." : "Same sector at first and latest paper." : "Different affiliation categories at first and latest paper."}`;
        const events = inspect?.(description);
        return <path key={id} className={`publication-sankey-flow${activeInspection === description ? " is-emphasized" : ""}`} data-publication-mark data-from={link.from} data-to={link.to} data-value={link.count} data-same-sector={String(link.sameSector)} data-sankey-width={link.width} d={link.path} fill={link.color} fillOpacity=".42" stroke="none" {...(inspect ? { tabIndex: 0, role: "button", "aria-label": description, ...events } : {})}><title>{description}</title></path>;
      })}
      {nodes.map(node => {
        const x = node.side === "source" ? 0 : 714;
        const name = compact && node.sector === "No listed affiliation" ? ["No listed", "affiliation"] : compact && node.sector === "Other institutions" ? ["Other", "institutions"] : [node.label];
        const lines = [...name, `${number(node.count)} people`];
        const y = node.labelY - (lines.length - 1) * fontSize * .6 + fontSize * .3;
        return <g key={`${node.side}:${node.sector}`} data-sankey-node data-side={node.side} data-sector={node.sector} data-count={node.count}>
          {node.count > 0 && <rect x={node.x} y={node.y} width={layout.nodeWidth} height={node.height} fill={node.color}/>}
          <text data-sankey-label x={x} y={y} textAnchor="start">{lines.map((line, i) => <tspan key={i} x={x} dy={i ? fontSize * 1.2 : 0} fontWeight={i === lines.length - 1 ? 400 : 600} fill={i === lines.length - 1 ? "var(--muted)" : "var(--foreground)"}>{line}</tspan>)}</text>
        </g>;
      })}
    </>}
  </svg>;
}
