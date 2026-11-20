import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildFundingIndex, loadFundingIndexSources, parseCsv } from "../scripts/lib/funding-index.mjs";

// Synthetic company fixture; no production company facts or canonical files change.
const companyCsv = [
  "slug,name,hq,modality,interface_depth,indication,website,scope",
  "fixture,Fixture Company,Fixture HQ,ECoG,Cortical Surface,Fixture indication,https://example.org/company,Implanted",
].join("\n");
const company = parseCsv(companyCsv)[0];
const build = (companies) => buildFundingIndex({ companies, rounds: [], milestones: [] });

test("CSV website_label survives the real loader and funding builder as websiteLabel", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "funding-website-label-"));
  try {
    const [header, row] = companyCsv.split("\n");
    await Promise.all([
      writeFile(path.join(directory, "companies.csv"), `${header},website_label\n${row}, Institutional profile (CIBR) \n`),
      writeFile(path.join(directory, "rounds.csv"), "company_slug\n"),
      writeFile(path.join(directory, "milestones.csv"), "company_slug\n"),
      writeFile(path.join(directory, "foundings.csv"), "company_slug,founding_year,source_url,source_kind,reviewed_on,note\nfixture,,,,2026-11-20,Synthetic fixture\n"),
      ...["fx-conversions.json", "portfolio-disclosures.json", "investor-groups.json", "investor-evidence.json"].map((name) =>
        writeFile(path.join(directory, name), "[]")),
    ]);
    const sources = await loadFundingIndexSources(directory);
    const generated = JSON.parse(JSON.stringify(buildFundingIndex(sources)));
    assert.equal(generated.companies[0].websiteLabel, "Institutional profile (CIBR)");
    assert.equal(generated.companies[0].website, company.website);
    assert.equal(Object.hasOwn(generated.companies[0], "website_label"), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects non-string website_label with a company-specific validation error", () => {
  for (const website_label of [null, 7, true, {}, []]) {
    assert.throws(() => build([{ ...company, website_label }]), /^Error: Invalid company website label: fixture$/);
  }
});

test("a custom website_label requires a usable HTTPS website", () => {
  for (const website of [undefined, "", "not a URL", "http://example.org/company", "javascript:alert(1)"]) {
    assert.throws(() => build([{ ...company, website, website_label: "Institutional profile (CIBR)" }]),
      /^Error: Invalid company website for custom label: fixture$/);
  }
});

test("omitted and blank website_label preserve the existing generated company shape", () => {
  const baseline = build([company]);
  assert.equal(Object.hasOwn(baseline.companies[0], "websiteLabel"), false);
  for (const website_label of ["", "   "]) {
    assert.deepEqual(build([{ ...company, website_label }]), baseline);
  }
});
