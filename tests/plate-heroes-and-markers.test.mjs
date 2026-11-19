import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

test("data plates use the shared dark PlateHero", async () => {
  const pages = [
    "src/app/milestones/page.tsx",
    "src/app/funding/page.tsx",
    "src/app/field-velocity/page.tsx",
  ];
  for (const rel of pages) {
    const src = await readFile(path.join(root, rel), "utf8");
    assert.match(src, /PlateHero/, rel);
    assert.doesNotMatch(src, /PlateHeader/, rel);
  }
});

test("methodology uses the requested compact dark title without a subtitle", async () => {
  const src = await readFile(path.join(root, "src/app/methodology/page.tsx"), "utf8");
  const header = src.match(/<header\b[\s\S]*?<\/header>/)?.[0];
  assert.ok(header, "methodology retains a semantic header");
  assert.match(header, /bg-\[#101217\]/);
  assert.match(header, /<h1\b[^>]*>Sources &amp; methodology<\/h1>/);
  assert.doesNotMatch(header, /<p\b|subtitle=|PlateHero|PlateHeader/);
});

test("funding-index markers use a real hover tooltip, not native title", async () => {
  const src = await readFile(path.join(root, "src/components/funding-index-dashboard.tsx"), "utf8");
  assert.match(src, /showMarkerTip/);
  assert.match(src, /markerTip &&/);
  assert.doesNotMatch(src, /title=\{markerTitle/);
});

test("glossary covers the regulatory markers on the funding index", async () => {
  const acronyms = JSON.parse(await readFile(path.join(root, "src/data/acronyms.json"), "utf8"));
  const index = JSON.parse(await readFile(path.join(root, "src/data/funding-index.json"), "utf8"));
  const markers = [...new Set(index.milestones.map((row) => row.marker))];
  assert.deepEqual(markers.sort(), ["BDD", "CE", "IDE", "NMPA", "Pivotal (planned)", "TAP"]);
  for (const marker of markers) {
    assert.equal(Boolean(acronyms[marker]?.expansion), true, marker);
  }
});

test("plate heroes top-align title and stats so short copy does not leave a gap", async () => {
  const src = await readFile(path.join(root, "src/components/plate-header.tsx"), "utf8");
  assert.match(src, /lg:items-start/);
  assert.doesNotMatch(src, /lg:items-end/);
});

test("nav and home directory name the capital plate BCI Funding Index", async () => {
  const nav = await readFile(path.join(root, "src/components/site-nav.tsx"), "utf8");
  const home = await readFile(path.join(root, "src/app/page.tsx"), "utf8");
  assert.match(nav, /label: "BCI Funding Index"/);
  assert.doesNotMatch(nav, /label: "Funding index"/);
  assert.match(home, /title: "BCI Funding Index"/);
});

test("funding plate hero title is BCI Funding Index on one phrase, no leading The", async () => {
  const src = await readFile(path.join(root, "src/app/funding/page.tsx"), "utf8");
  assert.match(src, /title="BCI Funding Index"/);
  assert.doesNotMatch(src, /title="The BCI Funding Index"/);
});

test("plate hero titles do not force a two-line balance", async () => {
  const src = await readFile(path.join(root, "src/components/plate-header.tsx"), "utf8");
  assert.doesNotMatch(src, /text-balance/);
  assert.match(src, /clamp\(2\.35rem/);
});

