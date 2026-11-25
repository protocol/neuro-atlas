import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseCsv } from "../scripts/lib/funding-index.mjs";

// Current source contract, not a historical projection. The founder post's
// datePublished is 2025-11-03T22:01:00.944Z; Nov 4 is later reporting.
// Full participant roster checked against the public founder announcement;
// source-specific short identities remain unchanged by the Nov 25 review.
const expected = {
  companySlug: "coherence-neuro", announcedOn: "2025-11-03", dateBasis: "announcement",
  stage: "Seed", amountUsdM: 10,
  sourceUrl: "https://www.linkedin.com/posts/elise-jenkins-_coherence-neuro-has-raised-a-10m-seed-round-activity-7391232963549487105-N1eH/",
  investors: ["Topology", "Artesian", "Blackbird", "Possible", "XEIA", "Michael Akilian/Thales", "Jumpspace Ventures", "Xtal", "Divergent", "SmartGateVC", "Spacewalk VC", "Matt Krisiloff", "Linhao Zhang", "Tim Shi"],
  note: "Seed co-led by Topology Ventures and Artesian. Blackbird and Possible Ventures are identified as continuing pre-seed backers; other investor and angel names follow the founder’s announcement. Michael Akilian/Thales follows the source’s combined label.",
  sourceKind: "primary", reviewedOn: "2026-11-25",
  previousStoredInvestors: ["SV Health Investors", "BrightEdge", "Innovation Endeavors", "Astellas Venture Management"],
};
const matches = (round) => round.companySlug === expected.companySlug
  && round.announcedOn === expected.announcedOn && round.stage === expected.stage;

export function assertCoherenceSeed(round) {
  assert.ok(round, 'The unique current Coherence seed disclosure must exist');
  for (const key of ["companySlug", "announcedOn", "dateBasis", "stage", "amountUsdM", "sourceUrl", "investors", "note", "sourceKind", "reviewedOn"]) {
    assert.deepEqual(round[key], expected[key], key);
  }
}

test("Coherence's current canonical seed preserves the founder publication date and full investor roster", async () => {
  const sources = { rounds: parseCsv(await readFile(new URL("../data/funding-index/rounds.csv", import.meta.url), "utf8")) };
  const rounds = sources.rounds.filter((round) => round.company_slug === expected.companySlug
    && round.announced_on === expected.announcedOn && round.stage === expected.stage);
  assert.equal(rounds.length, 1);
  const round = rounds[0];
  assertCoherenceSeed({
    companySlug: round.company_slug, announcedOn: round.announced_on, dateBasis: round.date_basis, stage: round.stage,
    amountUsdM: Number(round.amount_usd_m), sourceUrl: round.source_url,
    investors: round.investors.split(";"), note: round.note,
    sourceKind: round.source_kind, reviewedOn: round.reviewed_on,
  });
});

test("Coherence's current shipped seed preserves both leads, all 14 backers and the founder publication date", async () => {
  const data = JSON.parse(await readFile(new URL("../src/data/funding-index.json", import.meta.url), "utf8"));
  const rounds = data.rounds.filter(matches);
  assert.equal(rounds.length, 1);
  assertCoherenceSeed(rounds[0]);
  assert.equal(rounds[0].investors.length, 14);
  assert.equal(new Set(rounds[0].investors).size, 14);
  assert.match(rounds[0].note, /co-led by Topology Ventures and Artesian/);
  assert.match(rounds[0].note, /continuing pre-seed backers/);
});

test("Coherence's current seed flows into the source-specific investor identities and independent capital rollups", async () => {
  const data = JSON.parse(await readFile(new URL("../src/data/funding-index.json", import.meta.url), "utf8"));
  const seed = data.rounds.find(matches);
  assertCoherenceSeed(seed);
  for (const name of expected.investors) {
    const associated = data.rounds.filter((round) => round.investors.includes(name));
    for (const round of associated) assert.ok([undefined, '', 'overlap-unresolved', 'superseded', 'scope-unresolved'].includes(round.capitalTreatment), `Known capital treatment: ${name}`);
    const actual = data.investors.filter((investor) => investor.name === name);
    assert.equal(actual.length, 1, name);
    assert.equal(actual[0].roundCount, associated.length, name);
    assert.equal(actual[0].companyCount, new Set(associated.map((round) => round.companySlug)).size, name);
    const included = associated.filter(round => !['overlap-unresolved', 'superseded', 'scope-unresolved'].includes(round.capitalTreatment));
    assert.equal(actual[0].associatedCapitalUsdM, Number(included.reduce((sum, round) => sum + round.amountUsdM, 0).toFixed(2)), name);
  }
  for (const name of expected.previousStoredInvestors) assert.ok(!seed.investors.includes(name), name);
  for (const name of ["Topology", "Artesian", "Blackbird", "Possible", "XEIA", "Xtal", "Divergent"]) {
    const investor = data.investors.find((row) => row.name === name);
    assert.ok(investor.roundCount >= 2, name);
  }
});
