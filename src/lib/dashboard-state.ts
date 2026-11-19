import { recordingViewIds, type RecordingViewId } from "@/lib/recording-view";
import { FIELD_VELOCITY_GRAPHS } from "@/data/field-velocity-links";

export const DASHBOARD_ROUTE = "/field-velocity/dashboard";
export const DASHBOARD_STORAGE = "neuro-atlas:dashboards:v1";
export const CARD_LIMIT = 8;
export const SAVE_LIMIT = 12;
export const NAME_LIMIT = 64;
const slugs = new Set(FIELD_VELOCITY_GRAPHS.map(entry => entry.slug));
export const isDashboardGraph = (value: unknown): value is string => typeof value === "string" && slugs.has(value);
export const DASHBOARD_SERIES: Readonly<Record<string, readonly string[]>> = Object.freeze(Object.assign(Object.create(null), {
  "bci-information-transfer-over-time": ["Cursor / grid control", "Endovascular switch", "Text selection / scanning", "Speech decoding", "Handwriting decoding"],
  "estimated-acquisition-efficiency-voxels-per-dollar": ["Expansion microscopy · estimates", "EM · reported-tech estimates", "mesoSPIM · optical", "PEEM · prospective"],
}));
const DASHBOARD_FITS = new Set(Object.keys(DASHBOARD_SERIES));
export type CardSettings = { recordingView?: RecordingViewId; hidden?: string[]; extrapolate?: boolean; sensory?: boolean; benchmark?: boolean; voxels?: boolean };
export type CardState = { slug: string; settings?: CardSettings };
export type DashboardState = { name: string; cards: CardState[] };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateCard(raw: unknown): CardState | null {
  if (!record(raw) || !isDashboardGraph(raw.slug) || Object.keys(raw).some(key => key !== "slug" && key !== "settings")) return null;
  if (raw.settings === undefined) return { slug: raw.slug };
  if (!record(raw.settings) || Object.keys(raw.settings).some(key => !["recordingView", "hidden", "extrapolate", "sensory", "benchmark", "voxels"].includes(key))) return null;
  const { recordingView, hidden, extrapolate, sensory, benchmark, voxels } = raw.settings;
  if (recordingView !== undefined && (raw.slug !== "simultaneous-neural-recordings" || !recordingViewIds.some(view => view === recordingView))) return null;
  const series = DASHBOARD_SERIES[raw.slug];
  if (hidden !== undefined && (!series || !Array.isArray(hidden) || hidden.length > series.length || new Set(hidden).size !== hidden.length || hidden.some(id => !series.includes(id)))) return null;
  if (extrapolate !== undefined && (typeof extrapolate !== "boolean" || !DASHBOARD_FITS.has(raw.slug))) return null;
  if (sensory !== undefined && (typeof sensory !== "boolean" || raw.slug !== "bci-information-transfer-over-time")) return null;
  if (benchmark !== undefined && (typeof benchmark !== "boolean" || !["selected-tissue-volume-checkpoints", "selected-public-image-resource-footprints", "estimated-acquisition-efficiency-voxels-per-dollar"].includes(raw.slug))) return null;
  if (voxels !== undefined && (typeof voxels !== "boolean" || raw.slug !== "selected-tissue-volume-checkpoints")) return null;
  return { slug: raw.slug, settings: { recordingView: recordingView as RecordingViewId | undefined, hidden: hidden as string[] | undefined, extrapolate, sensory, benchmark, voxels } };
}

function validateDashboard(raw: unknown): DashboardState | null {
  if (!record(raw) || Object.keys(raw).length !== 2 || typeof raw.name !== "string" || !raw.name.trim() || raw.name !== raw.name.trim() || raw.name.length > NAME_LIMIT || !Array.isArray(raw.cards) || raw.cards.length > CARD_LIMIT) return null;
  const cards = raw.cards.map(validateCard);
  if (cards.some(card => card === null)) return null;
  return { name: raw.name, cards: cards as CardState[] };
}

export function readDashboards(raw: string | null): DashboardState[] | null {
  if (raw === null) return [];
  if (raw.length > 65536) return null;
  try {
    const items: unknown = JSON.parse(raw);
    if (!Array.isArray(items) || items.length > SAVE_LIMIT) return null;
    const dashboards = items.map(validateDashboard);
    if (dashboards.some(d => d === null) || new Set(dashboards.map(d => d?.name)).size !== dashboards.length) return null;
    return dashboards as DashboardState[];
  } catch { return null; }
}

// Fragment payloads stay off the HTTP request and contain only validated dashboard state.
export function dashboardHash(snapshot: DashboardState): string {
  const bytes = new TextEncoder().encode(JSON.stringify([1, snapshot.name, snapshot.cards]));
  return "#d=" + btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function readDashboardLink(hash: string): DashboardState | null {
  if (hash.length > 8192 || !/^#d=[A-Za-z0-9_-]+$/.test(hash)) return null;
  try {
    const bytes = Uint8Array.from(atob(hash.slice(3).replace(/-/g, "+").replace(/_/g, "/")), char => char.charCodeAt(0));
    const payload: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!Array.isArray(payload) || payload.length !== 3 || payload[0] !== 1) return null;
    return validateDashboard({ name: payload[1], cards: payload[2] });
  } catch { return null; }
}
