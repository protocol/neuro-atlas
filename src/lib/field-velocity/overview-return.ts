import { nativeOverviewPath } from "@/lib/field-velocity/graph-navigation";

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
function scopedOverview(win: Window, snapshot?: OverviewSnapshot) {
  if (!snapshot?.href || !snapshot.href.startsWith("/") || snapshot.href.startsWith("//")) return null;
  const url = new URL(snapshot.href, win.location.origin);
  if (url.origin !== win.location.origin || url.pathname !== nativeOverviewPath) return null;
  return snapshot;
}
function ticket(win: Window, kind: "graph" | "overview", href: string, snapshot: OverviewSnapshot) {
  try { win.sessionStorage.setItem(ticketKey, JSON.stringify({ kind, href, snapshot, time: Date.now() })); }
  catch { /* Back works from history state; the arrow retains its category fallback. */ }
}
function takeTicket(win: Window, kind: "graph" | "overview") {
  try {
    const pending = JSON.parse(win.sessionStorage.getItem(ticketKey) ?? "null");
    if (pending?.kind !== kind || pending?.href !== currentHref(win)) return null;
    win.sessionStorage.removeItem(ticketKey);
    return Date.now() - pending.time < 120_000 ? scopedOverview(win, pending.snapshot) : null;
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
