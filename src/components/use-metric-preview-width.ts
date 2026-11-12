"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/** Reflow rail plots in CSS-pixel coordinates; wider cards must not magnify their height. */
export function useMetricPreviewWidth(ref: RefObject<Element | null>, enabled: boolean, fallback = 360) {
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    if (!enabled || !ref.current?.closest(".metrics-index")) return;
    const element = ref.current;
    const update = (measured: number) => {
      // Hidden sizing lanes can briefly report zero. Retain the last usable frame.
      if (Number.isFinite(measured) && measured > 0) setWidth(Math.max(120, Math.round(measured)));
    };
    update(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    let active = true;
    const observer = new ResizeObserver(([entry]) => { if (active) update(entry.contentRect.width); });
    observer.observe(element);
    return () => { active = false; observer.disconnect(); };
  }, [ref, enabled]);
  return width;
}
