"use client";

import React, { useEffect, useRef, useState } from "react";
import { ModalSlotsContext, type ModalSlots } from "@/components/chart-modal-slots";
import { lockModalScroll } from "@/lib/field-velocity/modal-scroll";
import { closePerformance, takePerformanceFocusReturn } from "@/lib/field-velocity/navigation";

/** Match native Tab visibility, especially the contents of closed source disclosures. */
function isVisibleControl(control: HTMLElement) {
  if (control.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  for (let ancestor: HTMLElement | null = control; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.tagName === "DETAILS" && !ancestor.hasAttribute("open")) {
      const summary = Array.from(ancestor.children).find(child => child.tagName === "SUMMARY");
      if (!summary?.contains(control)) return false;
    }
    const style = window.getComputedStyle(ancestor);
    if (style.display === "none" || style.visibility === "hidden") return false;
  }
  return true;
}

/** Focus only after the prior SubTabs pane has become visible again. */
export function restoreFocusAfterPaneReveal(target: HTMLElement | null) {
  const document = target?.ownerDocument;
  const view = document?.defaultView;
  if (!target || !document || !view || !target.isConnected || document.querySelector("dialog[open]")) return;
  if (!target.closest("[hidden]")) {
    target.focus({ preventScroll: true });
    return;
  }
  const focusWhenVisible = (remainingFrames: number) => {
    view.requestAnimationFrame(() => {
      if (!target.isConnected || document.querySelector("dialog[open]")) return;
      if (target.closest("[hidden]")) {
        if (remainingFrames > 0) focusWhenVisible(remainingFrames - 1);
        return;
      }
      target.focus({ preventScroll: true });
    });
  };
  focusWhenVisible(3);
}

/** Native top-layer dialog makes the rest of the page inert, without moving it. */
export function ChartModal({ id, title, children, returnFocus, offscreen = false }: { id: string; title: string; children: React.ReactNode; returnFocus: React.RefObject<HTMLButtonElement | null>; offscreen?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const [slots, setSlots] = useState<ModalSlots>({});
  // Stable ref callbacks: a new function per render would detach and re-attach every region.
  const slotRefs = useRef<Partial<Record<keyof ModalSlots, (node: HTMLElement | null) => void>>>({});
  const slotRef = (kind: keyof ModalSlots) => slotRefs.current[kind] ??= (node: HTMLElement | null) => setSlots(previous => previous[kind] === node ? previous : { ...previous, [kind]: node });
  const body = <ModalSlotsContext.Provider value={slots}>
    <div className="pc-detail">
      {children}
      <div className="mx-grid">
        <div className="mx-left" ref={slotRef("reading")} />
        <aside className="mx-right" aria-label="Sources and data"><h3 className="mx-k">Sources &amp; data</h3><div className="mx-sources" ref={slotRef("sources")} /></aside>
      </div>
      <div className="mx-data" ref={slotRef("data")} />
    </div>
  </ModalSlotsContext.Provider>;
  useEffect(() => {
    // An off-screen export mount is not a dialog: no focus, scroll lock or history.
    if (offscreen) return;
    const dialog = ref.current!;
    const previous = document.activeElement;
    const trigger = returnFocus.current;
    const crossTabOrigin = takePerformanceFocusReturn();
    // Capture before showModal and retain through StrictMode effect replay.
    originRef.current ??= crossTabOrigin ?? (previous instanceof HTMLElement && previous !== document.body && previous.isConnected ? previous : trigger);
    const releaseScroll = lockModalScroll(document);
    dialog.showModal();
    let focusFrame = 0;
    // Fresh chart hashes can mount the dialog before Metrics reveals its category.
    // Native focus is ignored while an ancestor is hidden; retry after that reveal.
    const focusClose = (remainingFrames: number) => {
      if (!dialog.isConnected || !dialog.open) return;
      if (dialog.closest("[hidden]")) {
        if (remainingFrames > 0) focusFrame = window.requestAnimationFrame(() => focusClose(remainingFrames - 1));
        return;
      }
      closeRef.current?.focus({ preventScroll: true });
    };
    focusClose(3);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      dialog.close();
      releaseScroll();
      if (!document.querySelector("dialog[open]")) {
        restoreFocusAfterPaneReveal(originRef.current);
      }
    };
  }, [returnFocus, offscreen]);
  // Card PNG export: the same chart tree, laid out invisibly so its share control can register.
  if (offscreen) return <div className="chart-export-host" data-chart-export-host={id} aria-hidden="true" inert>
    <div className="pc-modal-panel"><div className="pc-modal-header"><div className="mx-actions" ref={slotRef("actions")} /></div>{body}</div>
  </div>;
  return <dialog ref={ref} className="pc-modal" aria-modal="true" aria-labelledby={`${id}-title`}
    onCancel={event => { event.preventDefault(); closePerformance(); }}
    onClick={event => { if (event.target === event.currentTarget) closePerformance(); }}
    onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); closePerformance(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(ref.current!.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], summary, input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]'))
        .filter(control => control.getAttribute("tabindex") !== "-1" && isVisibleControl(control));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus({ preventScroll: true }); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus({ preventScroll: true }); }
    }}>
    <div className="pc-modal-panel">
      {/* Close stays the header's first button; the chart's actions follow it in the same row. */}
      <header className="pc-modal-header"><h2 id={`${id}-title`}>{title}</h2><button ref={closeRef} type="button" className="pc-modal-close" aria-label={`Close ${title}`} onClick={closePerformance}>
        {/* A CSS-drawn cross: geometrically centred, and no extra SVG inside the chart dialog. */}
        <span className="pc-modal-close-icon" aria-hidden="true" />
        <span className="pc-modal-close-label">Close</span>
      </button><div className="mx-actions" ref={slotRef("actions")} /></header>
      {body}
    </div>
  </dialog>;
}
