import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

test("milestones dataset reconciles all 25 Funding Index companies and events", async () => {
  const milestones = JSON.parse(await readFile(path.join(root, "src", "data", "milestones.json"), "utf8"));
  const fundingIndex = JSON.parse(await readFile(path.join(root, "src", "data", "funding-index.json"), "utf8"));

  const msCompanySlugs = new Set(milestones.map((m) => m.slug));
  const fiAliases = {
    "science-corporation": "science-corp",
    "neuracle-technology": "neuracle",
  };

  // Every company in the screened BCI Funding Index is now represented in Milestones
  for (const comp of fundingIndex.companies) {
    const slug = fiAliases[comp.slug] ?? comp.slug;
    assert.equal(msCompanySlugs.has(slug), true, `Missing from milestones: ${comp.name} (${comp.slug})`);
  }

  // Reconciled specific events
  assert.equal(
    milestones.some((m) => m.company === "NeuCyber NeuroTech" && m.amountUsdM === 29 && m.stage === "capital"),
    true,
    "NeuCyber $29m government backing should be in milestones",
  );
  assert.equal(
    milestones.some((m) => m.company === "Neurosoft Bioelectronics" && m.amountUsdM === 7.5 && m.stage === "capital"),
    true,
    "Neurosoft $7.5m seed should be in milestones",
  );
  assert.equal(
    milestones.some((m) => m.company === "Science Corp" && m.activity === "CE" && m.stage === "commercial"),
    true,
    "Science Corp PRIMA CE mark should be in milestones",
  );
});

test("milestones entries carry scope tag (bci vs broader)", async () => {
  const milestones = JSON.parse(await readFile(path.join(root, "src", "data", "milestones.json"), "utf8"));
  assert.equal(milestones.every((m) => m.scope === "bci" || m.scope === "broader"), true);

  const bciCount = milestones.filter((m) => m.scope === "bci").length;
  const broaderCount = milestones.filter((m) => m.scope === "broader").length;
  assert.equal(bciCount > 30, true, `Expected >30 BCI milestones, got ${bciCount}`);
  assert.equal(broaderCount > 20, true, `Expected >20 broader neuro milestones, got ${broaderCount}`);
});

test("milestone timeline UI supports BCI filter toggle and non-exclusive copy", async () => {
  const timeline = await readFile(path.join(root, "src", "components", "milestone-timeline.tsx"), "utf8");
  const milestonesPage = await readFile(path.join(root, "src", "app", "milestones", "page.tsx"), "utf8");
  const section = await readFile(path.join(root, "src", "components", "sections", "milestones-section.tsx"), "utf8");

  // Filter controls
  assert.match(timeline, /scopeFilter/);
  assert.match(timeline, /All neurotech/);
  assert.match(timeline, /BCI only/);

  // Wording no longer claims implanted-BCI only
  assert.doesNotMatch(milestonesPage, /implanted-BCI field/);
  assert.doesNotMatch(section, /implanted-BCI field/);
});

test("contribute via PR button is present across plates and navigation", async () => {
  const hero = await readFile(path.join(root, "src", "components", "plate-header.tsx"), "utf8");
  const nav = await readFile(path.join(root, "src", "components", "site-nav.tsx"), "utf8");
  const methodology = await readFile(path.join(root, "src", "app", "methodology", "page.tsx"), "utf8");

  assert.match(hero, /https:\/\/github\.com\/protocol\/neuro-atlas\/pulls/);
  assert.match(hero, /Contribute via PR/);

  assert.match(nav, /https:\/\/github\.com\/protocol\/neuro-atlas\/pulls/);
  assert.match(nav, /Contribute via PR/);

  assert.match(methodology, /https:\/\/github\.com\/protocol\/neuro-atlas\/pulls/);
  assert.match(methodology, /Open a Pull Request on GitHub/);
});
