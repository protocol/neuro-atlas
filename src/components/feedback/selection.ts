"use client";

import { draftChartAnchors, metricChartAnchors } from "../../data/draft-chart-links";
import { atlasPathname } from "../../lib/atlas-path";
import type { FeedbackInput } from "../../lib/feedback/contracts";

const chartIds = new Set<string>([
  ...draftChartAnchors, ...metricChartAnchors,
  "simultaneously-recorded-neurons", "tissue-mapped", "neural-recording-hours",
  "idea_vintage", "latency_compression", "google-trends-neurotech", "google-trends-neuralink",
]);
export const allowedTarget = (value: unknown): string | undefined => typeof value === "string" && chartIds.has(value) ? value : undefined;
export type SemanticTarget = { id: string; bounds: DOMRect };

/** Only curated identities + geometry. Never inspect DOM text, labels, HTML, inputs or URLs. */
export function semanticTargets(doc: Document): SemanticTarget[] {
  const targets: SemanticTarget[] = [];
  doc.querySelectorAll<HTMLElement>("[data-performance-card], [data-draft-popout], [data-trends-card]").forEach(element => {
    const id = allowedTarget(element.dataset.performanceCard ?? element.dataset.draftPopout ?? `google-trends-${element.dataset.trendsCard}`);
    if (!id || element.closest("[hidden], [data-atlas-feedback]")) return;
    const bounds = element.getBoundingClientRect();
    if (bounds.width > 0 && bounds.height > 0) targets.push({ id, bounds });
  });
  // Native chart dialogs are top-layer elements: their enclosing card's geometry
  // is not their expanded geometry. Use only the existing curated title-ID contract.
  doc.querySelectorAll<HTMLDialogElement>("dialog[open]:not([data-atlas-feedback])").forEach(dialog => {
    const titleId = dialog.getAttribute("aria-labelledby") ?? "";
    const id = allowedTarget(titleId.replace(/(?:-popout)?-title$/, ""));
    if (id) targets.unshift({ id, bounds: dialog.getBoundingClientRect() });
  });
  return targets;
}
export function targetAt(doc: Document, x: number, y: number): string | undefined {
  return semanticTargets(doc).find(({ bounds: b }) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom)?.id;
}
export function feedbackContext(win: Window, target?: string): FeedbackInput["context"] {
  const route = atlasPathname(win.location.pathname);
  const routes = ["/", "/field-velocity", "/funding", "/milestones", "/ecosystem", "/methodology"];
  const id = allowedTarget(target);
  return {
    route: (routes.includes(route) ? route : "/") as FeedbackInput["context"]["route"],
    ...(id ? { targetId: id, chartId: id } : {}),
    viewport: { width: Math.max(1, Math.min(10000, Math.round(win.innerWidth))), height: Math.max(1, Math.min(10000, Math.round(win.innerHeight))) },
    theme: win.document.documentElement.classList.contains("dark") ? "dark" : win.document.documentElement.classList.contains("light") ? "light" : "system",
  };
}
