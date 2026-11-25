import test from "node:test";
import assert from "node:assert/strict";

import { buildCompanyRows, buildFundingIndex, formatCapital, getTimelinePosition, loadFundingIndexSources } from "../scripts/lib/funding-index.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { loadHistoricalFundingSources, readHistoricalFile } from "./helpers/china-funding-baseline.mjs";

test("excludes disclosed rounds below the $2m screen", () => {
  const index = buildFundingIndex({
    companies: [
      { slug: "precision", name: "Precision", hq: "New York, USA", modality: "ECoG", interface_depth: "Cortical Surface", indication: "Paralysis", website: "https://example.com" },
    ],
    rounds: [
      { company_slug: "precision", announced_on: "2024-01-01", date_precision: "day", stage: "Pre-seed", amount_usd_m: "1.5", amount_native_m: "", currency: "USD", display_amount: "$1.5m", investors: "Small Fund", source_url: "https://example.com/preseed", note: "" },
      { company_slug: "precision", announced_on: "2024-02-01", date_precision: "day", stage: "Seed", amount_usd_m: "2", amount_native_m: "", currency: "USD", display_amount: "$2m", investors: "Lead Fund", source_url: "https://example.com/seed", note: "" },
    ],
    milestones: [],
  });

  assert.equal(index.rounds.length, 1);
  assert.equal(index.rounds[0].stage, "Seed");
  assert.equal(index.summary.excludedBelowThreshold, 1);
});


test("loads a bounded 25-company capital index", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sources = await loadHistoricalFundingSources(path.join(here, "..", "data", "funding-index"));
  const index = buildFundingIndex(sources);

  assert.equal(index.companies.length, 25);
});


test("seeds every selected company with a qualifying sourced financing", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const index = buildFundingIndex(await loadFundingIndexSources(path.join(here, "..", "data", "funding-index")));
  const financed = new Set(index.rounds.map((round) => round.companySlug));

  assert.deepEqual(
    index.companies.filter((company) => !financed.has(company.slug)).map((company) => company.name),
    [],
  );
  assert.equal(index.rounds.every((round) => round.sourceUrl.startsWith("https://")), true);
});


test("joins the six requested regulatory milestone classes to selected companies", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const index = buildFundingIndex(await loadFundingIndexSources(path.join(here, "..", "data", "funding-index")));

  assert.deepEqual(
    [...new Set(index.milestones.map((milestone) => milestone.marker))].sort(),
    ["BDD", "CE", "IDE", "NMPA", "Pivotal (planned)", "TAP"],
  );
  assert.equal(index.milestones.every((milestone) => milestone.sourceUrl.startsWith("https://")), true);
});


test("aggregates investor participation across financing rounds", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const index = buildFundingIndex(await loadFundingIndexSources(path.join(here, "..", "data", "funding-index")));
  const khosla = index.investors.find((investor) => investor.name === "Khosla Ventures");

  assert.deepEqual(
    { roundCount: khosla.roundCount, companyCount: khosla.companyCount },
    { roundCount: 6, companyCount: 2 },
  );
});


test("derived-data generation emits the funding index without a copied ecosystem", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.join(here, "..");
  const output = path.join(root, "src", "data", "funding-index.json");

  const result = spawnSync(process.execPath, [path.join(root, "scripts", "generate-derived.mjs")], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);

  const funding = JSON.parse(await readFile(output, "utf8"));
  const historicalFunding = JSON.parse(await readHistoricalFile(output, "utf8"));
  assert.equal(historicalFunding.companies.length, 25);
  await assert.rejects(readFile(path.join(root, "src", "data", "landscape.json")), { code: "ENOENT" });
  for (const company of funding.companies) {
    assert.ok(!company.logo || company.logo.startsWith("/logos/"), "Only independently sourced local logos");
  }
});


test("builds a filtered company ranking for interactive views", () => {
  const companies = [
    { slug: "alpha", name: "Alpha", modality: "ECoG", scope: "Implanted", indication: "Paralysis" },
    { slug: "beta", name: "Beta", modality: "Focused Ultrasound", scope: "Implant-adjacent", indication: "Depression" },
  ];
  const rounds = [
    { companySlug: "alpha", announcedOn: "2025-01-01", stage: "Seed", amountUsdM: 5 },
    { companySlug: "beta", announcedOn: "2026-01-01", stage: "Series A", amountUsdM: 30 },
  ];

  const rows = buildCompanyRows(companies, rounds, { query: "ultrasound", scope: "All", modality: "All" });
  assert.deepEqual(rows.map((row) => [row.slug, row.observedCapitalUsdM, row.latestStage]), [["beta", 30, "Series A"]]);
});


test("positions timeline events inside the selected year range", () => {
  assert.equal(getTimelinePosition("2019-01-01", 2019, 2026), 0);
  assert.equal(getTimelinePosition("2026-12-31", 2019, 2026), 100);
  assert.equal(getTimelinePosition("2015-01-01", 2019, 2026), 0);
});


test("formats indexed capital in familiar financial units", () => {
  assert.equal(formatCapital(2252.35), "$2.25B");
  assert.equal(formatCapital(650), "$650M");
});


test("uses the current primary Neuralink financing source", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const index = buildFundingIndex(await loadFundingIndexSources(path.join(here, "..", "data", "funding-index")));
  const neuralink = index.rounds.find((round) => round.companySlug === "neuralink" && round.stage === "Series E");

  assert.equal(neuralink.sourceUrl, "https://neuralink.com/updates/neuralink-raises-650m-series-e/");
});
