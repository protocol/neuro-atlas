import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FirmLogo } from "../src/components/firm-logo.tsx";

globalThis.React = React;
const root = path.resolve(import.meta.dirname, "..");
const restored = [
  "merge-labs", "science-corp", "neurosoft-bioelectronics", "stairmed", "axoft",
  "onward-medical", "precision-neuroscience", "neuracle", "synchron", "gestala",
  "enspire-dbs", "ruten-neuro", "motif-neurotech", "cortec", "inbrain-neuroelectronics",
  "phantom-neuro", "neuroxess", "paradromics", "nia-therapeutics", "revision-implant",
  "neuralink", "newronika", "blackrock-neurotech",
];
const aliases = { "science-corporation": "science-corp", "neuracle-technology": "neuracle" };

// Rebuild the real consumers, not a hand-maintained test-only mapping.
test("independently sourced company logos survive regeneration in both Atlas views", () => {
  const run = spawnSync(process.execPath, ["scripts/generate-derived.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const milestones = JSON.parse(fs.readFileSync(path.join(root, "src/data/milestones.json")));
  const funding = JSON.parse(fs.readFileSync(path.join(root, "src/data/funding-index.json")));
  const missing = restored.filter(slug => !milestones.some(row => row.slug === slug && row.logo));
  assert.deepEqual(missing, [], "Previously pictured milestone companies must not silently revert to initials");
  for (const company of funding.companies) {
    if (restored.includes(aliases[company.slug] ?? company.slug)) {
      assert.ok(company.logo, `${company.name} must retain its company logo`);
    }
  }
  for (const row of [...milestones, ...funding.companies]) {
    if (!row.logo) continue;
    assert.match(row.logo, /^\/logos\/[a-z0-9-]+\.(png|jpg|ico)$/);
    const basename = path.basename(row.logo);
    const canonical = fs.readFileSync(path.join(root, "data/logos", basename));
    assert.ok(canonical.length > 100, `${basename} must be a real asset`);
    assert.deepEqual(fs.readFileSync(path.join(root, "public/logos", basename)), canonical);
  }
  assert.ok(!fs.existsSync(path.join(root, "src/data/landscape.json")), "Do not restore the copied directory");
});

test("restored assets retain independent provenance and exact integrity", () => {
  const { logos } = JSON.parse(fs.readFileSync(path.join(root, "data/logos/restored-sources.json")));
  assert.deepEqual(logos.map(row => row.slug).sort(), [...restored].sort());
  for (const logo of logos) {
    assert.equal(logo.file, `${logo.slug}.png`);
    assert.equal(new URL(logo.source_url).protocol, "https:");
    assert.equal(new URL(logo.official_url).protocol, "https:");
    assert.doesNotMatch(logo.source_url, /neurofounders|69401bfa528d1f131f2aa9ca/i);
    const bytes = fs.readFileSync(path.join(root, "data/logos", logo.file));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), logo.sha256);
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  }
});

test("logo renderer uses images when available and retains initials for genuinely unavailable logos", () => {
  const image = renderToStaticMarkup(React.createElement(FirmLogo, { name: "Neuralink", src: "/logos/neuralink.png", size: 24 }));
  assert.match(image, /<img/);
  assert.ok(image.includes(`src="${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logos/neuralink.png"`));
  assert.match(image, /width="24"/);
  const fallback = renderToStaticMarkup(React.createElement(FirmLogo, { name: "Unavailable", src: null }));
  assert.doesNotMatch(fallback, /<img/);
  assert.match(fallback, />U<\/span>/);
});
