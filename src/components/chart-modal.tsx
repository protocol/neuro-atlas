"use client";

import React, { useEffect, useRef } from "react";
import { lockModalScroll } from "@/lib/field-velocity/modal-scroll";
import { closePerformance, takePerformanceFocusReturn } from "@/lib/field-velocity/navigation";

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
export function ChartModal({ id, title, children, returnFocus }: { id: string; title: string; children: React.ReactNode; returnFocus: React.RefObject<HTMLButtonElement | null> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const originRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement;
    const trigger = returnFocus.current;
    const crossTabOrigin = takePerformanceFocusReturn();
    // Capture before showModal and retain through StrictMode effect replay.
    originRef.current ??= crossTabOrigin ?? (previous instanceof HTMLElement && previous !== document.body && previous.isConnected ? previous : trigger);
    const releaseScroll = lockModalScroll(document);
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      releaseScroll();
      if (!document.querySelector("dialog[open]")) {
        restoreFocusAfterPaneReveal(originRef.current);
      }
    };
  }, [returnFocus]);
  return <dialog ref={ref} className="pc-modal" aria-modal="true" aria-labelledby={`${id}-title`}
    onCancel={event => { event.preventDefault(); closePerformance(); }}
    onClick={event => { if (event.target === event.currentTarget) closePerformance(); }}
    onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); closePerformance(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(ref.current!.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], select:not([disabled]), [tabindex="0"]'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus({ preventScroll: true }); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus({ preventScroll: true }); }
    }}>
    <div className="pc-modal-panel">
      <header className="pc-modal-header"><h2 id={`${id}-title`}>{title}</h2><button ref={closeRef} type="button" aria-label={`Close ${title}`} onClick={closePerformance}><span aria-hidden="true">×</span> Close</button></header>
      <div className="pc-detail">{children}</div>
    </div>
  </dialog>;
}
