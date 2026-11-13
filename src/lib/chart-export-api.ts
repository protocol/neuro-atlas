"use client";

/**
 * Programmatic access to the same branded PNG the Download PNG control produces.
 *
 * The export UI lives inside each chart's top-layer <dialog>, and it hands bytes
 * off through a blob <a download> / clipboard write — both of which headless and
 * CDP-driven browsers cannot open or capture. This module exposes the identical,
 * already-built image as retrievable data on `window.neuroAtlas`, so automation
 * (and any script) can pull every chart without driving the dialog or a download
 * sink. It reuses buildChartImage/chartPng verbatim — no second rendering path.
 *
 * Usage (from a page console / automation eval):
 *   await window.neuroAtlas.exportChart("citation-latency") // one open chart
 *   await window.neuroAtlas.exportAll()                     // opens each, exports
 *   window.neuroAtlas.charts()                              // anchors + titles
 */

import { buildChartImage, chartPng, type ChartExport } from "@/lib/chart-export";
import { FIELD_VELOCITY_LINKS, canonicalPerformanceAnchor } from "@/data/field-velocity-links";

type Registration = { title: string; getChart: () => ChartExport };
export type ExportedChart = { anchor: string; title: string; filename: string; url: string; width: number; height: number; pngBase64: string };

/** Only mounted ChartShare controls register, so a registered anchor always has a laid-out, exportable SVG. */
const registry = new Map<string, Registration>();

const chartAnchors = () => FIELD_VELOCITY_LINKS.filter(link => link.kind === "chart").map(link => link.slug);

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

async function exportChart(anchor: string): Promise<ExportedChart> {
  const slug = canonicalPerformanceAnchor(anchor);
  const entry = registry.get(slug);
  if (!entry) throw new Error(`Chart "${slug}" is not open. Set location.hash to "#${slug}" (or call exportAll) so its panel mounts, then retry.`);
  const image = buildChartImage(entry.getChart(), window.location.href);
  const png = await chartPng(image);
  return { anchor: slug, title: image.title, filename: `neuro-atlas-${slug}.png`, url: image.url, width: image.width, height: image.height, pngBase64: await blobToBase64(png) };
}

/** Wait a bounded number of frames for the hash-opened panel to mount and register. */
function waitForRegistration(slug: string, frames = 40) {
  return new Promise<boolean>(resolve => {
    const tick = (left: number) => {
      if (registry.has(slug)) return resolve(true);
      if (left <= 0) return resolve(false);
      requestAnimationFrame(() => tick(left - 1));
    };
    tick(frames);
  });
}

/** Open each chart's panel by hash in turn, export it, and restore the original location. */
async function exportAll(): Promise<{ exported: ExportedChart[]; skipped: string[] }> {
  const previousHash = window.location.hash;
  const exported: ExportedChart[] = [];
  const skipped: string[] = [];
  try {
    for (const slug of chartAnchors()) {
      if (!registry.has(slug)) {
        window.location.hash = "";
        window.location.hash = slug;
        window.dispatchEvent(new HashChangeEvent("hashchange"));
        if (!(await waitForRegistration(slug))) { skipped.push(slug); continue; }
      }
      try { exported.push(await exportChart(slug)); }
      catch { skipped.push(slug); }
    }
  } finally {
    window.location.hash = previousHash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  return { exported, skipped };
}

function install() {
  if (typeof window === "undefined") return;
  const existing = (window as unknown as { neuroAtlas?: { version?: number } }).neuroAtlas;
  if (existing?.version === 1) return;
  (window as unknown as { neuroAtlas?: unknown }).neuroAtlas = {
    version: 1,
    charts: () => FIELD_VELOCITY_LINKS.filter(link => link.kind === "chart").map(link => ({ anchor: link.slug, title: link.title, open: registry.has(link.slug) })),
    exportChart,
    exportAll,
  };
}

/** Make window.neuroAtlas available before any chart panel opens, so exportAll can bootstrap. */
export function installChartExportApi() {
  install();
}

export function registerChart(anchor: string, registration: Registration) {
  if (typeof window === "undefined") return;
  registry.set(canonicalPerformanceAnchor(anchor), registration);
  install();
}

export function unregisterChart(anchor: string) {
  registry.delete(canonicalPerformanceAnchor(anchor));
}
