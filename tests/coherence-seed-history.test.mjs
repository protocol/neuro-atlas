import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseCsv } from "../scripts/lib/funding-index.mjs";
import { readCopyDataFile } from "./helpers/sitewide-copy-data.mjs";

const expected = JSON.parse(await readFile(new URL("./fixtures/coherence-seed-20261116.json", import.meta.url), "utf8"));
const matches = (round) => round.companySlug === expected.companySlug
  && round.announcedOn === expected.announcedOn && round.stage === expected.stage;

export function assertCoherenceSeed(round) {
  assert.ok(round);
  for (const key of ["companySlug", "announcedOn", "stage", "amountUsdM", "sourceUrl", "investors", "note", "sourceKind", "reviewedOn"]) {
    assert.deepEqual(round[key], expected[key], key);
  }
}

test("Coherence's canonical seed investors match the full founder announcement", async () => {
  const sources = { rounds: parseCsv(await readCopyDataFile(new URL("../data/funding-index/rounds.csv", import.meta.url), "utf8")) };
  const rounds = sources.rounds.filter((round) => round.company_slug === expected.companySlug
    && round.announced_on === expected.announcedOn && round.stage === expected.stage);
  assert.equal(rounds.length, 1);
  const round = rounds[0];
  assertCoherenceSeed({
    companySlug: round.company_slug, announcedOn: round.announced_on, stage: round.stage,
    amountUsdM: Number(round.amount_usd_m), sourceUrl: round.source_url,
    investors: round.investors.split(";"), note: round.note,
    sourceKind: round.source_kind, reviewedOn: round.reviewed_on,
  });
});

test("Coherence's shipped seed record preserves both leads and all named backers", async () => {
  const data = JSON.parse(await readCopyDataFile(new URL("../src/data/funding-index.json", import.meta.url), "utf8"));
  const rounds = data.rounds.filter(matches);
  assert.equal(rounds.length, 1);
  assertCoherenceSeed(rounds[0]);
  assert.equal(rounds[0].investors.length, 14);
  assert.equal(new Set(rounds[0].investors).size, 14);
  assert.match(rounds[0].note, /co-led by Topology Ventures and Artesian/);
  assert.match(rounds[0].note, /continuing pre-seed backers/);
});

test("Coherence seed correction flows into existing investor identities and rollups", async () => {
  const data = JSON.parse(await readCopyDataFile(new URL("../src/data/funding-index.json", import.meta.url), "utf8"));
  const seed = data.rounds.find(matches);
  assertCoherenceSeed(seed);
  for (const name of expected.investors) {
    const associated = data.rounds.filter((round) => round.investors.includes(name));
    const actual = data.investors.filter((investor) => investor.name === name);
    assert.equal(actual.length, 1, name);
    assert.equal(actual[0].roundCount, associated.length, name);
    assert.equal(actual[0].companyCount, new Set(associated.map((round) => round.companySlug)).size, name);
    assert.equal(actual[0].associatedCapitalUsdM, Number(associated.reduce((sum, round) => sum + round.amountUsdM, 0).toFixed(2)), name);
  }
  for (const name of expected.previousStoredInvestors) assert.ok(!seed.investors.includes(name), name);
  for (const name of ["Topology", "Artesian", "Blackbird", "Possible", "XEIA", "Xtal", "Divergent"]) {
    const investor = data.investors.find((row) => row.name === name);
    assert.ok(investor.roundCount >= 2, name);
  }
});
