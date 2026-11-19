import { nativeOverviewPath } from "@/lib/field-velocity/graph-navigation";
import { fieldVelocityGraph, GRAPH_GROUP_ANCHORS } from "@/data/field-velocity-links";

export type OverviewSnapshot = {
  href: string; query: string; groups: Record<string, "full" | "collapsed">;
  rails: Record<string, number>; scrollY: number; anchor: string;
};
const entryKey = "atlasOverviewReturn";
const originKey = "atlasOverviewOrigin";
const ticketKey = "atlasGraphReturnTicket";
const currentHref = (win: Window) => win.location.pathname + win.location.search + win.location.hash;

function putEntry(win: Window, key: string, snapshot: OverviewSnapshot) {
  win.history.replaceState({ ...win.history.state, [key]: snapshot }, "");
}
const railIds = new Set(Object.keys(GRAPH_GROUP_ANCHORS).map(id => `metric-category-${id}-charts`));
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const offset = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10_000_000;

/** History and tab-local storage are untrusted, versionless input: accept all fields or none. */
function scopedOverview(win: Window, snapshot: unknown): OverviewSnapshot | null {
  if (!record(snapshot) || typeof snapshot.href !== "string" || snapshot.href.length > 8192 || !snapshot.href.startsWith("/") || snapshot.href.startsWith("//") || snapshot.href.includes("\\")) return null;
  if (typeof snapshot.query !== "string" || snapshot.query.length > 2000 || typeof snapshot.anchor !== "string" || !fieldVelocityGraph(snapshot.anchor) || !offset(snapshot.scrollY)) return null;
  if (!record(snapshot.groups) || !record(snapshot.rails)) return null;
  const groups = Object.entries(snapshot.groups), rails = Object.entries(snapshot.rails);
  if (groups.length > 10 || groups.some(([key, value]) => !key || key.length > 120 || ["__proto__", "constructor", "prototype"].includes(key) || (value !== "full" && value !== "collapsed"))) return null;
  if (rails.length > railIds.size || rails.some(([key, value]) => !railIds.has(key) || !offset(value))) return null;
  try {
    const url = new URL(snapshot.href, win.location.origin);
    if (url.origin !== win.location.origin || url.pathname !== nativeOverviewPath) return null;
  } catch { return null; }
  return { href: snapshot.href, query: snapshot.query, anchor: snapshot.anchor, scrollY: snapshot.scrollY,
    groups: Object.fromEntries(groups) as OverviewSnapshot["groups"], rails: Object.fromEntries(rails) as OverviewSnapshot["rails"] };
}
function ticket(win: Window, kind: "graph" | "overview", href: string, snapshot: OverviewSnapshot) {
  try { win.sessionStorage.setItem(ticketKey, JSON.stringify({ kind, href, snapshot, time: Date.now() })); }
  catch { /* Back works from history state; the arrow retains its category fallback. */ }
}
function takeTicket(win: Window, kind: "graph" | "overview") {
  try {
    const raw = win.sessionStorage.getItem(ticketKey);
    if (!raw || raw.length > 32768) return null;
    const pending = JSON.parse(raw);
    if (pending?.kind !== kind || pending?.href !== currentHref(win)) return null;
    win.sessionStorage.removeItem(ticketKey);
    const age = Date.now() - pending.time;
    return typeof pending.time === "number" && Number.isFinite(pending.time) && age >= 0 && age < 120_000 ? scopedOverview(win, pending.snapshot) : null;
  } catch { return null; }
}

export function captureOverviewDeparture(win: Window, destination: string, anchor: string) {
  if (win.location.pathname !== nativeOverviewPath) return;
  const doc = win.document;
  const snapshot: OverviewSnapshot = {
    href: currentHref(win), anchor, scrollY: win.scrollY,
    query: doc.querySelector<HTMLInputElement>("#metrics-search")?.value ?? "",
    groups: Object.fromEntries([...doc.querySelectorAll<HTMLElement>("[data-metrics-category]")]
      .map(group => [group.dataset.metricsCategory, (group.dataset.metricPreference ?? group.dataset.metricState) === "collapsed" ? "collapsed" : "full"])),
    rails: Object.fromEntries([...doc.querySelectorAll<HTMLElement>("[data-metric-rail]")].map(rail => [rail.id, rail.scrollLeft])),
  };
  putEntry(win, entryKey, snapshot);
  ticket(win, "graph", destination, snapshot);
}
export function readOverviewReturn(win: Window) {
  const fresh = takeTicket(win, "overview");
  if (fresh) putEntry(win, entryKey, fresh);
  const snapshot = fresh ?? scopedOverview(win, win.history.state?.[entryKey]);
  return snapshot?.href === currentHref(win) ? snapshot : null;
}
export function graphOrigin(win: Window) {
  return scopedOverview(win, win.history.state?.[originKey]);
}
export function claimGraphOrigin(win: Window) {
  const fresh = takeTicket(win, "graph");
  if (fresh) putEntry(win, originKey, fresh);
  return fresh ?? graphOrigin(win);
}
export function prepareOverviewReturn(win: Window) {
  const snapshot = claimGraphOrigin(win);
  if (snapshot) ticket(win, "overview", snapshot.href, snapshot);
  return snapshot?.href;
}
