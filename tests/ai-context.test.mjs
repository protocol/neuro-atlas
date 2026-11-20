import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = path => JSON.parse(readFileSync(`src/data/${path}`, "utf8"));
const load = async () => {
  assert.ok(existsSync("src/lib/ai/catalog.ts"), "The same-source Atlas catalog must exist");
  return import("../src/lib/ai/catalog.ts");
};

test("funding context uses the exact screened UI companies, rounds and regulatory markers", async () => {
  const { buildCatalog } = await load();
  const catalog = buildCatalog();
  const source = read("funding-index.json");
  assert.equal(catalog.schemaVersion, 1);
  for (const [type, key] of [["company", "companies"], ["round", "rounds"], ["regulatory", "milestones"], ["investor", "investors"]]) {
    const rows = catalog.records.filter(r => r.type === type);
    assert.equal(rows.length, source[key].length);
    assert.deepEqual(rows.map(r => r.data), source[key]);
    assert.ok(rows.every(r => r.canonicalUrl === "/funding" && r.section === "funding"));
    assert.ok(rows.every(r => r.markdownUrl.startsWith("/ai/records/") && r.markdownUrl.endsWith(".md")));
  }
  const section = catalog.sections.find(s => s.id === "funding");
  assert.deepEqual(section.metadata.summary, source.summary);
  assert.deepEqual(section.metadata.methodology, source.methodology);
  assert.match(section.coverage, /screened.*not.*census/i);
  assert.match(section.coverage, /amount.*raised.*not.*valuation/i);
  assert.equal(section.dates.asOf, source.summary.asOf);
  assert.ok(catalog.records.filter(r => r.type === "round").every(r => r.unit === "USD millions" && r.sourceUrls.length));
  assert.equal(new Set(catalog.records.map(r => r.id)).size, catalog.records.length);
});

test("neuro-wide timeline and memo capital retain separate UI data and denominators", async () => {
  const { buildCatalog } = await load();
  const catalog = buildCatalog();
  const events = catalog.records.filter(r => r.type === "event");
  assert.deepEqual(events.map(r => r.data), read("milestones.json"));
  assert.ok(events.some(r => r.data.scope === "broader"));
  assert.ok(events.some(r => r.data.scope === "bci"));
  const penumbra = events.find(r => r.data.slug === "penumbra");
  assert.equal(penumbra.data.amountUsdM, 14500);
  assert.match(penumbra.coverage, /enterprise value.*not.*round/i);
  const memo = catalog.records.filter(r => r.type === "memo-capital");
  assert.deepEqual(memo.map(r => r.data), read("capital.json"));
  assert.ok(memo.every(r => r.section === "memo-capital" && r.unit === "USD millions"));
  assert.match(memo[0].coverage, /separate.*sourced rounds/i);
  assert.match(memo.find(r => r.data.year === 2026).data.note, /Jan–Apr/);
  assert.equal(new Set(catalog.records.map(r => r.id)).size, catalog.records.length);
});

test("performance and pace export exactly the current UI selections with provenance, units and uncertainty", async () => {
  const { buildCatalog } = await load();
  const catalog = buildCatalog();
  const snapshot = read("field-velocity/neurotech.snapshot.json");
  const performance = catalog.records.filter(r => r.type === "measurement");
  assert.deepEqual(performance.map(r => r.data), snapshot.measurementSeries.filter(s => s.instrument === "performance_curves"));
  for (const row of performance) {
    assert.equal(row.unit, row.data.unit);
    assert.ok(row.sourceUrls.length);
    assert.match(row.coverage, /not|selected/i);
  }
  for (const id of ["performance_curves", "idea_vintage", "latency_compression"]) {
    const row = catalog.records.find(r => r.data.instrument === id && r.type === "reading");
    assert.deepEqual(row.data, snapshot.records.find(r => r.instrument === id));
    assert.equal(row.unit, id === "performance_curves" ? "neurons" : "years");
    assert.ok(row.sourceUrls.length);
  }
  const legacy = read("velocity/neurotech_records.json").records.filter(r => ["revealed_commitments", "markets"].includes(r.instrument));
  for (const r of legacy) {
    const row = catalog.records.find(row => row.type === "legacy-reading" && row.data.instrument === r.instrument);
    const visible = Object.fromEntries(Object.entries(r).filter(([key]) => key !== "upstreamTodo"));
    assert.deepEqual(row.data, visible);
    assert.equal(row.evidence, r.state === "reading" ? "mixed" : "unwired");
  }
  assert.ok(!catalog.records.some(r => r.data.id === "bci-implants"), "Not displayed by the Atlas performance selector");
  const metadata = catalog.sections.find(s => s.id === "performance").metadata;
  assert.equal(metadata.snapshot.providerCommit, read("field-velocity/neurotech.snapshot.json.provenance.json").providerCommit);
  assert.equal(metadata.snapshot.exportGeneratedAt, snapshot.generatedAt);
  assert.match(metadata.snapshot.dateMeaning, /not.*observation/i);
  assert.ok(catalog.records.some(r => JSON.stringify(r.data).includes('"qualifier":"greater-than"')));
});

test("expectations and glossary are sourced, with hypotheses separate from observations and no live market prices", async () => {
  const { buildCatalog } = await load();
  const { records } = buildCatalog();
  const hypotheses = records.filter(r => r.type === "hypothesis");
  assert.deepEqual(hypotheses.map(r => r.data), read("velocity/neurotech_inflection_points.json").points);
  assert.ok(hypotheses.every(r => r.evidence === "hypothesis"));
  const mappings = records.filter(r => r.type === "market-mapping");
  assert.deepEqual(mappings.map(r => r.data), read("velocity/neurotech_market_signals.json").mappings);
  assert.ok(mappings.every(r => r.evidence === "forecast-mapping" && r.dates.asOf === null));
  assert.ok(mappings.every(r => !JSON.stringify(r.data).includes('"prob"')));
  assert.deepEqual(Object.fromEntries(records.filter(r => r.type === "glossary").map(r => [r.title, r.data])), read("acronyms.json"));
});

test("exports allowlist public fields and exclude injected hidden records, private paths and unwired stale values", async () => {
  const { atlasSources, buildCatalog } = await load();
  const sources = structuredClone(atlasSources);
  sources.funding.companies.push({ ...sources.funding.companies[0], slug: "hidden-company", name: "HIDDEN_SENTINEL", published: false });
  sources.funding.rounds.push({ ...sources.funding.rounds[0], companySlug: "hidden-company", note: "HIDDEN_SENTINEL" });
  for (const flag of ["draft", "unlisted", "noindex", "preview", "hidden"]) sources.milestones.push({ ...sources.milestones[0], slug: `hidden-${flag}`, company: "HIDDEN_SENTINEL", [flag]: true });
  sources.funding.companies[0].internalNotes = "SECRET_SENTINEL";
  sources.funding.summary.internalNotes = "SECRET_SENTINEL";
  sources.snapshot.records[0].privateData = "SECRET_SENTINEL";
  sources.snapshot.records[0].sources[0].token = "SECRET_SENTINEL";
  sources.snapshot.measurementSeries[0].tracks[0].points[0].privateNotes = "SECRET_SENTINEL";
  sources.snapshot.measurementSeries[0].tracks[0].points.push({ ...sources.snapshot.measurementSeries[0].tracks[0].points[0], date: "2012-01-01", label: "HIDDEN_SENTINEL", visibility: "private" });
  const stale = sources.snapshot.records.find(r => r.instrument === "idea_vintage");
  stale.state = "unwired"; stale.candidateMetric = "Reference age"; stale.blocker = "No source feed";
  stale.value = "STALE_SENTINEL";
  sources.markets.mappings[0].primary.url = "https://www.plrd.org/impact-preview-example/";
  sources.glossary.BCI.privateNotes = "SECRET_SENTINEL";
  const text = JSON.stringify(buildCatalog(sources));
  assert.doesNotMatch(text, /HIDDEN_SENTINEL|SECRET_SENTINEL|STALE_SENTINEL/);
  assert.doesNotMatch(text, /impact-preview|dhr-preview|open-lab|apiEndpoints|upstreamTodo|provider-export|"toolkit":/);
  const unwired = buildCatalog(sources).records.find(r => r.id === "reading-idea-vintage");
  for (const k of ["value", "series", "measuredAt", "trend"]) assert.ok(!(k in unwired.data), k);
  assert.equal(unwired.dates.measuredAt, null);
});
