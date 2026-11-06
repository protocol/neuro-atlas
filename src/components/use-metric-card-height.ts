"use client";

import { useLayoutEffect, useRef } from "react";

/** Equalize the chrome, never the SVG: labels and qualifiers retain their natural size. */
function measureCards(root: HTMLElement) {
  // Reserve native scrollbar height before a rail opens, including at document bottom.
  const gutter = document.createElement("div");
  gutter.style.cssText = "position:absolute;left:0;top:0;width:100px;height:100px;overflow:scroll;visibility:hidden;pointer-events:none;contain:strict";
  root.append(gutter);
  const scrollbarHeight = gutter.offsetHeight - gutter.clientHeight;
  gutter.remove();
  root.style.setProperty("--metric-scrollbar-height", `${scrollbarHeight}px`);
  let height = 0;
  const measured: { card: HTMLElement; natural: number }[] = [];
  // Hidden peers participate in sizing so toggles cannot resize earlier rows.
  for (const body of root.querySelectorAll<HTMLElement>("[data-metric-card-body]")) {
    const card = body.closest<HTMLElement>("article");
    const footer = card?.querySelector<HTMLElement>("[data-metric-card-footer]");
    if (!card || !footer) continue;
    const bodyRect = body.getBoundingClientRect();
    if (bodyRect.width <= 0 || !Number.isFinite(bodyRect.height)) continue;
    const style = getComputedStyle(card);
    const chrome = [style.borderTopWidth, style.borderBottomWidth, style.paddingTop, style.paddingBottom]
      .reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
    // Subtract space already allocated by this pass, so filling cannot inflate the maximum.
    const appliedExtra = Number(body.querySelector<HTMLElement>("[data-metric-preview-extra]")?.getAttribute("data-metric-preview-extra") ?? 0);
    const natural = bodyRect.height - (Number.isFinite(appliedExtra) ? appliedExtra : 0) + footer.getBoundingClientRect().height + chrome;
    measured.push({ card, natural });
    height = Math.max(height, natural);
  }
  if (height > 0) {
    const target = Math.ceil(height);
    root.style.setProperty("--metric-card-height", `${target}px`);
    for (const { card, natural } of measured) {
      const extra = Math.max(0, target - natural);
      const previous = Number.parseFloat(card.style.getPropertyValue("--metric-preview-extra"));
      if (!Number.isFinite(previous) || Math.abs(previous - extra) >= .25) card.style.setProperty("--metric-preview-extra", String(extra));
    }
  }
}

export function useMetricCardHeight() {
  const ref = useRef<HTMLElement>(null);
  // Keep sizing synchronized with layout, without tying height to expansion state.
  useLayoutEffect(() => { if (ref.current) measureCards(ref.current); });
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    let active = true;
    const observer = new ResizeObserver(() => { if (active) measureCards(root); });
    // Observe natural-size children, not the equalized cards, to avoid a feedback loop.
    root.querySelectorAll("[data-metric-card-body], [data-metric-card-footer]").forEach(element => observer.observe(element));
    return () => { active = false; observer.disconnect(); root.style.removeProperty("--metric-card-height"); root.querySelectorAll<HTMLElement>("article").forEach(card => card.style.removeProperty("--metric-preview-extra")); };
  }, []);
  return ref;
}
