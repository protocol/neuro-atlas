import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadFundingIndexSources } from "../scripts/lib/funding-index.mjs";

// GlobeNewswire resolves the numeric story ID, even when the headline slug is wrong.
// Story 2997364 is Precision's December 16, 2024 $102m Series C announcement.
// Story 2997688 is an unrelated Ress Life Investments NAV announcement.
const precisionSeriesCSource = "https://www.globenewswire.com/news-release/2024/12/16/2997364/0/en/Precision-Neuroscience-Raises-102-Million-to-Advance-AI-Powered-Brain-Implant.html";

function isPrecisionSeriesC(round) {
  return round.companySlug === "precision-neuroscience"
    && round.announcedOn === "2024-12-16"
    && round.stage === "Series C";
}

test("Precision's canonical Series C record cites its own financing release", async () => {
  const sources = await loadFundingIndexSources(new URL("../data/funding-index/", import.meta.url).pathname);
  const rounds = sources.rounds.filter((round) => round.company_slug === "precision-neuroscience"
    && round.announced_on === "2024-12-16"
    && round.stage === "Series C");

  assert.equal(rounds.length, 1);
  assert.equal(rounds[0].source_url, precisionSeriesCSource);
  assert.equal(rounds[0].amount_usd_m, "102");
});

test("Precision's shipped Series C record preserves the corrected source link", async () => {
  const funding = JSON.parse(await readFile(new URL("../src/data/funding-index.json", import.meta.url), "utf8"));
  const rounds = funding.rounds.filter(isPrecisionSeriesC);

  assert.equal(rounds.length, 1);
  assert.equal(rounds[0].sourceUrl, precisionSeriesCSource);
  assert.equal(rounds[0].amountUsdM, 102);
});
