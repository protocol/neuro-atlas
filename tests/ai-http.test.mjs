import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { buildCatalog } from "../src/lib/ai/catalog.ts";

const get = async (path, query = "") => {
  assert.ok(existsSync(`src/app/${path}/route.ts`), `Missing HTTP resource: ${path}`);
  const { GET } = await import(`../src/app/${path}/route.ts`);
  return GET(new Request(`https://atlas.example/${path}${query}`));
};
const dynamicGet = async (kind, resource) => {
  const path = `src/app/ai/${kind}/[resource]/route.ts`;
  assert.ok(existsSync(path), `Missing ${kind} HTTP route`);
  const { GET } = await import(`../${path}`);
  return GET(new Request(`https://atlas.example/ai/${kind}/${resource}`), { params: Promise.resolve({ resource }) });
};

test("plain HTTP Markdown resources are linked, deterministic, downloadable and same-source", async () => {
  const catalog = buildCatalog();
  const index = await get("llms.txt");
  assert.equal(index.status, 200);
  assert.match(index.headers.get("content-type"), /text\/plain; charset=utf-8/);
  const text = await index.text();
  assert.ok(text.length < 14000, "Compact index, not a second full context");
  assert.match(text, /\/ai\/|\/llms-full\.txt|\/api\/ai\/query/);
  assert.match(text, /authentication|gated/i);
  assert.match(text, /no.*license|not.*license/i);
  assert.doesNotMatch(text, /bci-dashboard-tawny|impact-preview|dhr-preview/);
  const fullResponse = await get("llms-full.txt", "?download=1");
  assert.equal(fullResponse.status, 200);
  assert.match(fullResponse.headers.get("content-disposition"), /attachment.*neuro-atlas-full\.md/);
  assert.equal(fullResponse.headers.get("cache-control"), "private, no-store");
  assert.match(fullResponse.headers.get("vary"), /Authorization/i);
  assert.equal(fullResponse.headers.get("x-content-type-options"), "nosniff");
  const full = await fullResponse.text();
  assert.equal(full, await (await get("llms-full.txt")).text());
  for (const section of catalog.sections) {
    assert.ok(text.includes(section.markdownUrl));
    const response = await dynamicGet("sections", `${section.id}.md`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/markdown/);
    const sectionText = await response.text();
    assert.ok(full.includes(sectionText));
    for (const row of catalog.records.filter(r => r.section === section.id)) {
      assert.ok(sectionText.includes(row.id), row.id);
      assert.ok(sectionText.includes(row.markdownUrl), row.id);
      assert.ok(full.includes(row.id));
    }
  }
  const row = catalog.records.find(r => r.type === "measurement");
  const resource = await dynamicGet("records", `${row.id}.md`);
  const recordText = await resource.text();
  assert.ok(recordText.includes("greater-than") || recordText.includes("approximate"));
  assert.ok(recordText.includes(row.unit));
  for (const url of row.sourceUrls) assert.ok(recordText.includes(url));
  assert.equal((await dynamicGet("sections", "neurofounders.md")).status, 404);
  assert.equal((await dynamicGet("records", "hidden-company.md")).status, 404);
  assert.equal((await dynamicGet("records", "../../proxy.ts")).status, 404);
  assert.equal((await get("llms.txt", "?url=https://example.com")).status, 400);
});

test("JSON query deterministically filters and paginates the exported records without a second catalog", async () => {
  const catalog = buildCatalog();
  const response = await get("api/ai/query", "?type=round&q=neuralink&limit=1");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  const body = await response.json();
  assert.equal(body.schemaVersion, 1);
  assert.equal(body.returned, 1);
  assert.equal(body.total, catalog.records.filter(r => r.type === "round" && `${r.title} ${JSON.stringify(r.data)}`.toLowerCase().includes("neuralink")).length);
  assert.deepEqual(body.results[0], catalog.records.find(r => r.id === body.results[0].id));
  assert.equal(body.canonicalUrl, "/api/ai/query?q=neuralink&type=round&limit=1&offset=0");
  assert.ok(body.coverage.length && body.queryContract);
  const shuffled = await (await get("api/ai/query", "?limit=1&q=neuralink&type=round")).json();
  assert.deepEqual(shuffled, body);
  const first = await (await get("api/ai/query", "?section=milestones&limit=7")).json();
  const ids = [];
  let page = first;
  while (true) {
    ids.push(...page.results.map(r => r.id));
    if (page.next === null) break;
    assert.ok(page.next.startsWith("/api/ai/query?"));
    page = await (await get("api/ai/query", page.next.slice("/api/ai/query".length))).json();
  }
  assert.equal(ids.length, first.total);
  assert.equal(new Set(ids).size, first.total);
  assert.deepEqual(ids, [...ids].sort());
  const scoped = await (await get("api/ai/query", "?type=event&scope=broader&year=2026")).json();
  assert.ok(scoped.results.length);
  assert.ok(scoped.results.every(r => r.data.scope === "broader" && r.data.date.startsWith("2026")));
  const noResults = await (await get("api/ai/query", "?q=no-such-company-xyz")).json();
  assert.equal(noResults.total, 0); assert.equal(noResults.next, null); assert.deepEqual(noResults.results, []);
  const end = await (await get("api/ai/query", "?offset=10000")).json();
  assert.equal(end.returned, 0); assert.equal(end.next, null);
  assert.equal((await get("api/ai/query", `?id=${body.results[0].id}`)).status, 200);
  assert.equal((await get("api/ai/query", "?id=unknown-record")).status, 404);
});

test("invalid, duplicate, unbounded and arbitrary-fetch inputs fail with explicit JSON 400", async () => {
  for (const query of ["?limit=0", "?limit=51", "?limit=1.5", "?limit=1e1", "?limit=-1", "?limit=01", "?offset=-1", "?offset=10001", "?offset=NaN", "?year=0000", "?year=2026x", "?section=private", "?type=everything", "?scope=private", "?q=" + "a".repeat(201), "?q=%00", "?q=a&q=b", "?limit=2&limit=3", "?url=https://example.com", "?path=../../src/proxy.ts", "?id=../../private", "?id=unknown&type=round", "?download=1", "?" + "a".repeat(2100)]) {
    const response = await get("api/ai/query", query);
    assert.equal(response.status, 400, query);
    assert.equal((await response.json()).error.status, 400, query);
  }
});
