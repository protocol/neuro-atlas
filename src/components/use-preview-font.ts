"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { CHART_PRESENTATION } from "@/lib/chart-presentation";

/** One measurement keeps fixed-viewBox labels and marks in screen-space units. */
export function usePreviewFont(viewBoxWidth: number, enabled: boolean, viewBoxHeight?: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [unitsPerPixel, setUnitsPerPixel] = useState(1);

  useLayoutEffect(() => {
    if (!enabled || !ref.current) return;
    const svg = ref.current;
    const updateSize = (width: number, height?: number) => {
      if (!Number.isFinite(width) || width <= 0) return;
      // A capped height can letterbox a full chart: its outer width is not the
      // scale of the plotted coordinate frame. Prefer the browser's actual CTM.
      const matrix = svg.getScreenCTM?.();
      const screenScale = matrix ? Math.hypot(matrix.a, matrix.b) : Number.NaN;
      const fallbackScale = Math.min(width / viewBoxWidth,
        viewBoxHeight && height && Number.isFinite(height) && height > 0 ? height / viewBoxHeight : Number.POSITIVE_INFINITY);
      const scale = Number.isFinite(screenScale) && screenScale > 0 ? screenScale : fallbackScale;
      if (Number.isFinite(scale) && scale > 0) setUnitsPerPixel(1 / scale);
    };
    const bounds = svg.getBoundingClientRect();
    updateSize(bounds.width, bounds.height);
    if (typeof ResizeObserver === "undefined") return;
    let active = true;
    const observer = new ResizeObserver(([entry]) => {
      if (active) updateSize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(svg);
    return () => { active = false; observer.disconnect(); };
  }, [enabled, viewBoxWidth, viewBoxHeight]);

  return { ref, fontSize: CHART_PRESENTATION.labelFontSize * unitsPerPixel, unitsPerPixel };
}
