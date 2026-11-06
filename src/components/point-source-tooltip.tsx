"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Selection<T> = { point: T; anchor: Element; trigger: Element };

/** Shared source inspection; entry requires movement, never layout-only mouseover. */
export function usePointTooltip<T>(points?: readonly T[]) {
  const id = useId();
  const [hovered, setHovered] = useState<Selection<T> | null>(null);
  const [focused, setFocused] = useState<Selection<T> | null>(null);
  const [pinned, setPinned] = useState<Selection<T> | null>(null);
  const suppressFocus = useRef(false);
  const dismissed = useRef(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelLeave = () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); };
  const leave = () => {
    cancelLeave();
    leaveTimer.current = setTimeout(() => {
      const popup = document.getElementById(id);
      if (!popup?.contains(document.activeElement)) setHovered(null);
    }, 300);
  };
  useEffect(() => () => cancelLeave(), []);
  const current = [focused, pinned, hovered].find(selection => selection && (!points || points.includes(selection.point))) ?? null;
  const dismiss = (restoreFocus = false) => {
    dismissed.current = true;
    cancelLeave();
    setHovered(null); setFocused(null); setPinned(null);
    if (restoreFocus && current) {
      suppressFocus.current = true;
      (current.trigger as HTMLElement).focus({ preventScroll: true });
      suppressFocus.current = false;
    }
  };
  useEffect(() => {
    if (!current) return;
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || dismissed.current) return;
      event.preventDefault(); event.stopPropagation();
      dismiss(true);
    };
    const document = current.anchor.ownerDocument;
    document.addEventListener("keydown", escape, true);
    return () => document.removeEventListener("keydown", escape, true);
  });
  return {
    active: current?.point ?? null,
    pointProps: (point: T, getAnchor?: (trigger: Element) => Element | null) => {
      const selection = (trigger: Element) => ({ point, anchor: getAnchor?.(trigger) ?? trigger, trigger });
      const toggle = (trigger: Element) => {
        if (pinned?.point === point) dismiss();
        else { dismissed.current = false; setFocused(null); setPinned(selection(trigger)); }
      };
      return {
        "aria-describedby": current?.point === point ? id : undefined,
        onMouseMove: (event: MouseEvent<Element>) => { dismissed.current = false; cancelLeave(); setHovered(selection(event.currentTarget)); },
        onMouseLeave: leave,
        onFocus: (event: FocusEvent<Element>) => { if (!suppressFocus.current) { dismissed.current = false; setFocused(selection(event.currentTarget)); } },
        onBlur: (event: FocusEvent<Element>) => {
          const target = event.relatedTarget as Element | null;
          if (target?.closest?.("[data-point-tooltip]")?.id !== id) setFocused(null);
        },
        onClick: (event: MouseEvent<Element>) => toggle(event.currentTarget),
        onKeyDown: (event: KeyboardEvent<Element>) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(event.currentTarget); }
        },
      };
    },
    tooltipProps: {
      id, anchor: current?.anchor ?? null, pinned: !!pinned && current?.point === pinned.point, onDismiss: () => dismiss(true),
      onMouseEnter: cancelLeave, onMouseLeave: leave,
      onFocus: cancelLeave,
      onBlur: (event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setFocused(null); leave(); }
      },
    },
  };
}

/** Portal stays in the native dialog's top layer, outside all chart scrollers. */
export function PointTooltip({ id, anchor, children, pinned, onDismiss, ...events }: {
  id: string; anchor: Element | null; children: ReactNode; pinned: boolean; onDismiss: () => void;
  onMouseEnter: () => void; onMouseLeave: () => void; onFocus: () => void; onBlur: (event: FocusEvent<HTMLDivElement>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; maxHeight?: number }>({ left: 0, top: 0 });
  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const view = anchor.ownerDocument.defaultView!;
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      if (![rect.left, rect.right, rect.top, rect.bottom].every(Number.isFinite)) return;
      const popup = ref.current!.getBoundingClientRect();
      const viewport = view.visualViewport;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 8;
      const topEdge = (viewport?.offsetTop ?? 0) + 8;
      const rightEdge = leftEdge + (viewport?.width ?? view.innerWidth) - 16;
      const bottomEdge = topEdge + (viewport?.height ?? view.innerHeight) - 16;
      const width = Math.min(popup.width, rightEdge - leftEdge);
      const defaultMaxHeight = Math.min(24 * Number.parseFloat(view.getComputedStyle(anchor.ownerDocument.documentElement).fontSize || "16"), bottomEdge - topEdge);
      const naturalHeight = Math.min(Math.max(popup.height, ref.current!.scrollHeight + 2), defaultMaxHeight);
      const fitsRight = rect.right + 12 + width <= rightEdge;
      const fitsLeft = rect.left - width - 12 >= leftEdge;
      let maxHeight = defaultMaxHeight;
      let preferredLeft: number, preferredTop: number;
      if (fitsRight || fitsLeft) {
        preferredLeft = fitsRight ? rect.right + 12 : rect.left - width - 12;
        preferredTop = (rect.top + rect.bottom - naturalHeight) / 2;
      } else {
        // A narrow popup must not cover the mark between pointer-down and -up.
        // Otherwise Chrome retargets that click to the dialog/backdrop.
        const below = Math.max(0, bottomEdge - rect.bottom - 12);
        const above = Math.max(0, rect.top - topEdge - 12);
        const placeBelow = below >= above;
        maxHeight = Math.min(defaultMaxHeight, Math.max(below, above));
        const height = Math.min(naturalHeight, maxHeight);
        preferredLeft = (rect.left + rect.right - width) / 2;
        preferredTop = placeBelow ? rect.bottom + 12 : rect.top - height - 12;
      }
      const height = Math.min(naturalHeight, maxHeight);
      const left = Math.max(leftEdge, Math.min(rightEdge - width, preferredLeft));
      const top = Math.max(topEdge, Math.min(bottomEdge - height, preferredTop));
      setPosition(previous => previous.left === left && previous.top === top && previous.maxHeight === maxHeight ? previous : { left, top, maxHeight });
    };
    update();
    // Scroll capture includes internal chart/modal scrollers; RAF also follows
    // animated source coordinates without moving the scientific SVG itself.
    view.addEventListener("scroll", update, true);
    view.addEventListener("resize", update);
    view.visualViewport?.addEventListener("resize", update);
    view.visualViewport?.addEventListener("scroll", update);
    let frame = 0;
    const follow = () => { update(); frame = view.requestAnimationFrame(follow); };
    frame = view.requestAnimationFrame(follow);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(ref.current);
    return () => {
      view.cancelAnimationFrame(frame);
      view.removeEventListener("scroll", update, true);
      view.removeEventListener("resize", update);
      view.visualViewport?.removeEventListener("resize", update);
      view.visualViewport?.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [anchor, children]);
  if (!anchor) return null;
  return createPortal(<div ref={ref} id={id} role="tooltip" data-point-tooltip data-pinned={pinned || undefined} className="point-source-tooltip" style={{ position: "fixed", ...position }} {...events}>
    <button type="button" aria-label="Close source details" onClick={onDismiss}>×</button>
    {children}
  </div>, anchor.closest("dialog") ?? anchor.ownerDocument.body);
}
