"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

export function useDashboardLayout(root: RefObject<HTMLElement | null>, layout: unknown) {
  const first = useRef(new Map<Element, DOMRect>());
  const running = useRef(new Map<Element, Animation>());
  const elements = () => root.current?.querySelectorAll<HTMLElement>("[data-dashboard-card]") ?? [];
  const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const cancel = () => {
    for (const animation of running.current.values()) animation.cancel();
    running.current.clear();
  };
  function capture() {
    first.current.clear();
    if (!reduced()) for (const card of elements()) first.current.set(card, card.getBoundingClientRect());
    cancel();
  }
  useLayoutEffect(() => {
    if (!reduced()) for (const card of elements()) {
      if (!card.animate) continue;
      const before = first.current.get(card);
      const after = card.getBoundingClientRect();
      if (!after.width) continue;
      const dx = before ? before.left - after.left : 0;
      const dy = before ? before.top - after.top : 6;
      const dw = (before?.width ?? after.width) - after.width;
      if (before && Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dw)) < 1) continue;
      // Animate width and translation, never scale the plot, lettering or hit targets.
      const width = (d: number) => `${Math.max(1, after.width + d)}px`;
      const translate = (x: number, y: number) => `translate(${x}px, ${y}px)`;
      // Overshoot a shrinking edge inward; a growing right edge never exceeds its track.
      const bounce = (d: number) => Math.max(-7, Math.min(7, -0.06 * d));
      const animation = card.animate([
        { width: width(dw), transform: translate(dx, dy), opacity: before ? 1 : .45, offset: 0, easing: "cubic-bezier(.16,.8,.27,1)" },
        { width: width(dw > 0 ? bounce(dw) : 0), transform: translate(bounce(dx), bounce(dy)), opacity: 1, offset: .78, easing: "ease-out" },
        { width: width(0), transform: translate(0, 0), opacity: 1, offset: 1 },
      ], { duration: 320 });
      running.current.set(card, animation);
      animation.onfinish = () => { if (running.current.get(card) === animation) running.current.delete(card); };
    }
    first.current.clear();
  // Read only after a change to the layout model.
  }, [layout]);
  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onChange = () => { if (preference?.matches) cancel(); };
    const onResize = () => cancel();
    preference?.addEventListener?.("change", onChange);
    window.addEventListener("resize", onResize);
    return () => {
      preference?.removeEventListener?.("change", onChange);
      window.removeEventListener("resize", onResize);
      cancel();
    };
  }, []);
  return capture;
}
