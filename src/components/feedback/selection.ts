"use client";

import { atlasPathname } from "../../lib/atlas-path";
import { FEEDBACK_SELECTABLE_CHART_IDS, type FeedbackElementReference, type FeedbackInput } from "../../lib/feedback/contracts";

const chartIds = new Set<string>(FEEDBACK_SELECTABLE_CHART_IDS);
export const allowedTarget = (value: unknown): string | undefined => typeof value === "string" && chartIds.has(value) ? value : undefined;
export type SemanticTarget = { id: string; bounds: DOMRect; element: Element };

/** Only curated identities + geometry. Never inspect DOM text, labels, HTML, inputs or URLs. */
export function semanticTargets(doc: Document): SemanticTarget[] {
  const targets: SemanticTarget[] = [];
  doc.querySelectorAll<HTMLElement>("[data-performance-card], [data-draft-popout], [data-trends-card]").forEach(element => {
    const id = allowedTarget(element.dataset.performanceCard ?? element.dataset.draftPopout ?? `google-trends-${element.dataset.trendsCard}`);
    if (!id || element.closest("[hidden], [data-atlas-feedback]")) return;
    const bounds = element.getBoundingClientRect();
    if (bounds.width > 0 && bounds.height > 0) targets.push({ id, bounds, element });
  });
  // Native chart dialogs are top-layer elements: their enclosing card's geometry
  // is not their expanded geometry. Use only the existing curated title-ID contract.
  doc.querySelectorAll<HTMLDialogElement>("dialog[open]:not([data-atlas-feedback])").forEach(dialog => {
    const titleId = dialog.getAttribute("aria-labelledby") ?? "";
    const id = allowedTarget(titleId.replace(/(?:-popout)?-title$/, ""));
    if (id) targets.unshift({ id, bounds: dialog.getBoundingClientRect(), element: dialog });
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

export type PickedElement = {
  element: Element;
  reference: FeedbackElementReference;
  targetId?: string;
  /** Local UI only. Never serialize a PickedElement into a request. */
  label: string;
};

/** Keep the smallest actual hit, including SVG descendants outside an actionable control. Only the local label reads a bounded name; the reference never contains it. */
export function pickElement(element: Element | null): PickedElement | undefined {
  if (!element) return;
  element = element.closest('button,a[href],[role="button"],input,select,textarea,summary') ?? element;
  if (!element.isConnected || element.closest('[data-atlas-feedback],.atlas-feedback-launch,[hidden],[inert],[aria-hidden="true"],[role="tooltip"],script,style,template')) return;
  const win = element.ownerDocument.defaultView;
  if (!win) return;
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node.tagName === "DIALOG" && !node.hasAttribute("open")) return;
    if (node.tagName === "DETAILS" && !node.hasAttribute("open") && ![...node.children].find(child => child.tagName === "SUMMARY")?.contains(element)) return;
    const style = win.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || style.contentVisibility === "hidden") return;
  }
  const bounds = element.getBoundingClientRect();
  if (!(bounds.width > 0 && bounds.height > 0)) return;
  const segments: string[] = [];
  for (let node: Element | null = element; node; node = node.parentElement) {
    const tag = node.localName.toLowerCase();
    if (!/^[a-z][a-z0-9-]{0,31}$/.test(tag)) return;
    const siblings: Element[] = node.parentElement ? [...node.parentElement.children].filter(child => child.localName === node!.localName) : [node];
    const index = siblings.indexOf(node) + 1;
    if (index < 1 || index > 10000) return;
    segments.unshift(`${tag}:nth-of-type(${index})`);
    if (segments.length > 24) return;
  }
  const selector = segments.join(" > ");
  if (selector.length > 1024) return;
  let targetId: string | undefined;
  for (let node: Element | null = element; node && !targetId; node = node.parentElement) {
    targetId = allowedTarget(node.getAttribute("data-performance-card") ?? node.getAttribute("data-draft-popout") ?? (node.hasAttribute("data-trends-card") ? `google-trends-${node.getAttribute("data-trends-card")}` : undefined));
    if (!targetId && node.tagName === "DIALOG") targetId = allowedTarget((node.getAttribute("aria-labelledby") ?? "").replace(/(?:-popout)?-title$/, ""));
  }
  const tagName = element.localName.toLowerCase();
  const explicitRole = element.getAttribute("role");
  const role = explicitRole && /^[a-z][a-z-]{0,31}$/.test(explicitRole) ? explicitRole
    : tagName === "button" ? "button" : tagName === "a" && element.hasAttribute("href") ? "link" : /^h[1-6]$/.test(tagName) ? "heading" : undefined;
  const classes = [...element.classList].filter(token => /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/.test(token)).slice(0, 8);
  return { element, reference: { selector, tagName, ...(role ? { role } : {}), ...(classes.length ? { classes } : {}) }, ...(targetId ? { targetId } : {}), label: localName(element) || (targetId ? `${tagName} · ${targetId}` : tagName) };
}

export function elementAt(doc: Document, x: number, y: number): PickedElement | undefined {
  return pickElement(doc.elementFromPoint(x, y));
}

/** Display only. Do not read live values or editable/hidden descendants. Never put this in context. */
function localName(element: Element): string {
  const shorten = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 80);
  const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false"])';
  if (element.matches(editable)) return "";
  const named = element.getAttribute("aria-label");
  if (named?.trim()) return shorten(named);
  const labelledBy = element.getAttribute("aria-labelledby")?.split(/\s+/).slice(0, 4) ?? [];
  const roots = labelledBy.length ? labelledBy.map(id => element.ownerDocument.getElementById(id)).filter((node): node is HTMLElement => !!node && !node.matches(editable)) : [element];
  let text = "", count = 0;
  for (const root of roots) {
    const walker = element.ownerDocument.createTreeWalker(root, 4);
    while (count++ < 40 && text.length < 160 && walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      if (!parent || parent.closest(`${editable},[hidden],[inert],[aria-hidden="true"],script,style,[data-atlas-feedback]`)) continue;
      const style = element.ownerDocument.defaultView!.getComputedStyle(parent);
      if (style.display !== "none" && style.visibility !== "hidden") text += ` ${walker.currentNode.nodeValue?.slice(0, 80) ?? ""}`;
    }
  }
  return shorten(text);
}
