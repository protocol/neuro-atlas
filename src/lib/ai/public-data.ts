import type { ContextRecord, JsonObject } from "./catalog";

type Shape = { [key: string]: true | Shape | [Shape] };
const fields = (names: string): Shape => Object.fromEntries(names.split(" ").map(name => [name, true]));
const source = fields("label url");
const point = fields("x y lo hi reliable");
const reading: Shape = {
  ...fields("instrument state metric value trend direction window measuredAt checkedAt seriesScale series2Label candidateMetric blocker reason"),
  series: [point], series2: [point], sources: [source], provenance: fields("query generated"),
  patentVintage: { ...fields("state value direction measuredAt candidateMetric blocker reason"), series: [point], sources: [source] },
};
const market = fields("platform ticker slug hint question url id kind");
const shapes: Record<string, Shape> = {
  company: fields("slug name hq modality interfaceDepth indication website scope logo"),
  round: fields("companySlug announcedOn datePrecision stage amountUsdM amountNativeM currency displayAmount investors sourceUrl note"),
  regulatory: fields("companySlug announcedOn datePrecision marker indication sourceUrl note"),
  investor: fields("name roundCount companyCount associatedCapitalUsdM"),
  event: fields("company slug activity stage amountUsdM date datePrecision note sourceUrl logo scope"),
  "memo-capital": fields("year usdM note"),
  measurement: {
    ...fields("id title instrument lens unit description coverage caveat checkedAt chartKind scale"),
    tracks: [{ ...fields("id label definition"), points: [fields("date datePrecision dateBasis value label sourceUrl sourceLabel note qualifier")] }],
  },
  reading,
  "legacy-reading": reading,
  hypothesis: fields("opportunitySpace title signal cascade"),
  "market-mapping": { ...fields("title match note"), primary: market, fallback: market },
  glossary: fields("expansion definition"),
};

/** Defense in depth for future source additions; absence means existing public UI data. */
export function visible(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as JsonObject;
  if (["hidden", "draft", "unlisted", "preview", "noindex"].some(key => Boolean(row[key]))) return false;
  if (row.published === false || row.public === false) return false;
  if (row.visibility !== undefined && !["public", "published"].includes(String(row.visibility))) return false;
  if (row.status !== undefined && !["public", "published", "reading", "unwired", "not_applicable"].includes(String(row.status))) return false;
  return !JSON.stringify(row.robots ?? "").toLowerCase().includes("noindex");
}
export function hasHiddenConstituent(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasHiddenConstituent);
  if (!value || typeof value !== "object") return false;
  return !visible(value) || Object.values(value).some(hasHiddenConstituent);
}
function safeScalar(value: unknown): unknown {
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  // Do not advertise non-public provider locations, credential URLs, or local source paths.
  if (/(?:impact-preview|dhr-preview|open-lab|\/admin(?:\/|$)|\/account(?:\/|$)|\/edit(?:\/|$)|\/opt\/|\.env\b)/i.test(value)) return undefined;
  if (/^(?:https?:|javascript:|data:|file:|\/\/)/i.test(value)) {
    try {
      const u = new URL(value);
      if (u.protocol !== "https:" || u.username || u.password) return undefined;
    } catch { return undefined; }
  }
  return value;
}
/** Explicit nested allowlist, never a recursive dump or schema passthrough. */
function project(value: unknown, shape: Shape): JsonObject {
  if (!visible(value)) return {};
  const row = value as JsonObject;
  const out: JsonObject = {};
  for (const [key, rule] of Object.entries(shape)) {
    if (!Object.hasOwn(row, key)) continue;
    const value = row[key];
    if (rule === true) {
      const safe = Array.isArray(value) ? value.map(safeScalar).filter(v => v !== undefined) : safeScalar(value);
      if (safe !== undefined) out[key] = safe;
    } else if (value === null) {
      out[key] = null;
    } else if (Array.isArray(rule)) {
      out[key] = Array.isArray(value) ? value.filter(visible).map(v => project(v, rule[0])) : [];
    } else if (visible(value)) {
      out[key] = project(value, rule);
    }
  }
  return out;
}
export function publicFields(value: unknown, names: string): JsonObject {
  return project(value, fields(names));
}
export function publicDefinition(value: unknown): JsonObject {
  return publicFields(value, "id label subtitle description");
}
export function publicMethodology(value: unknown): JsonObject {
  return publicFields(value, "intro attribution observedVelocity stocksAndFlows");
}
function suppressUnwired(row: JsonObject): void {
  if (row.state && row.state !== "reading") {
    for (const k of ["metric", "value", "trend", "direction", "window", "measuredAt", "series", "series2", "series2Label", "seriesScale", "sources", "provenance"]) delete row[k];
  }
  if (row.patentVintage && typeof row.patentVintage === "object") suppressUnwired(row.patentVintage as JsonObject);
}
function sourceUrls(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, v]) => ["sourceUrl", "url", "website"].includes(key) && typeof v === "string" && v.startsWith("https://") ? [v] : sourceUrls(v));
}
export function publicRecord(row: ContextRecord): ContextRecord {
  const data = project(row.data, shapes[row.type]);
  suppressUnwired(data);
  const unwired = data.state && data.state !== "reading";
  const dates = unwired ? { measuredAt: null, checkedAt: data.checkedAt ?? null, window: null } : row.dates;
  return { ...row, data, dates: publicFields(dates, Object.keys(dates).join(" ")),
    title: String(safeScalar(unwired ? String(data.candidateMetric ?? data.reason ?? data.instrument) : row.title) ?? "Source title withheld"),
    coverage: String(safeScalar(row.coverage) ?? "Coverage text withheld because it contains a non-public reference."),
    unit: safeScalar(row.unit) as string | null | undefined ?? null,
    sourceUrls: [...new Set(row.type === "investor" || row.type === "memo-capital" ? row.sourceUrls.filter(u => safeScalar(u) !== undefined) : sourceUrls(data))],
  };
}
