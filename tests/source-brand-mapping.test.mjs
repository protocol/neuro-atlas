import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sourceBrandForUrl, SOURCE_BRANDS, SOURCE_GROUP_BRANDS } from "../src/data/source-brands.ts";

const catalog = JSON.parse(readFileSync("src/data/methodology-sources.json", "utf8"));

test("brand mapping distinguishes journal publishers from companies and only maps specific DOI families", () => {
  for (const [url, id] of [
    ["https://www.nature.com/articles/s41586-023-06377-x", "nature"],
    ["https://doi.org/10.1038/s41586-023-06377-x", "nature"],
    ["https://www.science.org/doi/10.1126/science.adk4858", "science"],
    ["https://science.xyz/news/series-d/", "science-corporation"],
    ["https://doi.org/10.1016/j.neuron.2020.01.001", "cell"],
    ["https://www.neurofounders.co/resources/start-up-map", "neurofounders"],
  ]) assert.equal(sourceBrandForUrl(url)?.id, id, url);
  assert.equal(sourceBrandForUrl("https://doi.org/10.1016/j.brainres.2020.01.001"), undefined);
  assert.equal(sourceBrandForUrl("https://doi.org/10.1101/2020.01.01.000000"), undefined);
  assert.equal(sourceBrandForUrl("https://example.org/unknown-source"), undefined);
});

test("lookalike, malformed and credential-bearing URLs never acquire a trusted source logo", () => {
  for (const url of ["https:neuralink.com", "https:/neuralink.com", "https://neuralink.com.evil.invalid", "https://neuralink.com@evil.invalid/", "https://user:pass@neuralink.com/", "javascript:alert(1)", "data:image/svg+xml,x", "not a URL"]) {
    assert.equal(sourceBrandForUrl(url), undefined, url);
  }
});

test("every displayed category brand is actually cited in that category and has a real local asset", () => {
  for (const [key, ids] of Object.entries(SOURCE_GROUP_BRANDS)) {
    for (const id of ids) {
      assert.ok(SOURCE_BRANDS[id]?.logo.startsWith("/"), id);
      assert.ok(catalog[key].some(([url]) => sourceBrandForUrl(url)?.id === id), `${key}: ${id} must identify an actual cited source`);
    }
  }
  assert.ok(!Object.values(SOURCE_BRANDS).some(brand => !brand.logo), "No dummy marks for companies without sourced logos");
});
