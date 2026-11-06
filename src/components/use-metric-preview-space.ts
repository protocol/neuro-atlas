"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/** The card owns spare screen-space height; renderers reflow coordinates, never stretch type. */
export function useMetricPreviewSpace(ref: RefObject<Element | null>, enabled: boolean, coordinateWidth?: number) {
  const [extra, setExtra] = useState(0);
  useLayoutEffect(() => {
    if (!enabled || !ref.current) return;
    const card = ref.current.closest<HTMLElement>("article:has([data-metric-card-body])");
    if (!card || !card.closest(".metrics-index")) return;
    let active = true;
    const update = () => {
      if (!active) return;
      const value = Number.parseFloat(card.style.getPropertyValue("--metric-preview-extra"));
      const width = ref.current?.getBoundingClientRect().width ?? 0;
      if (coordinateWidth && (!Number.isFinite(width) || width <= 0)) return;
      const scale = coordinateWidth ? coordinateWidth / width : 1;
      const next = Number.isFinite(value) ? Math.max(0, value) * scale : 0;
      setExtra(previous => Math.abs(previous - next) < .25 ? previous : next);
    };
    update();
    const observer = new card.ownerDocument.defaultView!.MutationObserver(update);
    observer.observe(card, { attributes: true, attributeFilter: ["style"] });
    const resize = coordinateWidth && typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ref.current) resize?.observe(ref.current);
    return () => { active = false; observer.disconnect(); resize?.disconnect(); };
  }, [ref, enabled, coordinateWidth]);
  return enabled ? extra : 0;
}
