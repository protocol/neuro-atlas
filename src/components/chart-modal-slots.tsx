"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { ChartPlate } from "@/components/chart-plate";
import { createPortal } from "react-dom";

/**
 * Pop-out layout regions. A chart's own components decide what belongs where;
 * ChartModal owns the regions: header actions, a reading column, a
 * "Sources & data" column and a full-width data row below them.
 * Outside a pop-out (cards, standalone renders) content stays inline.
 */
export type ModalSlotKind = "actions" | "reading" | "sources" | "data";
export type ModalSlots = Partial<Record<ModalSlotKind, HTMLElement | null>>;
export const ModalSlotsContext = createContext<ModalSlots | null>(null);
// Standalone charts stay inline in document order, including their SSR evidence.
export const InlineChartDetail = createContext(false);

/** Reuse the merged reading/source/table layout without a dialog. Until the
 * client targets mount, evidence remains inline so server HTML never loses it. */
export function StandaloneChartSupport({ children, state, anchor, title }: { children: ReactNode; state: string; anchor: string; title: string }) {
  const [slots, setSlots] = useState<ModalSlots>({});
  const refs = useRef<Partial<Record<ModalSlotKind, (node: HTMLElement | null) => void>>>({});
  const slotRef = (kind: ModalSlotKind) => refs.current[kind] ??= (node: HTMLElement | null) =>
    setSlots(previous => previous[kind] === node ? previous : { ...previous, [kind]: node });
  return <ModalSlotsContext.Provider value={slots}>
    <div className="pc-detail graph-detail metrics-index" data-chart-state={state}>
      <div className="graph-chart-actions" ref={slotRef("actions")} />
      <ChartPlate anchor={anchor} title={title}>{children}</ChartPlate>
      <div className="mx-grid">
        <div className="mx-left" ref={slotRef("reading")} />
        <aside className="mx-right" aria-label="Source notes"><h3 className="mx-k">Source notes</h3><div className="mx-sources" ref={slotRef("sources")} /></aside>
      </div>
      <div className="mx-data" ref={slotRef("data")} />
    </div>
  </ModalSlotsContext.Provider>;
}

export function ModalSlot({ kind, children, modalOnly = false }: { kind: ModalSlotKind; children: ReactNode; modalOnly?: boolean }) {
  const slots = useContext(ModalSlotsContext);
  const inline = useContext(InlineChartDetail);
  const target = slots?.[kind];
  if (target) return createPortal(children, target);
  // Inside a pop-out whose region is still mounting, wait one commit rather than flash inline.
  if ((slots && !inline) || (modalOnly && !inline)) return null;
  return <>{children}</>;
}

export const ModalReading = ({ children }: { children: ReactNode }) => <ModalSlot kind="reading">{children}</ModalSlot>;
export const ModalSources = ({ children, modalOnly }: { children: ReactNode; modalOnly?: boolean }) => <ModalSlot kind="sources" modalOnly={modalOnly}>{children}</ModalSlot>;
export const ModalData = ({ children }: { children: ReactNode }) => <ModalSlot kind="data">{children}</ModalSlot>;

/** A source table, closed by default under one uniform disclosure row. */
export function ModalTable({ summary, children, className }: { summary: ReactNode; children: ReactNode; className?: string }) {
  return <ModalData><details className={`mx-table${className ? ` ${className}` : ""}`}><summary>{summary}</summary>{children}</details></ModalData>;
}
