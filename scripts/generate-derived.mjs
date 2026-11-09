#!/usr/bin/env node
// Generates src/data/*.json from the canonical files in data/.
// Run after editing anything in data/:  node scripts/generate-derived.mjs

import fs from "node:fs";
import path from "node:path";
import { buildFundingIndex, loadFundingIndexSources } from "./lib/funding-index.mjs";
import { historicalFxFor } from "./lib/historical-fx.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data");
const OUT = path.join(ROOT, "src", "data");
const PUB_LOGOS = path.join(ROOT, "public", "logos");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PUB_LOGOS, { recursive: true });

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); cell = ""; if (row.some((x) => x !== "")) rows.push(row); row = []; }
    else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); if (row.some((x) => x !== "")) rows.push(row); }
  const [header, ...rest] = rows;
  return rest.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ── Logos manifest ────────────────────────────────────────────────────────────
const manifest = parseCSV(fs.readFileSync(path.join(DATA, "logos", "manifest.csv"), "utf8"));
const logoBySlug = Object.fromEntries(
  manifest.filter((m) => m.status === "ok").map((m) => [m.slug, m.file]),
);

// ── Milestones ────────────────────────────────────────────────────────────────
const msRows = parseCSV(fs.readFileSync(path.join(DATA, "market-memo-q1-2026", "milestones.csv"), "utf8"));
const fxConversions = JSON.parse(fs.readFileSync(path.join(DATA, "funding-index", "fx-conversions.json"), "utf8"));
const usedLogos = new Set();
const milestones = msRows.map((r) => {
  const slug = slugify(r.company);
  const logoFile = logoBySlug[slug];
  if (logoFile) usedLogos.add(logoFile);
  const converted = historicalFxFor(r.source_url, r.date, fxConversions);
  if (converted && r.amount_usd_m) throw new Error(`Conflicting historical FX milestone: ${r.source_url}`);
  return {
    company: r.company,
    slug,
    activity: r.activity,
    stage: r.stage,
    amountUsdM: converted?.amountUsdM ?? (r.amount_usd_m ? Number(r.amount_usd_m) : null),
    ...(converted ? { fx: converted.fx } : {}),
    date: r.date || null,
    datePrecision: r.date_precision || "window",
    note: r.note || null,
    sourceUrl: r.source_url || null,
    logo: logoFile ? `/logos/${logoFile}` : null,
    scope: r.scope || "bci",
  };
});
fs.writeFileSync(path.join(OUT, "milestones.json"), JSON.stringify(milestones, null, 2));

// Copy only independently sourced logos referenced by milestones.
for (const f of usedLogos) {
  const src = path.join(DATA, "logos", f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(PUB_LOGOS, f));
}

// ── Acronyms (tooltip glossary) ───────────────────────────────────────────────
const acr = parseCSV(fs.readFileSync(path.join(DATA, "glossary", "acronyms.csv"), "utf8"));
fs.writeFileSync(
  path.join(OUT, "acronyms.json"),
  JSON.stringify(Object.fromEntries(acr.map((a) => [a.acronym, { expansion: a.expansion, definition: a.definition }])), null, 2),
);

// ── Field velocity (copy through) ─────────────────────────────────────────────
const velDir = path.join(OUT, "velocity");
fs.mkdirSync(velDir, { recursive: true });
for (const f of ["instruments.json", "neurotech_records.json", "neurotech_inflection_points.json", "neurotech_market_signals.json"]) {
  fs.copyFileSync(path.join(DATA, "field-velocity", f), path.join(velDir, f));
}

// ── Capital by year ───────────────────────────────────────────────────────────
const cap = parseCSV(fs.readFileSync(path.join(DATA, "market-memo-q1-2026", "capital_by_year.csv"), "utf8"));
fs.writeFileSync(
  path.join(OUT, "capital.json"),
  JSON.stringify(cap.map((r) => ({ year: Number(r.year), usdM: Number(r.new_capital_usd_m), note: r.period_note })), null, 2),
);

// ── Screened funding index ───────────────────────────────────────────────────
const fundingIndex = buildFundingIndex(await loadFundingIndexSources(path.join(DATA, "funding-index")));
const fundingLogoAliases = {
  "science-corporation": "science-corp",
  "neuracle-technology": "neuracle",
  "neucyber-neurotech": "neu-cyber-technology",
};
fundingIndex.companies = fundingIndex.companies.map((company) => {
  const logoFile = logoBySlug[fundingLogoAliases[company.slug] ?? company.slug];
  if (logoFile) {
    fs.copyFileSync(path.join(DATA, "logos", logoFile), path.join(PUB_LOGOS, logoFile));
  }
  return { ...company, logo: logoFile ? `/logos/${logoFile}` : "" };
});
const observedCapitalUsdM = fundingIndex.rounds.reduce((total, round) => total + round.amountUsdM, 0);
const years = fundingIndex.rounds.map((round) => Number(round.announcedOn.slice(0, 4)));
fundingIndex.summary = {
  ...fundingIndex.summary,
  selectedCompanies: fundingIndex.companies.length,
  indexedRounds: fundingIndex.rounds.length,
  regulatoryMilestones: fundingIndex.milestones.length,
  observedCapitalUsdM: Number(observedCapitalUsdM.toFixed(2)),
  firstYear: Math.min(...years),
  lastYear: Math.max(...years),
  asOf: "2026-09-30",
};
fundingIndex.methodology = {
  thresholdUsdM: 2,
  scope: "Selected implanted, minimally invasive, and implant-adjacent BCI companies with at least one publicly sourced financing of $2m or more.",
  coverage: "Publicly disclosed indexed rounds, not an exhaustive funding-to-date total. Company histories remain partial. Amounts are reported financing values or explicitly sourced historical FX estimates; new conversions use the investment date when disclosed, otherwise a labeled announcement-date fallback. Rates and native amounts are pinned, not revalued at current rates. Legacy reported USD values are retained; unsourced conversions, cumulative totals and standalone grants are not added.",
};
fs.writeFileSync(path.join(OUT, "funding-index.json"), JSON.stringify(fundingIndex));

console.log(`milestones: ${milestones.length} | acronyms: ${acr.length} | logos copied: ${usedLogos.size}`);
