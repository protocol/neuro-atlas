import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("milestone timeline includes screened 2024 and 2025 pathway events", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const milestones = JSON.parse(await readFile(path.join(here, "..", "src", "data", "milestones.json"), "utf8"));
  const years = Object.fromEntries(
    ["2024", "2025", "2026"].map((year) => [year, milestones.filter((row) => (row.date ?? "").startsWith(year)).length]),
  );
  assert.equal(years["2024"] >= 10, true, JSON.stringify(years));
  assert.equal(years["2025"] >= 5, true, JSON.stringify(years));
  assert.equal(years["2026"] >= 28, true, JSON.stringify(years));
  assert.equal(milestones.some((row) => row.company === "Neuralink" && row.activity === "FIH"), true);
  assert.equal(milestones.some((row) => row.company === "Precision Neuroscience" && row.activity === "510(k)"), true);
});

test("2024–25 capital lane includes mega-rounds; year bars stay independent", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const milestones = JSON.parse(await readFile(path.join(here, "..", "src", "data", "milestones.json"), "utf8"));
  const timeline = await readFile(path.join(here, "..", "src", "components", "milestone-timeline.tsx"), "utf8");
  const capital = milestones.filter((row) => row.stage === "capital");
  const has = (company, date, amount) =>
    capital.some((row) => row.company === company && row.date === date && row.amountUsdM === amount);

  assert.equal(has("Blackrock Neurotech", "2024-04-29", 200), true);
  assert.equal(has("Neuralink", "2025-06-02", 650), true);
  assert.equal(has("Synchron", "2025-11-06", 200), true);
  assert.equal(has("Precision Neuroscience", "2024-12-16", 102), true);
  assert.equal(has("Precision Neuroscience", "2026-09-24", 250), true);
  assert.equal(
    capital.some((row) => row.company === "Science Corp" && (row.date ?? "").startsWith("2025")),
    true,
  );

  // Year-column heroes are sourced capital *raised* (sum of dots), not the memo bars.
  // 2026 is no longer labeled Jan–Apr: later sourced events sit on the same year lane.
  assert.match(timeline, /capitalRaisedInYear/);
  assert.match(timeline, />raised</);
  assert.doesNotMatch(timeline, /Jan–Apr/);
  assert.doesNotMatch(timeline, /new capital\{y\.year === 2026/);
  // Removing the visible Memo cut does not alter its archived source data.
  const capitalJson = JSON.parse(await readFile(path.join(here, "..", "src", "data", "capital.json"), "utf8"));
  assert.deepEqual(
    capitalJson.map((row) => [row.year, row.usdM]),
    [[2024, 260], [2025, 322], [2026, 653]],
  );

  const recent = capital.filter((row) => /^(2024|2025)/.test(row.date ?? ""));
  assert.equal(
    recent.every((row) => typeof row.sourceUrl === "string" && row.sourceUrl.startsWith("https://")),
    true,
  );
  const sumYear = (year) =>
    recent
      .filter((row) => (row.date ?? "").startsWith(String(year)) && row.amountUsdM)
      .reduce((sum, row) => sum + row.amountUsdM, 0);
  assert.equal(sumYear(2024) > 260, true, `2024 lane ${sumYear(2024)} should exceed the $260m bar once mega-rounds are on`);
  assert.equal(sumYear(2025) > 322, true, `2025 lane ${sumYear(2025)} should exceed the $322m bar once mega-rounds are on`);
});
