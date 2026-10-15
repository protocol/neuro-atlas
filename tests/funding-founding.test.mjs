import test from "node:test";
import assert from "node:assert/strict";
import { buildFundingIndex, loadFundingIndexSources, parseCsv } from "../scripts/lib/funding-index.mjs";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const directory = new URL("../data/funding-index/", import.meta.url).pathname;

test("canonical founding research covers the entire unchanged roster exactly once and regenerates deterministically", async () => {
  const sources = await loadFundingIndexSources(directory);
  assert.ok(Array.isArray(sources.foundings), "loader must read canonical founding research");
  assert.equal(sources.foundings.length, 25);
  assert.equal(new Set(sources.foundings.map((row) => row.company_slug)).size, 25);
  assert.deepEqual(sources.foundings.map((row) => row.company_slug).sort(), sources.companies.map((row) => row.slug).sort());
  const index = buildFundingIndex(sources);
  const expectedYears = JSON.parse(await readFile(new URL("./fixtures/funding-founding-years.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.fromEntries(index.companies.map((c) => [c.slug, c.founding?.year])), expectedYears);
  assert.equal(index.companies.filter((c) => c.founding?.year !== null).length, 25);
  for (const company of index.companies) {
    assert.ok(company.founding, company.slug);
    assert.equal(company.founding.reviewedOn, "2026-10-15");
  }
  execFileSync(process.execPath, ["scripts/generate-derived.mjs"]);
  const first = await readFile(new URL("../src/data/funding-index.json", import.meta.url), "utf8");
  execFileSync(process.execPath, ["scripts/generate-derived.mjs"]);
  assert.equal(await readFile(new URL("../src/data/funding-index.json", import.meta.url), "utf8"), first);
  assert.deepEqual(JSON.parse(first).companies.map((c) => c.founding), index.companies.map((c) => c.founding));
});

test("CSV parsing preserves commas, quoted notes and blank years", () => {
  assert.deepEqual(parseCsv('company_slug,founding_year,note\nexample,,"Origin unclear, not zero"\n'), [
    { company_slug: "example", founding_year: "", note: "Origin unclear, not zero" },
  ]);
});

const company = { slug: "example", name: "Example", modality: "BCI", scope: "Implanted" };
const founding = {
  company_slug: "example", founding_year: "2021", source_url: "https://example.com/about",
  source_kind: "primary", reviewed_on: "2026-10-15", note: "Business founding, not the later public launch.",
};
const build = (foundings) => buildFundingIndex({ companies: [company], rounds: [], milestones: [], foundings });

test("missing founding evidence remains null rather than zero or earliest financing", () => {
  assert.equal(build().companies[0].founding, null);
  assert.equal(build([{ ...founding, founding_year: "", source_url: "", source_kind: "" }]).companies[0].founding.year, null);
});

test("rejects malformed years and incomplete provenance", () => {
  for (const founding_year of ["0", "NaN", "2021.5", "21", "2027", "2021 extra"]) {
    assert.throws(() => build([{ ...founding, founding_year }]), /founding year/i);
  }
  for (const overrides of [
    { source_url: "" }, { source_url: "javascript:alert(1)" }, { source_kind: "directory" },
    { reviewed_on: "" }, { reviewed_on: "2026-02-30" }, { note: "" },
  ]) assert.throws(() => build([{ ...founding, ...overrides }]), /founding/i);
});

test("rejects duplicate, foreign or missing founding roster entries", () => {
  assert.throws(() => build([founding, founding]), /duplicate/i);
  assert.throws(() => build([{ ...founding, company_slug: "foreign" }]), /unknown/i);
  assert.throws(() => build([]), /missing/i);
  assert.throws(() => buildFundingIndex({ companies: [company, company], rounds: [], milestones: [] }), /duplicate company/i);
});

test("joins source-backed business founding years independently of financing events", () => {
  assert.deepEqual(build([founding]).companies[0].founding, {
    year: 2021, sourceUrl: founding.source_url, sourceKind: "primary", reviewedOn: "2026-10-15", note: founding.note,
  });
});
