"use client";

import { createContext, useContext, type ReactNode } from "react";
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

export function ModalSlot({ kind, children, modalOnly = false }: { kind: ModalSlotKind; children: ReactNode; modalOnly?: boolean }) {
  const slots = useContext(ModalSlotsContext);
  const target = slots?.[kind];
  if (target) return createPortal(children, target);
  // Inside a pop-out whose region is still mounting, wait one commit rather than flash inline.
  if (slots || modalOnly) return null;
  return <>{children}</>;
}

export const ModalReading = ({ children }: { children: ReactNode }) => <ModalSlot kind="reading">{children}</ModalSlot>;
export const ModalSources = ({ children, modalOnly }: { children: ReactNode; modalOnly?: boolean }) => <ModalSlot kind="sources" modalOnly={modalOnly}>{children}</ModalSlot>;
export const ModalData = ({ children }: { children: ReactNode }) => <ModalSlot kind="data">{children}</ModalSlot>;

/** A source table, closed by default under one uniform disclosure row. */
export function ModalTable({ summary, children, className }: { summary: ReactNode; children: ReactNode; className?: string }) {
  return <ModalData><details className={`mx-table${className ? ` ${className}` : ""}`}><summary>{summary}</summary>{children}</details></ModalData>;
}
