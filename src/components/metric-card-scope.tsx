"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * One-line scope qualifier in a rail card footer. When it is wider than the space
 * left by the copy controls it fades at the clipped edge and scrolls sideways:
 * trackpad/shift-wheel natively, or click-and-drag with a mouse. Nothing is cut
 * from the text itself — the full qualifier is also the element's tooltip.
 */
export function MetricCardScope({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const overflow = element.scrollWidth - element.clientWidth;
      const clipped = overflow > 1;
      element.toggleAttribute("data-clipped", clipped);
      element.dataset.edge = !clipped ? "" : element.scrollLeft <= 1 ? "start" : element.scrollLeft >= overflow - 1 ? "end" : "middle";
    };
    element.title = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
    update();
    element.addEventListener("scroll", update, { passive: true });
    let drag: { x: number; left: number; id: number } | null = null;
    const down = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0 || !element.hasAttribute("data-clipped")) return;
      drag = { x: event.clientX, left: element.scrollLeft, id: event.pointerId };
      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = "";
    };
    const move = (event: PointerEvent) => { if (drag && event.pointerId === drag.id) element.scrollLeft = drag.left - (event.clientX - drag.x); };
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      delete element.dataset.dragging;
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    // Card widths only change with the viewport; avoid one more ResizeObserver per card.
    const view = element.ownerDocument.defaultView;
    view?.addEventListener("resize", update);
    element.addEventListener("pointerenter", update);
    const frame = view?.requestAnimationFrame(update) ?? 0;
    return () => {
      view?.removeEventListener("resize", update);
      element.removeEventListener("pointerenter", update);
      view?.cancelAnimationFrame(frame);
      element.removeEventListener("scroll", update);
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
    };
  }, [children]);
  return <div ref={ref} className="metric-preview-context metric-card-scope">{children}</div>;
}
