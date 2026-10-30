"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Keep fixed-viewBox preview labels at 11 CSS pixels without moving marks. */
export function usePreviewFont(viewBoxWidth: number, enabled: boolean) {
  const ref = useRef<SVGSVGElement>(null);
  const [renderedWidth, setRenderedWidth] = useState(viewBoxWidth);

  useLayoutEffect(() => {
    if (!enabled || !ref.current) return;
    const updateWidth = (width: number) => {
      if (Number.isFinite(width) && width > 0) setRenderedWidth(width);
    };
    updateWidth(ref.current.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    let active = true;
    const observer = new ResizeObserver(([entry]) => {
      if (active) updateWidth(entry.contentRect.width);
    });
    observer.observe(ref.current);
    return () => { active = false; observer.disconnect(); };
  }, [enabled]);

  return { ref, fontSize: 11 * viewBoxWidth / renderedWidth };
}
