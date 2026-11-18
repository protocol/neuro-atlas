import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildFundingIndex, loadFundingIndexSources, parseCsv } from "../scripts/lib/funding-index.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (name) => JSON.parse(await readFile(new URL(name, root), "utf8"));
const sources = await loadFundingIndexSources(new URL("data/funding-index/", root).pathname);
const scienceSource = "https://science.xyz/news/series-d/";
const mergeInvestorEvidence = {
  investorName: "PL Capital",
  sourceUrl: "https://www.linkedin.com/posts/protocolvc_congrats-to-merge-labs-on-its-250m-seed-activity-7418000018110009344-7fBL",
  sourceKind: "primary",
  reviewedOn: "2026-11-17",
  sourceExcerpt: "Congrats to Merge Labs on its $250M+ seed round, which we were proud to join alongside OpenAI, Bain Capital, and Gabe Newell.",
};

test("Science's November 17 Series D appears once in both canonical datasets and their generated consumers", async () => {
  const milestoneRows = parseCsv(await readFile(new URL("data/market-memo-q1-2026/milestones.csv", root), "utf8"));
  const canonicalMilestones = milestoneRows.filter((row) => row.source_url === scienceSource);
  const canonicalRounds = sources.rounds.filter((row) => row.source_url === scienceSource);
  assert.equal(canonicalMilestones.length, 1, "Canonical Milestones must include the new source once");
  assert.equal(canonicalRounds.length, 1, "BCI funding rounds must include the new source once");
  assert.deepEqual(
    [canonicalMilestones[0].company, canonicalMilestones[0].date, canonicalMilestones[0].date_basis, canonicalMilestones[0].amount_usd_m],
    ["Science Corp", "2026-11-17", "announcement", "400"],
  );
  const index = buildFundingIndex(sources);
  const round = index.rounds.find((row) => row.sourceUrl === scienceSource);
  assert.deepEqual(
    [round.companySlug, round.announcedOn, round.datePrecision, round.dateBasis, round.stage, round.amountUsdM, round.sourceKind, round.reviewedOn],
    ["science-corporation", "2026-11-17", "day", "announcement", "Series D", 400, "primary", "2026-11-17"],
  );
  assert.deepEqual(round.investors, ["Khosla Ventures", "Ackman Oxman Institute", "Tenet Healthcare", "885 Capital", "Y Combinator", "PLC Neurotech"]);
  assert.match(round.note, /more than \$900m.*cumulative.*not indexed/i);
  assert.equal(index.rounds.filter((row) => row.companySlug === "science-corporation").length, 3);
  assert.equal(index.rounds.filter((row) => row.companySlug === "science-corporation").reduce((sum, row) => sum + row.amountUsdM, 0), 734);
  const funding = await readJson("src/data/funding-index.json");
  const milestones = await readJson("src/data/milestones.json");
  assert.deepEqual(funding.rounds.filter((row) => row.sourceUrl === scienceSource), [round]);
  assert.equal(funding.summary.asOf, "2026-11-17");
  assert.deepEqual(milestones.filter((row) => row.sourceUrl === scienceSource).map((row) => [row.company, row.date, row.stage, row.amountUsdM, row.dateBasis]), [
    ["Science Corp", "2026-11-17", "capital", 400, "announcement"],
  ]);
});

test("Merge's existing seed retains its amount and date semantics while recording the verified named participants", () => {
  const rows = sources.rounds.filter((row) => row.company_slug === "merge-labs");
  assert.equal(rows.length, 1, "Attribution corrects the existing financing, never creates a round");
  const [source] = rows;
  assert.deepEqual(
    [source.announced_on, source.date_precision, source.date_basis, source.stage, source.amount_usd_m, source.amount_native_m, source.currency, source.display_amount],
    ["2026-01-15", "day", "unverified", "Seed", "252", "", "USD", "$252m"],
    "No promotion of the original unverified date basis or reported amount",
  );
  assert.equal(source.investors, "OpenAI;Bain Capital;Gabe Newell;PL Capital");
  assert.equal(source.source_url, "https://www.wired.com/story/openai-invests-in-sam-altmans-new-brain-tech-startup-merge-labs/");
  assert.equal(source.source_kind, "reporting", "The precise $252M is reporting, not an issuer-confirmed amount");
  assert.equal(source.reviewed_on, "2026-11-17");
  assert.match(source.note, /WIRED reports \$252 million/);
  assert.match(source.note, /PL Capital.*\$250M\+/);
  assert.match(source.note, /TechCrunch.*\$250 million/);
  assert.match(source.note, /(?:check size|checksize).*not disclosed/i);
  assert.match(source.note, /(?:legal |investment )?vehicle.*not disclosed/i);
  const index = buildFundingIndex(sources);
  const round = index.rounds.find((row) => row.companySlug === "merge-labs");
  assert.deepEqual(round.investors, ["OpenAI", "Bain Capital", "Gabe Newell", "PL Capital"]);
  assert.equal(round.amountUsdM, 252);
  assert.equal(index.rounds.length, 42);
  assert.equal(index.companies.length, 25);
  assert.equal(Number(index.rounds.reduce((sum, row) => sum + row.amountUsdM, 0).toFixed(2)), 3553.96);
});

test("participant evidence loads from the canonical sidecar onto only the exact existing round", async () => {
  assert.deepEqual(sources.investorEvidence, [{
    companySlug: "merge-labs", announcedOn: "2026-01-15", stage: "Seed", ...mergeInvestorEvidence,
  }]);
  const before = structuredClone(sources);
  const index = buildFundingIndex(sources);
  const merge = index.rounds.find((row) => row.companySlug === "merge-labs");
  assert.deepEqual(merge.investorEvidence, [mergeInvestorEvidence]);
  const generated = await readJson("src/data/funding-index.json");
  assert.deepEqual(generated.rounds, index.rounds, "Every generated financing matches the canonical builder, including participant evidence");
  assert.deepEqual(generated.investors, index.investors);
  assert.deepEqual([generated.summary.indexedRounds, generated.summary.selectedCompanies, generated.summary.observedCapitalUsdM], [42, 25, 3553.96]);
  assert.ok(index.rounds.filter((row) => row !== merge).every((row) => !Object.hasOwn(row, "investorEvidence")));
  const withoutEvidence = buildFundingIndex({ ...sources, investorEvidence: [] });
  const comparableRounds = structuredClone(index.rounds);
  for (const round of comparableRounds) delete round.investorEvidence;
  assert.deepEqual(comparableRounds, withoutEvidence.rounds, "Evidence cannot invent participants, amounts, dates, or rounds");
  assert.deepEqual(index.investors, withoutEvidence.investors, "Evidence is provenance, not a participation input");
  merge.investorEvidence[0].sourceExcerpt = "Caller mutation";
  assert.deepEqual(sources, before, "Attached evidence must not mutate its canonical source");
});

test("participant evidence rejects an unknown event instead of manufacturing or loosely matching a financing", () => {
  for (const [field, value] of [["companySlug", "not-in-the-screen"], ["announcedOn", "2026-01-16"], ["stage", "Series A"]]) {
    const invalid = structuredClone(sources);
    invalid.investorEvidence[0][field] = value;
    assert.throws(() => buildFundingIndex(invalid), /Unknown investor evidence event/, field);
  }
});

test("participant evidence cannot introduce an investor or borrow a display-family member's participation", () => {
  for (const investorName of ["Protocol Labs", "PLC Neurotech", "PL Capital-like", "pl capital"]) {
    const invalid = structuredClone(sources);
    invalid.investorEvidence[0].investorName = investorName;
    assert.throws(() => buildFundingIndex(invalid), /Investor evidence participant is not listed on event/, investorName);
  }
  const missing = structuredClone(sources);
  missing.rounds.find((row) => row.company_slug === "merge-labs").investors = "OpenAI;Bain Capital;Gabe Newell";
  assert.throws(() => buildFundingIndex(missing), /Investor evidence participant is not listed on event/, "Evidence does not create the missing raw participant");
});

test("participant evidence fails closed on malformed or unreviewed provenance", () => {
  const invalidFields = [
    ["sourceUrl", ""], ["sourceUrl", "http://example.org/post"], ["sourceUrl", "javascript:alert(1)"],
    ["reviewedOn", ""], ["reviewedOn", "2026-02-30"],
    ["sourceKind", ""], ["sourceKind", "portfolio"],
    ["sourceExcerpt", ""], ["sourceExcerpt", "   "], ["sourceExcerpt", 123],
    ["investorName", ""], ["investorName", " PL Capital"],
    ["companySlug", ""], ["announcedOn", ""], ["stage", ""],
  ];
  for (const [field, value] of invalidFields) {
    const invalid = structuredClone(sources);
    invalid.investorEvidence[0][field] = value;
    assert.throws(() => buildFundingIndex(invalid), /Invalid investor evidence/, field + ": " + JSON.stringify(value));
  }
  for (const investorEvidence of [null, {}, "not-an-array", [null], [[]]]) {
    assert.throws(() => buildFundingIndex({ ...sources, investorEvidence }), /Invalid investor evidence/);
  }
});

test("participant evidence rejects repeated event-investor-source citations", () => {
  const invalid = structuredClone(sources);
  invalid.investorEvidence.push({ ...invalid.investorEvidence[0], sourceExcerpt: "A second excerpt cannot duplicate the same citation." });
  assert.throws(() => buildFundingIndex(invalid), /Duplicate investor evidence/);
  const distinct = structuredClone(sources);
  distinct.investorEvidence.push({ ...distinct.investorEvidence[0], sourceUrl: "https://example.org/second-disclosure" });
  distinct.investorEvidence.push({ ...distinct.investorEvidence[0], investorName: "Bain Capital" });
  const index = buildFundingIndex(distinct);
  assert.equal(index.rounds.find((row) => row.companySlug === "merge-labs").investorEvidence.length, 3, "Separate sources or named participants are not duplicate citations");
});

test("PLC's ten published portfolio relationships stay separate from indexed financing and exact investor identities", async () => {
  const index = buildFundingIndex(sources);
  assert.ok(Array.isArray(index.portfolioDisclosures), "Build and load the separately sourced portfolio disclosures");
  const disclosure = index.portfolioDisclosures.find((item) => item.investorName === "Protocol Labs / PLC Neurotech");
  assert.ok(disclosure, "The reviewed display family must have a disclosure");
  assert.equal(disclosure.sourceInvestorName, "PLC Neurotech");
  assert.equal(disclosure.sourceUrl, "https://plcapital.xyz/neurotech");
  assert.equal(disclosure.reviewedOn, "2026-11-17");
  assert.deepEqual(disclosure.companies.map((company) => company.name), ["Echo", "EON", "Hemispheric", "Integral Neuro", "Merge Labs", "Netholabs", "Paradromics", "Precision", "Science Corp", "Synchron"]);
  assert.equal(new Set(disclosure.companies.map((company) => company.website)).size, 10);
  assert.deepEqual(disclosure.companies.filter((company) => company.companySlug).map((company) => company.companySlug).sort(), ["echo-neurotech", "merge-labs", "paradromics", "precision-neuroscience", "science-corporation", "synchron"]);
  const echo = disclosure.companies.find((company) => company.name === "Echo");
  assert.equal(echo.website, "https://www.echo.bio/");
  assert.ok(echo.matchSourceUrls.includes("https://www.echo.bio/"));
  assert.match(echo.matchNote, /Echo Neurotechnologies/);
  assert.equal(disclosure.companies.find((company) => company.name === "Merge Labs").website, "https://merge.io/blog");
  assert.deepEqual(disclosure.familyGrouping.memberNames, ["Protocol Labs", "PLC Neurotech"]);
  assert.equal(disclosure.familyGrouping.reviewedOn, "2026-11-17");
  assert.match(disclosure.familyGrouping.note, /display.only/i);
  assert.match(disclosure.note, /selected.*not exhaustive/i);
  assert.match(disclosure.note, /not.*(?:round|financing).*dates/i);
  assert.ok(disclosure.familyGrouping.sourceUrls.includes("https://plcapital.xyz/disclaimer"));
  const withoutPortfolio = buildFundingIndex({ ...sources, portfolioDisclosures: [] });
  assert.deepEqual(index.rounds, withoutPortfolio.rounds, "A portfolio listing is never synthesized into a financing");
  assert.deepEqual(index.investors, withoutPortfolio.investors, "A portfolio listing never increases financing counts or associated capital");
  assert.deepEqual(index.companies, withoutPortfolio.companies, "Off-screen portfolio companies must not expand the screened financing roster");
  // The neutral ranking now aggregates reviewed families; source-label counts
  // remain reproducible without grouping and round histories remain exact.
  const ungrouped = buildFundingIndex({ ...sources, investorGroups: [] });
  assert.deepEqual(ungrouped.investors.filter((investor) => ["Protocol Labs", "PLC Neurotech", "PL Capital"].includes(investor.name)).sort((a, b) => a.name.localeCompare(b.name)), [
    { name: "PL Capital", roundCount: 1, companyCount: 1, associatedCapitalUsdM: 252 },
    { name: "PLC Neurotech", roundCount: 1, companyCount: 1, associatedCapitalUsdM: 400 },
    { name: "Protocol Labs", roundCount: 2, companyCount: 2, associatedCapitalUsdM: 207.5 },
  ]);
  assert.deepEqual(index.rounds, ungrouped.rounds, "Display grouping does not rename source investors in financing histories");
  assert.deepEqual(index.investors.find((investor) => investor.name === "Protocol Labs / PLC Neurotech"), {
    name: "Protocol Labs / PLC Neurotech", roundCount: 4, companyCount: 4, associatedCapitalUsdM: 859.5,
  });
  for (const company of disclosure.companies) {
    for (const field of ["announcedOn", "stage", "amountUsdM", "roundCount", "associatedCapitalUsdM"]) {
      assert.equal(field in company, false, `A portfolio relationship must not invent ${field}`);
    }
  }
  const generated = await readJson("src/data/funding-index.json");
  assert.deepEqual(generated.portfolioDisclosures, index.portfolioDisclosures);
});


test("portfolio provenance fails closed on unsupported relationships or financing-shaped data", () => {
  const invalidCases = [
    [(row) => { row.sourceUrl = ""; }, /Invalid portfolio provenance/],
    [(row) => { row.sourceInvestorName = ""; }, /Invalid portfolio provenance/],
    [(row) => { row.reviewedOn = "2026-02-30"; }, /Invalid portfolio provenance/],
    [(row) => { row.familyGrouping.reviewedOn = "not-a-date"; }, /Invalid portfolio family grouping/],
    [(row) => { row.familyGrouping.sourceUrls = []; }, /Invalid portfolio family grouping/],
    [(row) => { row.companies[0].companySlug = "not-in-the-bci-screen"; }, /Unknown portfolio company/],
    [(row) => { row.companies.push(structuredClone(row.companies[0])); }, /Duplicate portfolio company/],
    [(row) => { row.companies[0].website = "http://example.com"; }, /Invalid portfolio company/],
    [(row) => { row.companies[0].amountUsdM = 50; }, /Portfolio relationship cannot contain financing fields/],
    [(row) => { row.companies[0].stage = "Series A"; }, /Portfolio relationship cannot contain financing fields/],
  ];
  for (const [mutate, expected] of invalidCases) {
    const invalid = structuredClone(sources);
    mutate(invalid.portfolioDisclosures[0]);
    assert.throws(() => buildFundingIndex(invalid), expected);
  }
});


test("latest-stage grouping unifies unlabeled investment and financing without mutating source round labels", async () => {
  const helpers = await import("../scripts/lib/funding-index.mjs");
  const undisclosed = ["Investment", "Financing", "Stage undisclosed", "Financing stage undisclosed", "Investment stage undisclosed", "Undisclosed", "unspecified", "", "  Investment  ", "Investment (stage undisclosed)", "Financing (stage undisclosed)"];
  const named = ["Pre-seed", "Seed", "Seed extension", "Pre-Series A", "Series A", "Series B1", "Series C", "Series D", "Series E", "Angel + pre-Series A (combined)", "Government backing", "Funding commitment", "Strategic round"];
  for (const stage of [...undisclosed, ...named]) {
    const rounds = [{ companySlug: "example", announcedOn: "2026-01-01", amountUsdM: 5, stage }];
    const before = structuredClone(rounds);
    const [row] = helpers.buildCompanyRows([{ slug: "example", name: "Example", modality: "BCI", scope: "Implanted", indication: "Paralysis" }], rounds, { query: "", scope: "All", modality: "All" });
    assert.equal(row.latestStage, undisclosed.includes(stage) ? "Undisclosed" : stage, `Latest-stage group for ${JSON.stringify(stage)}`);
    assert.equal(row.rounds[0].stage, stage, "Record display retains the original source stage");
    assert.deepEqual(rounds, before, "Grouping must not mutate canonical or caller-provided rounds");
    assert.equal(helpers.normalizeFundingStage(stage), row.latestStage);
  }
  const index = buildFundingIndex(sources);
  const [blackrock] = helpers.buildCompanyRows(index.companies, index.rounds, { query: "Blackrock", scope: "All", modality: "All" });
  assert.equal(blackrock.latestStage, "Undisclosed");
  assert.equal(blackrock.rounds[0].stage, "Investment");
  const [neuracle] = helpers.buildCompanyRows(index.companies, index.rounds, { query: "Neuracle", scope: "All", modality: "All" });
  assert.equal(neuracle.latestStage, "Undisclosed");
  assert.equal(neuracle.rounds[0].stage, "Financing (stage undisclosed)");
});
