import { z } from "zod";

export type PublicationCell = string | number | null | boolean;
export type PublicationTable = { columns: { name: string; type: string }[]; rows: PublicationCell[][] };


export const PUBLICATION_ANCHORS = ["publication-output", "publication-growth", "researcher-sectors", "researcher-sector-changes"] as const;
export type PublicationAnchor = typeof PUBLICATION_ANCHORS[number];
export const PUBLICATION_SECTORS = ["Academic", "Industry", "Other institutions", "No listed affiliation"] as const;
export const PUBLICATION_GROWTH_GROUPS = [
  { table: "neurotech_topics_table", label: "Method", groups: ["Invasive", "Ultrasound, TMS and MEG", "EEG", "No technique named"], authorBased: false },
  { table: "neurotech_bciflag_table", label: "Brain-computer interface", groups: ["About BCI", "Not about BCI"], authorBased: false },
  { table: "neurotech_venues_table", label: "Venue", groups: ["Journal", "Conference", "Preprint"], authorBased: false },
  { table: "neurotech_regions_table", label: "Region", groups: ["Asia", "North America", "Europe"], authorBased: true },
  { table: "neurotech_institutions_table", label: "Institution", groups: ["Universities", "Companies", "National institutes"], authorBased: true },
  { table: "neurotech_career_table", label: "Career stage", groups: ["Early career (1-5 years)", "Mid career (6-15 years)", "Late career (16+ years)"], authorBased: true },
  { table: "neurotech_pedigree_table", label: "Citation rank", groups: ["Top 1%", "Top 1-10%", "Top 10-50%"], authorBased: true },
] as const;
export const PUBLICATION_TABLE_NAMES = ["nt_yearly", ...PUBLICATION_GROWTH_GROUPS.map(group => group.table), "nt_talent_table", "nt_talent_moves", "nt_talent_endpoints"] as const;
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const percent = z.number().finite().min(-100).max(1e7);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s, "Invalid calendar date");
const identity = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/);
const columns = (names: readonly string[]) => names.map(name => ({ name, type: ["year", "series", "group", "place", "from"].includes(name) ? "string" : "number" }));
const YEARLY_COLUMNS = columns(["year", "series", "papers"]);
const GROWTH_COLUMNS = columns(["group", "y2022", "ylast", "g", "place"]);
const TALENT_COLUMNS = columns(["group", "a2022", "alast", "growth", "new", "other", "back"]);
const MOVE_COLUMNS = columns(["from", "to0", "to1", "to2", "to3"]);
function tableSchema(expected: ReturnType<typeof columns>, row: z.ZodType) {
  return z.object({ columns: z.array(z.object({ name: z.string(), type: z.string() }).strict()).refine(actual => JSON.stringify(actual) === JSON.stringify(expected), "Unexpected source columns"), rows: z.array(row).min(1).max(100) }).strict();
}
const growthSchemas = Object.fromEntries(PUBLICATION_GROWTH_GROUPS.map(group => [group.table, tableSchema(GROWTH_COLUMNS,
  z.tuple([z.enum(group.groups), count, count, percent.nullable(), z.null()]))]));
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const timestamp = z.iso.datetime({ offset: true });
const sourceUpdated = z.union([day, timestamp, z.iso.datetime({ local: true })]).nullable();
const dimension = z.enum(["region", "institution_type", "career_stage", "pedigree"]);
const nonnegative = z.number().finite().min(0).max(1e15);
const fractionalGroup = z.enum(["Asia", "North America", "Europe", "Rest of world", "Universities", "Companies", "National institutes", "Other institutions", "Early career (1-5 years)", "Mid career (6-15 years)", "Late career (16+ years)", "Top 1%", "Top 1-10%", "Top 10-50%", "Bottom 50%", "Unknown"]);
const exactInteger = z.union([count, z.string().max(4096).regex(/^(?:0|[1-9]\d*)$/)]);
const ratio = z.tuple([exactInteger, exactInteger]).refine(([, denominator]) => BigInt(denominator) > BigInt(0), "Positive exact denominator required");
const affiliationEndpointCohortSchema = z.object({
  methodId: z.literal("atlas-publication-affiliation-endpoints-v1"), firstYearMin: z.literal(2016), lastYearMax: z.literal(2025), minActiveYears: z.literal(2),
  eligibleAuthors: count, sameSectorAuthors: count, changedSectorAuthors: count,
}).strict();
const endpointTableSchema = tableSchema(MOVE_COLUMNS, z.tuple([z.enum(PUBLICATION_SECTORS), count, count, count, count]));
const endpointCapabilitySchema = z.object({ tables: z.object({ nt_talent_endpoints: endpointTableSchema }), audit: z.object({ affiliationEndpointCohort: affiliationEndpointCohortSchema }) });
/** After ordinary validation, reject capability regression; never splice acquisitions. */
export function assertPublicationEndpointCompatibility(previous: unknown, candidate: unknown): void {
  if (endpointCapabilitySchema.safeParse(previous).success && !endpointCapabilitySchema.safeParse(candidate).success) {
    throw new Error("Publication source lacks the complete affiliation endpoint cohort; retaining last-good acquisition");
  }
}
const auditSchema = z.object({
  paperCohort: z.object({ topics: z.tuple([z.literal("T10429"), z.literal("T11601"), z.literal("T10614"), z.literal("T10958"), z.literal("T12015"), z.literal("T11993"), z.literal("T10094"), z.literal("T10581"), z.literal("T10241"), z.literal("T10919")]), firstYear: z.literal(2010), lastYear: z.literal(2025), works: count, counting: z.literal("one-openalex-work-id") }).strict(),
  authorCohort: z.object({ topics: z.tuple([z.literal("T10429"), z.literal("T11601")]), firstYear: z.literal(2000), lastYear: z.literal(2025), works: count, authors: count, unidentifiedBylineSlots: count, duplicateIdentifiedBylineSlots: count.optional(), worksWithoutBylines: count }).strict(),
  affiliationEndpointCohort: affiliationEndpointCohortSchema.optional(),
  coverage: z.array(z.object({ dimension, year: z.number().int().min(2022).max(2025), quarter: z.number().int().min(1).max(4), total: nonnegative, known: nonnegative, unknown: nonnegative, knownShare: z.number().min(0).max(1), scale: nonnegative.nullable() }).strict()).max(64),
  quarterlyFractionalOutput: z.array(z.object({ dimension, year: z.number().int().min(2022).max(2025), quarter: z.number().int().min(1).max(4), group: fractionalGroup, rawFraction: ratio, scaledFraction: ratio.nullable() }).strict()).max(1024),
  baselineStatus: z.enum(["not-supplied", "primary-four-domain-context"]),
  matchedBaselineStatus: z.enum(["not-supplied", "partial-primary-matched-inventory"]),
}).strict();
export const MATCHED_GROWTH_IDS = ["invasive", "high", "eeg", "no-technique", "bci", "not-bci", "journal", "conference", "preprint", "asia", "us-canada", "europe", "education", "company", "government-facility", "early", "mid", "late", "top-1", "top-1-10", "top-10-50"] as const;
const fractionalCount = z.union([nonnegative, z.string().max(8193).regex(/^(?:0|[1-9]\d{0,4095})(?:\/(?:[1-9]\d{0,4095})|\.\d{1,18})?$/)]).refine(value => Number.isFinite(countValue(value)) && countValue(value) >= 0 && countValue(value) <= 1e15, "Invalid exact fractional count");
function countValue(value: number | string): number {
  if (typeof value === "number") return value;
  const [numerator, denominator] = value.split("/");
  if (denominator === undefined) return Number(numerator);
  const n = BigInt(numerator), d = BigInt(denominator);
  if (d === BigInt(0)) return Number.NaN;
  const numericNumerator = Number(n), numericDenominator = Number(d);
  if (Number.isFinite(numericNumerator) && Number.isFinite(numericDenominator)) return numericNumerator / numericDenominator;
  const precision = BigInt("1000000000000000000");
  return Number(n / d) + Number((n % d) * precision / d) / Number(precision);
}
const numeratorCounts = z.object({ "2022": fractionalCount, "2025": fractionalCount }).strict();
const endpointCounts = z.object({ "2022": nonnegative, "2025": nonnegative }).strict();
const primaryQueryUrl = z.string().max(4096).url().refine(value => {
  const url = new URL(value);
  const filters = ["publication_year:2022|2025", "type:article|review|conference-paper|book-chapter|preprint", "primary_topic.id:T10429|T11601", "authorships.institutions.continent:asia", "authorships.institutions.continent:europe", "authorships.countries:us|ca", "authorships.institutions.type:government|facility"];
  const groupings = ["publication_year", "publication_year,authorships.institutions.type:include_unknown", "publication_year,type,primary_location.source.type:include_unknown"];
  return url.origin === "https://api.openalex.org" && url.pathname === "/works" && !url.username && !url.password && !url.hash && [...url.searchParams.entries()].every(([key, value]) => url.searchParams.getAll(key).length === 1 && (key === "filter" ? value.split(",").every(part => filters.includes(part)) : key === "group_by" ? groupings.includes(value) : key === "per_page" && value === "100"));
}, "Expected credential-free aggregate OpenAlex query");
const receiptKeys = ["asia-n", "asia-d", "europe-n", "europe-d", "us-canada-n", "us-canada-d", "institutions-n", "institutions-d", "government-facility-n", "government-facility-d", "venue-d", "venue-n"] as const;
const evidenceSchema = z.union([
  z.object({ retrievedAt: timestamp, url: primaryQueryUrl, responseSha256: sha256, sourceSha256: sha256.nullable().optional() }).strict(),
  z.object({ workCount: count, selection: z.literal("NT10-v1"), completeYears: z.tuple([z.literal("2022"), z.literal("2025")]), normalizedInputSha256: sha256 }).strict(),
]);
const matchedGrowthSchema = z.object({
  schemaVersion: z.literal(1), method: z.literal("atlas-matched-indexed-works-v1"),
  measurement: z.object({ countUnit: z.literal("OpenAlex work ID"), identity: z.literal("one indexed work ID; no title collapse"), corpus: z.literal("OpenAlex default core (no expansion)"), years: z.tuple([z.literal("2022"), z.literal("2025")]), types: z.tuple([z.literal("article"), z.literal("review"), z.literal("conference-paper"), z.literal("book-chapter"), z.literal("preprint")]), affiliations: z.literal("whole-work involvement; nonexclusive groups"), union: z.literal("government|facility OR query; never bucket sum") }).strict(),
  rows: z.array(z.object({
    id: z.enum(MATCHED_GROWTH_IDS), label: z.string().min(1).max(80), dimension: z.enum(["method", "venue", "region", "institution", "author"]), baselineStatus: z.enum(["matched", "unavailable"]),
    reason: z.string().min(1).max(1024), countingMethod: identity, denominatorUniverse: z.string().min(1).max(1024), numeratorUniverse: z.string().min(1).max(1024),
    numeratorCounts: numeratorCounts.nullable(), referenceCounts: endpointCounts.nullable(), evidence: z.array(identity).max(32), countUnit: z.enum(["OpenAlex work ID", "author-fractional works"]),
    neuroGrowthPct: percent.nullable(), referenceGrowthPct: percent.nullable(), shares: z.object({ "2022": z.number().min(0).max(1).nullable(), "2025": z.number().min(0).max(1).nullable() }).strict().nullable(),
    relativeShareGrowthPct: percent.nullable(), growthGapPercentagePoints: z.number().finite().min(-1e7).max(1e7).nullable(),
  }).strict()).length(21),
  venueDenominatorDetail: z.object({ Journal: endpointCounts, Conference: endpointCounts, Preprint: endpointCounts, "Book chapter": endpointCounts }).strict(),
  evidence: z.partialRecord(z.enum(receiptKeys), evidenceSchema), completeMatchedInventory: z.literal(false),
}).strict();
export type MatchedGrowthRow = z.infer<typeof matchedGrowthSchema>["rows"][number];
const contract = z.object({ schemaVersion: z.literal(2), source: z.object({
  url: z.literal("https://api.openalex.org"), capturedAt: timestamp, paperAsOf: day, authorAsOf: day, observedThrough: day,
  baselineYear: z.literal(2022), paperEndYear: z.literal(2025), authorEndYear: z.literal(2025),
  methodologyVersion: z.literal("atlas-primary-publications-v1"), methodSha256: sha256, sourceHash: sha256,
  testOnly: z.boolean(), corpus: z.literal("core"), worksMaxUpdatedDate: sourceUpdated, authorsMaxUpdatedDate: sourceUpdated,
  inputByteHashes: z.object({ works: sha256.nullable(), author_histories: sha256.nullable() }).strict(),
  coveragePolicy: z.object({ minimum_known_share: z.object({ region: z.number().positive().max(1), institution_type: z.number().positive().max(1), career_stage: z.number().positive().max(1), pedigree: z.number().positive().max(1) }).strict() }).strict(),
  scienceBaseline: z.object({ methodId: z.literal("openalex-primary-domain-work-count-v1"), acquiredAt: timestamp, sourceHash: sha256, url: z.literal("https://api.openalex.org") }).strict().optional(),
}).strict(), tables: z.object({
  nt_yearly: tableSchema(YEARLY_COLUMNS, z.tuple([z.string().regex(/^(201\d|202[0-5])$/), z.enum(["Neurotech papers", "All research", "Science baseline, low", "Science baseline, high"]), count])),
  ...growthSchemas,
  nt_talent_table: tableSchema(TALENT_COLUMNS, z.tuple([z.enum(PUBLICATION_SECTORS), count, count, percent.nullable(), count, z.number().min(0).max(100).nullable(), z.number().min(0).max(100).nullable()])),
  nt_talent_moves: tableSchema(MOVE_COLUMNS, z.tuple([z.enum(PUBLICATION_SECTORS), count.nullable(), count.nullable(), count.nullable(), count.nullable()])),
  nt_talent_endpoints: endpointTableSchema.optional(),
}).strict(), audit: auditSchema, matchedGrowth: matchedGrowthSchema.optional() }).strict();
export type PublicationSnapshot = Omit<z.infer<typeof contract>, "tables"> & { tables: Record<string, PublicationTable> };
function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid publication snapshot: ${message}`);
}
function exactKeys(actual: string[], expected: readonly string[], name: string) {
  requireCondition(actual.length === expected.length && new Set(actual).size === actual.length && expected.every(key => actual.includes(key)), `${name}: incomplete or duplicate source rows`);
}
const close = (actual: number | null, expected: number | null, tolerance = 1e-7) => actual === null || expected === null ? actual === expected : Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected));
const growthPct = (start: number, end: number) => start ? (end / start - 1) * 100 : null;
function validateMatchedGrowth(matched: NonNullable<PublicationSnapshot["matchedGrowth"]>) {
  exactKeys(matched.rows.map(row => row.id), MATCHED_GROWTH_IDS, "matchedGrowth");
  const groups = PUBLICATION_GROWTH_GROUPS.flatMap(section => section.groups);
  for (const row of matched.rows) {
    const i = MATCHED_GROWTH_IDS.indexOf(row.id);
    const label = row.id === "us-canada" ? "US and Canada" : row.id === "government-facility" ? "Government agencies and research facilities" : groups[i];
    const dim = i < 6 ? "method" : i < 9 ? "venue" : i < 12 ? "region" : i < 15 ? "institution" : "author";
    requireCondition(row.label === label && row.dimension === dim, "matched group identity mismatch");
    requireCondition(row.countUnit === (dim === "author" ? "author-fractional works" : "OpenAlex work ID"), "matched count unit mismatch");
    if (row.numeratorCounts && dim !== "author") requireCondition(Object.values(row.numeratorCounts).every(value => Number.isSafeInteger(countValue(value))), "whole-work numerator must be integer");
    if (row.referenceCounts) requireCondition(Object.values(row.referenceCounts).every(Number.isSafeInteger), "whole-work reference must be integer");
    if (dim === "method" || dim === "author") requireCondition(row.baselineStatus === "unavailable" && row.referenceCounts === null, "comparable method/author denominator is unestablished");
    const n = row.numeratorCounts ? { "2022": countValue(row.numeratorCounts["2022"]), "2025": countValue(row.numeratorCounts["2025"]) } : null, d = row.referenceCounts;
    if (row.baselineStatus === "matched") {
      requireCondition(i >= 6 && i < 15 && n && d, "matched row needs both comparable count series");
      requireCondition(row.countingMethod === matched.method && row.numeratorUniverse === (dim === "venue" ? "NT10" : "P2"), "matched numerator scope mismatch");
      requireCondition(row.evidence.length > 0, "matched evidence required");
    }
    if (n && d) requireCondition(n["2022"] <= d["2022"] && n["2025"] <= d["2025"], "numerator exceeds reference");
    const ng = n ? growthPct(n["2022"], n["2025"]) : null;
    const dg = d ? growthPct(d["2022"], d["2025"]) : null;
    requireCondition(close(row.neuroGrowthPct, ng) && close(row.referenceGrowthPct, dg), "matched growth/count disagreement");
    requireCondition(close(row.growthGapPercentagePoints, ng !== null && dg !== null ? ng - dg : null), "growth gap disagreement");
    if (n && d) {
      requireCondition(row.shares !== null, "matched shares missing");
      for (const y of ["2022", "2025"] as const) requireCondition(close(row.shares[y], d[y] ? n[y] / d[y] : null), "matched share disagreement");
    } else requireCondition(row.shares === null, "unavailable share must be null");
    const relative = n && d && n["2022"] && d["2022"] && d["2025"] ? (n["2025"] * d["2022"] / (d["2025"] * n["2022"]) - 1) * 100 : null;
    requireCondition(close(row.relativeShareGrowthPct, relative), "relative share disagreement");
  }
}
/** Fail closed. Only anonymous, enumerated aggregates are accepted; raw payloads/names never pass. */
export function parsePublicationSnapshot(input: unknown, options: { allowTestFixture?: boolean } = {}): PublicationSnapshot {
  const value = contract.parse(input) as PublicationSnapshot;
  requireCondition(!value.source.testOnly || options.allowTestFixture === true, "test-only data requires explicit fixture allowance");
  requireCondition(value.source.paperAsOf <= value.source.capturedAt.slice(0, 10) && value.source.authorAsOf <= value.source.capturedAt.slice(0, 10), "acquisition date exceeds capture date");
  requireCondition(value.source.observedThrough >= "2025-12-31" && value.source.observedThrough <= value.source.paperAsOf && value.source.observedThrough <= value.source.authorAsOf, "incomplete or future observation cutoff");
  requireCondition(!value.source.worksMaxUpdatedDate || value.source.worksMaxUpdatedDate.slice(0, 10) <= value.source.paperAsOf, "work update exceeds acquisition");
  requireCondition(!value.source.authorsMaxUpdatedDate || value.source.authorsMaxUpdatedDate.slice(0, 10) <= value.source.authorAsOf, "author update exceeds acquisition");
  requireCondition(value.audit.baselineStatus === (value.source.scienceBaseline ? "primary-four-domain-context" : "not-supplied"), "context status mismatch");
  const coverageKeys = new Set<string>();
  for (const row of value.audit.coverage) {
    const key = `${row.dimension}:${row.year}:${row.quarter}`;
    requireCondition(!coverageKeys.has(key), "duplicate coverage cell"); coverageKeys.add(key);
    requireCondition(row.known > 0 && row.total > 0 && close(row.total, row.known + row.unknown) && close(row.knownShare, row.known / row.total) && close(row.scale, row.total / row.known), "inconsistent coverage totals");
    requireCondition(row.knownShare >= value.source.coveragePolicy.minimum_known_share[row.dimension], "coverage threshold not met");
  }
  const fractionKeys = new Set<string>();
  for (const row of value.audit.quarterlyFractionalOutput) {
    const key = `${row.dimension}:${row.year}:${row.quarter}:${row.group}`;
    requireCondition(!fractionKeys.has(key), "duplicate fractional cell"); fractionKeys.add(key);
    const section = { region: 3, institution_type: 4, career_stage: 5, pedigree: 6 }[row.dimension];
    const extra = { region: "Rest of world", institution_type: "Other institutions", career_stage: "Unknown", pedigree: "Bottom 50%" }[row.dimension];
    requireCondition(row.group === "Unknown" || row.group === extra || (PUBLICATION_GROWTH_GROUPS[section].groups as readonly string[]).includes(row.group), "fractional dimension/group mismatch");
    requireCondition((row.group === "Unknown") === (row.scaledFraction === null), "unknown fraction must stay unscaled");
    requireCondition([...row.rawFraction, ...(row.scaledFraction ?? [])].every(value => typeof value === "string" || Number.isSafeInteger(value)), "fractional ratios must use integers");
  }
  for (const name of [...PUBLICATION_GROWTH_GROUPS.map(group => group.table), "nt_talent_table"]) for (const row of value.tables[name].rows) {
    requireCondition((row[3] === null || Number(row[1]) === 0 ? row[3] === null && Number(row[1]) === 0 : Math.abs(Number(row[3]) - growthPct(Number(row[1]), Number(row[2]))!) <= 0.051), "undefined or inconsistent aggregate growth");
  }
  if (value.audit.matchedBaselineStatus === "partial-primary-matched-inventory") requireCondition(value.matchedGrowth, "partial matched status requires its inventory");
  if (value.matchedGrowth) validateMatchedGrowth(value.matchedGrowth);
  const annual = value.tables.nt_yearly.rows;
  const scienceFirstYear = annual.some(row => row[1] !== "Neurotech papers" && Number(row[0]) < 2022) ? 2010 : 2022;
  exactKeys(annual.map(row => `${row[0]}:${row[1]}`), [
    ...Array.from({ length: 16 }, (_, i) => `${2010 + i}:Neurotech papers`),
    ...(value.source.scienceBaseline ? ["All research", "Science baseline, low", "Science baseline, high"].flatMap(series => Array.from({ length: 2026 - scienceFirstYear }, (_, i) => `${scienceFirstYear + i}:${series}`)) : []),
  ], "nt_yearly");
  const baseline = annual.find(row => row[0] === "2022" && row[1] === "Neurotech papers")![2];
  for (const row of annual.filter(row => row[0] === "2022")) requireCondition(row[2] === baseline, "science baseline must be anchored to neurotech in 2022");
  for (let year = scienceFirstYear; value.source.scienceBaseline && year <= 2025; year++) {
    const low = annual.find(row => row[0] === String(year) && row[1] === "Science baseline, low")![2];
    const high = annual.find(row => row[0] === String(year) && row[1] === "Science baseline, high")![2];
    requireCondition(Number(low) <= Number(high), "science band inverted");
  }
  for (const group of PUBLICATION_GROWTH_GROUPS) exactKeys(value.tables[group.table].rows.map(row => String(row[0])), group.groups, group.table);
  for (const name of ["nt_talent_table", "nt_talent_moves"]) exactKeys(value.tables[name].rows.map(row => String(row[0])), PUBLICATION_SECTORS, name);
  for (const row of value.tables.nt_talent_moves.rows) {
    const index = PUBLICATION_SECTORS.indexOf(row[0] as typeof PUBLICATION_SECTORS[number]);
    row.slice(1).forEach((cell, i) => requireCondition(i === index ? cell === null : cell !== null, "moves diagonal must be null; off-diagonal counts explicit"));
  }
  const endpoints = value.tables.nt_talent_endpoints, endpointCohort = value.audit.affiliationEndpointCohort;
  requireCondition(Boolean(endpoints) === Boolean(endpointCohort), "full endpoint table and cohort audit must be supplied together");
  if (endpoints && endpointCohort) {
    exactKeys(endpoints.rows.map(row => String(row[0])), PUBLICATION_SECTORS, "nt_talent_endpoints");
    let same = 0, changed = 0;
    for (const row of endpoints.rows) {
      const index = PUBLICATION_SECTORS.indexOf(row[0] as typeof PUBLICATION_SECTORS[number]);
      const moves = value.tables.nt_talent_moves.rows.find(move => move[0] === row[0])!;
      row.slice(1).forEach((cell, i) => {
        if (i === index) same += Number(cell);
        else {
          requireCondition(cell === moves[i + 1], "endpoint off-diagonal disagrees with changed-sector matrix");
          changed += Number(cell);
        }
      });
    }
    requireCondition(endpointCohort.sameSectorAuthors === same && endpointCohort.changedSectorAuthors === changed && endpointCohort.eligibleAuthors === same + changed, "endpoint cohort totals disagree with matrix");
    requireCondition(endpointCohort.eligibleAuthors <= value.audit.authorCohort.authors, "endpoint cohort exceeds all identified authors");
  }
  requireCondition(value.tables.nt_talent_table.rows.reduce((sum, row) => sum + Number(row[2]), 0) > 0, "researcher population is empty");
  return value;
}

/** Legacy data remains readable, but cannot truncate a full-history last-good release. */
export function assertPublicationScienceCoverage(next: unknown, previous: unknown) {
  const firstYear = (value: unknown) => Math.min(2022, ...((value as PublicationSnapshot | undefined)?.tables?.nt_yearly?.rows ?? []).filter(row => row[1] === "All research").map(row => Number(row[0])));
  requireCondition(firstYear(next) <= firstYear(previous), "science history coverage regressed");
}

export type PublicationSector = typeof PUBLICATION_SECTORS[number];
export const SECTOR_LABELS: Record<PublicationSector, string> = {
  Academic: "Universities", Industry: "Companies", "Other institutions": "Other institutions", "No listed affiliation": "No listed affiliation",
};
export const SECTOR_COLORS: Record<PublicationSector, string> = {
  Academic: "#115ef7", Industry: "#e5a438", "Other institutions": "#7c48d5", "No listed affiliation": "#a6b0bf",
};
export function selectPublicationCharts(snapshot: PublicationSnapshot) {
  const annual = snapshot.tables.nt_yearly.rows.filter(row => row[1] === "Neurotech papers")
    .map(row => ({ year: Number(row[0]), papers: Number(row[2]) })).sort((a, b) => a.year - b.year);
  const countAt = (year: number, series: string) => Number(snapshot.tables.nt_yearly.rows.find(row => row[0] === String(year) && row[1] === series)![2]);
  const anchor = countAt(2022, "Neurotech papers");
  const scienceFirstYear = snapshot.tables.nt_yearly.rows.some(row => row[1] !== "Neurotech papers" && Number(row[0]) < 2022) ? 2010 : 2022;
  const baseline = Array.from({ length: snapshot.source.scienceBaseline ? 2026 - scienceFirstYear : 0 }, (_, i) => ({ year: scienceFirstYear + i, low: countAt(scienceFirstYear + i, "Science baseline, low"), high: countAt(scienceFirstYear + i, "Science baseline, high"), all: countAt(scienceFirstYear + i, "All research") }));
  const endpoint = baseline.at(-1);
  const scienceGrowth = endpoint && anchor > 0 ? { low: (endpoint.low / anchor - 1) * 100, high: (endpoint.high / anchor - 1) * 100, all: (endpoint.all / anchor - 1) * 100 } : null;
  const neurotechGrowth = growthPct(anchor, annual.at(-1)!.papers);
  const groupNames: readonly string[] = PUBLICATION_GROWTH_GROUPS.flatMap(group => [...group.groups]);
  const growth = PUBLICATION_GROWTH_GROUPS.flatMap(section => snapshot.tables[section.table].rows.map(row => {
    // Match identities by the fixed contract order, never by source row order.
    const groupIndex = groupNames.indexOf(String(row[0]));
    const id = MATCHED_GROWTH_IDS[groupIndex];
    const matched = snapshot.matchedGrowth?.rows.find(item => item.id === id);
    const numerator = matched?.numeratorCounts;
    const trulyMatched = matched?.baselineStatus === "matched";
    const start = numerator ? countValue(numerator["2022"]) : Number(row[1]);
    const end = numerator ? countValue(numerator["2025"]) : Number(row[2]);
    return {
      id, table: section.table, section: section.label, authorBased: numerator ? matched!.countUnit === "author-fractional works" : section.authorBased,
      group: matched?.label ?? (row[0] === "North America" ? "US and Canada" : row[0] === "National institutes" ? "Government agencies and research facilities" : String(row[0])), start, end,
      growth: numerator ? matched!.neuroGrowthPct : row[3] === null || start === 0 ? null : Number(row[3]),
      baselineStatus: trulyMatched ? "matched" as const : "unavailable" as const,
      referenceStart: trulyMatched ? matched.referenceCounts!["2022"] : null,
      referenceEnd: trulyMatched ? matched.referenceCounts!["2025"] : null,
      referenceGrowth: trulyMatched ? matched.referenceGrowthPct : null,
      reason: matched?.reason ?? "Comparable primary reference counts are unavailable.",
      countUnit: numerator || trulyMatched ? matched!.countUnit : section.authorBased ? "author-fractional works" : "OpenAlex work ID",
      numeratorUniverse: numerator || trulyMatched ? matched!.numeratorUniverse : section.authorBased ? "P2 author-fractional" : "NT10",
      denominatorUniverse: trulyMatched ? matched.denominatorUniverse : null,
      countingMethod: numerator || trulyMatched ? matched!.countingMethod : snapshot.source.methodologyVersion,
      evidence: matched?.evidence ?? [], shares: trulyMatched ? matched.shares : null,
      relativeShareGrowthPct: trulyMatched ? matched.relativeShareGrowthPct : null,
      growthGapPercentagePoints: trulyMatched ? matched.growthGapPercentagePoints : null,
    };
  }).sort((a, b) => (b.growth ?? -Infinity) - (a.growth ?? -Infinity)));
  const totalResearchers = snapshot.tables.nt_talent_table.rows.reduce((sum, row) => sum + Number(row[2]), 0);
  const displayOrder: PublicationSector[] = ["Academic", "Other institutions", "No listed affiliation", "Industry"];
  const sectors = displayOrder.map(sector => {
    const row = snapshot.tables.nt_talent_table.rows.find(row => row[0] === sector)!;
    const count = Number(row[2]);
    return { sector, label: SECTOR_LABELS[sector], count, share: count / totalResearchers * 100, color: SECTOR_COLORS[sector] };
  });
  // Largest-remainder allocation sums to exactly 100; exact population counts stay beside it.
  const allocation = sectors.map((sector, index) => ({ ...sector, index, cells: Math.floor(sector.share), remainder: sector.share % 1 }));
  let remaining = 100 - allocation.reduce((sum, sector) => sum + sector.cells, 0);
  for (const sector of [...allocation].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
    if (remaining-- > 0) sector.cells++;
  }
  const waffle = allocation.flatMap(sector => Array.from({ length: sector.cells }, () => ({ sector: sector.sector, color: sector.color })));
  const selectTransitions = (table: PublicationTable, includeSameSector: boolean) => PUBLICATION_SECTORS.map(from => {
    const row = table.rows.find(row => row[0] === from)!;
    const total = row.slice(1).reduce<number>((sum, count) => sum + Number(count ?? 0), 0);
    const order = (["Academic", "No listed affiliation", "Other institutions", "Industry"] as const).filter(sector => includeSameSector || sector !== from);
    let offset = 0;
    const destinations = order.map(sector => {
      const count = Number(row[PUBLICATION_SECTORS.indexOf(sector) + 1]);
      const share = total ? count / total * 100 : 0;
      const item = { sector, label: SECTOR_LABELS[sector], count, share, offset, color: SECTOR_COLORS[sector] };
      offset += share;
      return item;
    });
    return { from, label: SECTOR_LABELS[from], total, destinations };
  });
  const transitions = selectTransitions(snapshot.tables.nt_talent_moves, false);
  const endpointTransitions = snapshot.tables.nt_talent_endpoints ? selectTransitions(snapshot.tables.nt_talent_endpoints, true) : null;
  return { baselineYear: snapshot.source.baselineYear, paperEndYear: snapshot.source.paperEndYear, authorEndYear: snapshot.source.authorEndYear, annual, baseline, scienceGrowth, neurotechGrowth, growth, sectors, totalResearchers, waffle, transitions, endpointTransitions };
}
export type PublicationChartData = ReturnType<typeof selectPublicationCharts>;
