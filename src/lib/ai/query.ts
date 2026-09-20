import { catalog } from "./markdown";
import { jsonResponse, errorResponse } from "./http";
import type { ContextRecord } from "./catalog";

export const queryContract = {
  method: "GET", endpoint: "/api/ai/query", schemaVersion: 1,
  parameters: {
    q: "Optional case-insensitive literal substring of record title and public source data; maximum 200 characters. Not natural-language reasoning or regex.",
    section: catalog.sections.map(s => s.id),
    type: [...new Set(catalog.records.map(r => r.type))].sort(),
    scope: [...new Set(catalog.records.map(r => r.data.scope).filter((s): s is string => typeof s === "string"))].sort(),
    year: "Integer 1000–9999; source announcement/year or any series observation year. Returns whole records, not just points from that year. Review/export dates are not observation years.",
    id: "Exact record ID; cannot combine with any other parameter. Unknown ID: 404.",
    limit: "Integer 1–50, default 20", offset: "Integer 0–10000, default 0",
  },
  semantics: "All supplied filters are ANDed. Ordering is ascending record ID (code-point order), never relevance or random. Empty results and offsets past the end: 200. Duplicate/unknown parameters and invalid values: 400. Unknown resources: 404. No arbitrary URL fetch, file access, writes, live prices or LLM calls. next is null at the end. URLs are root-relative to the serving host.",
  dates: "Source-relative per record and section. Null means unspecified. measuredAt is an observation cutoff, checkedAt a review, exportGeneratedAt packaging; none is a promise of freshness.",
};
const sorted = [...catalog.records].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const searchable = new Map(sorted.map(r => [r.id, `${r.title} ${JSON.stringify(r.data)}`.toLowerCase()]));
const allowed = new Set(["q", "section", "type", "scope", "year", "id", "limit", "offset"]);

function years(record: ContextRecord): string[] {
  const values: string[] = [];
  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    for (const [k, v] of Object.entries(value)) {
      if (["announcedOn", "date", "year", "x"].includes(k) && /^(?:\d{4})(?:-|$)/.test(String(v))) values.push(String(v).slice(0, 4));
      else if (v && typeof v === "object") walk(v);
    }
  };
  walk(record.data);
  return values;
}
export function queryResponse(request: Request): Response {
  const url = new URL(request.url);
  if (url.search.length > 2048) return errorResponse(400, "Query string exceeds 2048 characters.");
  const params = url.searchParams;
  for (const name of params.keys()) {
    if (!allowed.has(name) || params.getAll(name).length !== 1) return errorResponse(400, "Unknown or duplicate query parameter.");
  }
  const value = (key: string) => params.get(key);
  const q = value("q") ?? "";
  if (q.length > 200 || /[\u0000-\u001f\u007f]/.test(q)) return errorResponse(400, "q must be at most 200 characters without control characters.");
  for (const [name, options] of [["section", queryContract.parameters.section], ["type", queryContract.parameters.type], ["scope", queryContract.parameters.scope]] as const) {
    if (params.has(name) && !options.includes(value(name)!)) return errorResponse(400, `Unknown ${name} value. See queryContract.`);
  }
  const integer = (key: string, fallback: number, min: number, max: number): number | null => {
    if (!params.has(key)) return fallback;
    const raw = value(key)!;
    if (!/^(0|[1-9]\d*)$/.test(raw)) return null;
    const n = Number(raw);
    return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
  };
  const limit = integer("limit", 20, 1, 50);
  const offset = integer("offset", 0, 0, 10000);
  const year = params.has("year") ? integer("year", 0, 1000, 9999) : undefined;
  if (limit === null || offset === null || year === null) return errorResponse(400, "Invalid integer or pagination/year bound. See /ai/.");
  const id = value("id");
  if (params.has("id")) {
    if (!id || !/^[a-z0-9-]{1,100}$/.test(id) || [...params.keys()].length !== 1) return errorResponse(400, "id must be a valid exact record ID and the only parameter.");
    if (!sorted.some(r => r.id === id)) return errorResponse(404, "Unknown record.");
  }
  const results = sorted.filter(r =>
    (!id || r.id === id) &&
    (!value("section") || r.section === value("section")) &&
    (!value("type") || r.type === value("type")) &&
    (!value("scope") || r.data.scope === value("scope")) &&
    (!q.trim() || searchable.get(r.id)!.includes(q.trim().toLowerCase())) &&
    (year === undefined || years(r).includes(String(year)))
  );
  const query = new URLSearchParams();
  if (id) query.set("id", id);
  else {
    if (q.trim()) query.set("q", q.trim().toLowerCase());
    for (const k of ["section", "type", "scope", "year"]) if (params.has(k)) query.set(k, value(k)!);
    query.set("limit", String(limit)); query.set("offset", String(offset));
  }
  const canonicalUrl = `/api/ai/query?${query}`;
  const page = results.slice(offset, offset + limit);
  let next: string | null = null;
  if (offset + page.length < results.length) {
    query.set("offset", String(offset + page.length));
    next = `/api/ai/query?${query}`;
  }
  return jsonResponse({
    schemaVersion: catalog.schemaVersion, canonicalUrl, indexUrl: "/llms.txt", guideUrl: "/ai/",
    total: results.length, returned: page.length, limit, offset, next,
    coverage: catalog.sections.filter(s => !value("section") || s.id === value("section")), queryContract, results: page,
  });
}
