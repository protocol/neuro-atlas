"use client";

import { buildChartImage, chartPng, type ChartExport } from "@/lib/chart-export";
import { FIELD_VELOCITY_GRAPHS, canonicalPerformanceAnchor, fieldVelocityGraph, graphPath, type FieldVelocityGraph } from "@/data/field-velocity-links";
import { atlasPathname } from "@/lib/atlas-path";

type Registration = { title: string; getChart: () => ChartExport };
export type ExportedChart = { anchor: string; title: string; filename: string; url: string; width: number; height: number; pngBase64: string };
export type GraphExportRequest = { id: number; entry: FieldVelocityGraph; url: string };
const visible = new Map<string, Map<symbol, Registration>>();
const hosted = new Map<number, Registration>();
const activeRegistration = (slug: string) => Array.from(visible.get(slug)?.values() ?? []).at(-1);
const hosts = new Set<symbol>();
const listeners = new Set<() => void>();
let request: GraphExportRequest | null = null;
let requestId = 0;
let queue: Promise<unknown> = Promise.resolve();

export function subscribeGraphExport(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const currentGraphExport = () => request;
function publish(next: GraphExportRequest | null) {
  request = next;
  for (const listener of listeners) listener();
}
export function attachGraphExportHost() {
  const owner = Symbol();
  hosts.add(owner);
  installChartExportApi();
  return () => {
    hosts.delete(owner);
    if (!hosts.size) publish(null);
  };
}

/** A bounded wait which also terminates in background tabs or after route unmount. */
async function waitFor(get: () => Registration | undefined, active = () => true, timeout = 4000) {
  const deadline = Date.now() + timeout;
  while (active() && Date.now() < deadline) {
    const entry = get();
    if (entry) return entry;
    await new Promise(resolve => setTimeout(resolve, 16));
  }
}
export function whenChartRegistered(anchor: string) {
  return waitFor(() => activeRegistration(canonicalPerformanceAnchor(anchor)));
}
export function hasGraphExportHost() { return hosts.size > 0; }

const isDetailPath = (entry: FieldVelocityGraph, pathname: string) => atlasPathname(pathname) === graphPath(entry);

export function withGraphExport<T>(anchor: string, run: (getChart: () => ChartExport, url: string) => T | Promise<T>, url = window.location.href): Promise<T> {
  const entry = fieldVelocityGraph(anchor);
  if (!entry) return Promise.reject(new Error("Unknown graph"));
  const fromDetail = isDetailPath(entry, window.location.pathname);
  const notReady = () => new Error(`Graph not ready to export: ${entry.slug}`);
  // An unavailable detail at invocation must not become exportable while queued.
  if (fromDetail && !activeRegistration(entry.slug)) return Promise.reject(notReady());
  const owner = Array.from(hosts).at(-1);
  const job = async () => {
    const { slug } = entry;
    const live = activeRegistration(slug);
    if (live) return run(live.getChart, url);
    if (!owner || !hosts.has(owner)) throw new Error(`Graph export host unavailable: ${slug}`);
    // A detail that lost its registration must not fall back to a default graph.
    if (fromDetail || isDetailPath(entry, new URL(url).pathname) || isDetailPath(entry, window.location.pathname)) {
      throw notReady();
    }
    const active = { id: ++requestId, entry, url };
    publish(active);
    try {
      const registration = await waitFor(() => hosted.get(active.id), () => request === active && hosts.has(owner));
      if (!registration) throw new Error(`Graph did not register for export: ${slug}`);
      return await run(registration.getChart, url);
    } finally {
      hosted.delete(active.id);
      if (request === active) publish(null);
    }
  };
  const result = queue.then(job);
  queue = result.catch(() => {});
  return result;
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
async function exportChart(anchor: string, url = window.location.href): Promise<ExportedChart> {
  return withGraphExport(anchor, async (getChart, current) => {
    // Resolve the live registration and freeze the validated SVG before any raster await.
    const { title, filename, url, width, height, svg } = buildChartImage(getChart(), current);
    const png = await chartPng({ title, filename, url, width, height, svg });
    return { anchor: canonicalPerformanceAnchor(anchor), title, filename, url, width, height, pngBase64: await blobToBase64(png) };
  }, url);
}
async function exportAll(): Promise<{ exported: ExportedChart[]; skipped: string[] }> {
  const { href: url, pathname } = window.location;
  // The loop reaches later graphs after awaits, possibly after the detail changed.
  const unreadyDetail = FIELD_VELOCITY_GRAPHS.find(entry => isDetailPath(entry, pathname) && !activeRegistration(entry.slug));
  const exported: ExportedChart[] = [], skipped: string[] = [];
  for (const entry of FIELD_VELOCITY_GRAPHS) {
    const { slug } = entry;
    if (entry === unreadyDetail) { skipped.push(slug); continue; }
    try { exported.push(await exportChart(slug, url)); }
    catch { skipped.push(slug); }
  }
  return { exported, skipped };
}

/** Public API uses the same full renderer and image serialization as the chart controls. */
export function installChartExportApi() {
  if (typeof window === "undefined") return;
  const win = window as unknown as { neuroAtlas?: { version: number } };
  if (win.neuroAtlas?.version === 1) return;
  const api = {
    version: 1,
    charts: () => FIELD_VELOCITY_GRAPHS.map(({ slug, title }) => ({ anchor: slug, title, open: !!activeRegistration(slug) })),
    exportChart: (anchor: string) => exportChart(anchor),
    exportAll,
  };
  win.neuroAtlas = api;
}

export function registerChart(anchor: string, registration: Registration, requestId?: number) {
  if (requestId !== undefined) {
    if (request?.id === requestId && request.entry.slug === canonicalPerformanceAnchor(anchor)) hosted.set(requestId, registration);
    return () => { if (hosted.get(requestId) === registration) hosted.delete(requestId); };
  }
  const slug = canonicalPerformanceAnchor(anchor);
  const registrations = visible.get(slug) ?? new Map<symbol, Registration>();
  visible.set(slug, registrations);
  const owner = Symbol();
  registrations.set(owner, registration);
  installChartExportApi();
  return () => {
    registrations.delete(owner);
    if (!registrations.size) visible.delete(slug);
  };
}
