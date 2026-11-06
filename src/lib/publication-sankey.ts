import { SECTOR_COLORS, SECTOR_LABELS, type PublicationChartData, type PublicationSector } from "./publication-data";

const ORDER: PublicationSector[] = ["Academic", "No listed affiliation", "Other institutions", "Industry"];
export type SankeyOptions = { top?: number; height?: number; gap?: number; labelHeight?: number; left?: number; right?: number };
export type AffiliationSankeyNode = { sector: PublicationSector; side: "source" | "target"; label: string; color: string; count: number; x: number; y: number; height: number; labelY: number };

/** One people-count scale for every node and ribbon. Label space never inflates a value. */
export function buildPublicationSankey(transitions: PublicationChartData["transitions"], options: SankeyOptions = {}) {
  const { top = 56, height = 480, gap = 32, labelHeight = 44, left = 198, right = 688 } = options;
  const nodeWidth = 12;
  if (!(height > labelHeight * 4 + gap * 3)) throw new Error("Insufficient Sankey label space");
  const sourceCounts = ORDER.map(sector => transitions.find(row => row.from === sector)?.total ?? 0);
  const targetCounts = ORDER.map(sector => transitions.reduce((sum, row) => sum + (row.destinations.find(dest => dest.sector === sector)?.count ?? 0), 0));
  const total = sourceCounts.reduce((sum, value) => sum + value, 0);
  const span = (counts: number[], scale: number) => counts.reduce((sum, value) => sum + Math.max(labelHeight, value * scale), gap * 3);
  let low = 0, high = total ? height / total : 0;
  for (let i = 0; i < 60; i++) {
    const candidate = (low + high) / 2;
    if (Math.max(span(sourceCounts, candidate), span(targetCounts, candidate)) <= height) low = candidate;
    else high = candidate;
  }
  const scale = low;
  const column = (counts: number[], side: "source" | "target"): AffiliationSankeyNode[] => {
    let cursor = top + (height - span(counts, scale)) / 2;
    return ORDER.map((sector, i) => {
      const valueHeight = counts[i] * scale, slotHeight = Math.max(labelHeight, valueHeight);
      const node = { sector, side, label: SECTOR_LABELS[sector], color: SECTOR_COLORS[sector], count: counts[i], x: side === "source" ? left : right, y: cursor + (slotHeight - valueHeight) / 2, height: valueHeight, labelY: cursor + slotHeight / 2 };
      cursor += slotHeight + gap;
      return node;
    });
  };
  const sources = column(sourceCounts, "source"), targets = column(targetCounts, "target");
  const sourceOffsets = new Map<PublicationSector, number>(), targetOffsets = new Map<PublicationSector, number>();
  const links = sources.flatMap(source => targets.flatMap(target => {
    const dest = transitions.find(row => row.from === source.sector)?.destinations.find(row => row.sector === target.sector);
    if (!dest?.count) return [];
    const width = dest.count * scale;
    const sourceY = source.y + (sourceOffsets.get(source.sector) ?? 0), targetY = target.y + (targetOffsets.get(target.sector) ?? 0);
    sourceOffsets.set(source.sector, (sourceOffsets.get(source.sector) ?? 0) + width);
    targetOffsets.set(target.sector, (targetOffsets.get(target.sector) ?? 0) + width);
    const x0 = source.x + nodeWidth, x1 = target.x, control = (x0 + x1) / 2;
    const path = `M ${x0} ${sourceY} C ${control} ${sourceY} ${control} ${targetY} ${x1} ${targetY} L ${x1} ${targetY + width} C ${control} ${targetY + width} ${control} ${sourceY + width} ${x0} ${sourceY + width} Z`;
    return [{ from: source.sector, to: target.sector, count: dest.count, share: dest.share, originTotal: source.count, sameSector: source.sector === target.sector, color: target.color, width, sourceY, targetY, path }];
  }));
  return { total, scale, nodeWidth, sources, targets, links };
}
