import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { scanSources } from "./helpers/methodology-source-inventory.mjs";

test("public source compilations remain part of the inventory and the rendered catalog", () => {
  const { included } = scanSources();
  const catalog = JSON.parse(readFileSync("src/data/methodology-sources.json", "utf8"));
  const hrefs = new Set(Object.values(catalog).flat().map(([url]) => url));
  for (const url of [
    "https://docs.google.com/spreadsheets/d/1PukHvhxTqC72tau9HDnq1LKIl3F6V_FGr_y3G-jjZ-k/edit#gid=0",
    "https://docs.google.com/spreadsheet/pub?hl=en_US&hl=en_US&key=0Ai7vcDJIlD6AdF9vQWlNRDh2S1dub09jMWRvTFRpemc&single=true&gid=0&output=csv",
  ]) {
    assert.ok(included.has(url), `Public compilation is missing from inventory: ${url}`);
    assert.ok(hrefs.has(url), `Public compilation is missing from catalog: ${url}`);
  }
});

test("unused inherited toolkit examples are excluded while real video evidence remains", () => {
  const { included } = scanSources();
  const catalog = JSON.parse(readFileSync("src/data/methodology-sources.json", "utf8"));
  const hrefs = new Set(Object.values(catalog).flat().map(([url]) => url));
  const snapshot = JSON.parse(readFileSync("src/data/field-velocity/neurotech.snapshot.json", "utf8"));
  const unused = snapshot.toolkit.flatMap(({ examples }) => examples.map(({ href }) => href)).filter((url) => url.startsWith("https://"));
  assert.equal(unused.length, 8);
  for (const url of unused) {
    assert.ok(!included.has(url), `Unused toolkit example was classified as source evidence: ${url}`);
    assert.ok(!hrefs.has(url), `Unused toolkit example was published as source evidence: ${url}`);
  }
  assert.ok(included.has("https://www.youtube.com/watch?v=_j806JHhCRo&t=170s"), "Keep the actual Neuralink recording-hardware video evidence");
});

test("configured forecast API origins stay out of the evidence catalog while question links remain", () => {
  const { included } = scanSources();
  const catalog = JSON.parse(readFileSync("src/data/methodology-sources.json", "utf8"));
  const hrefs = new Set(Object.values(catalog).flat().map(([url]) => url));
  const markets = JSON.parse(readFileSync("src/data/velocity/neurotech_market_signals.json", "utf8"));
  for (const value of Object.values(markets.apiEndpoints)) {
    const url = new URL(value).href;
    assert.ok(!included.has(url) && !hrefs.has(url), `Unwired forecast endpoint is not current evidence: ${url}`);
  }
  for (const mapping of markets.mappings) {
    for (const question of [mapping.primary, mapping.fallback].filter(Boolean)) {
      assert.ok(included.has(question.url) && hrefs.has(question.url), question.url);
    }
  }
});

test("the classified directory covers the exact external evidence inventory", () => {
  const { paths, included } = scanSources();
  for (const path of ["src/data/field-velocity/neurotech.snapshot.json", "data/market-memo-q1-2026/milestones.csv", "src/data/funding-index.json", "scripts/publications/acquire.py", "public/data/google-trends/google-trends.json"]) assert.ok(paths.includes(path), path);
  const path = "src/data/methodology-sources.json";
  assert.ok(existsSync(path), "The public link directory is missing");
  const catalog = JSON.parse(readFileSync(path, "utf8"));
  const categories = Object.keys(catalog);
  assert.deepEqual(categories, ["datasets", "studies", "disclosures", "discovery", "ecosystems", "reference"]);
  const items = Object.values(catalog).flat();
  const hrefs = new Set();
  for (const [url, label] of items) {
    assert.ok(url.startsWith("https://") && label.trim(), url);
    assert.ok(!hrefs.has(url), `Duplicate directory entry ${url}`);
    hrefs.add(url);
  }
  assert.deepEqual([...included.keys()].filter((url) => !hrefs.has(url)), [], "Sources missing from the directory");
  assert.deepEqual([...hrefs].filter((url) => !included.has(url)), [], "Directory entries without source evidence");
});


test("the pinned citation method is inventoried alongside the shared snapshot", () => {
  const { included } = scanSources();
  const href = "https://github.com/protocol/plrd.org/blob/0d91734795f7a62394d2047a8f95384bbeae41f4/scripts/velocity/field_velocity_openalex.py";
  assert.ok(included.has(href), "Resolve the actual pinned URL rather than publishing a template");
  assert.ok(included.get(href).some(({ path }) => path === "src/lib/field-velocity/citation-latency-feed.ts"));
});
