import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { scanSources } from "./helpers/methodology-source-inventory.mjs";

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
