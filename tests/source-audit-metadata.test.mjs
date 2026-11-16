import test from "node:test";
import assert from "node:assert/strict";
import { buildFundingIndex, loadFundingIndexSources } from "../scripts/lib/funding-index.mjs";

// Source passages and conservative limits are recorded in
// docs/source-audit-20261116/metadata-evidence.md. Exercise canonical CSVs and
// their real in-memory derived output without rewriting generated JSON.
const sources = await loadFundingIndexSources(new URL("../data/funding-index/", import.meta.url).pathname);
const index = buildFundingIndex(sources);

function companyFields(slug, expected) {
  const canonical = sources.companies.find((company) => company.slug === slug);
  const derived = index.companies.find((company) => company.slug === slug);
  assert.ok(canonical, `Missing canonical company: ${slug}`);
  assert.ok(derived, `Missing derived company: ${slug}`);
  for (const [field, value] of Object.entries(expected)) {
    assert.equal(canonical[field], value, `${slug}.${field} in canonical CSV`);
    const derivedField = field === "interface_depth" ? "interfaceDepth" : field;
    assert.equal(derived[derivedField], value, `${slug}.${derivedField} in derived output`);
  }
}

function foundingFields(slug, expected) {
  const canonical = sources.foundings.find((founding) => founding.company_slug === slug);
  const derived = index.companies.find((company) => company.slug === slug)?.founding;
  assert.ok(canonical, `Missing canonical founding: ${slug}`);
  assert.ok(derived, `Missing derived founding: ${slug}`);
  const derivedFields = { founding_year: "year", source_url: "sourceUrl", source_kind: "sourceKind", reviewed_on: "reviewedOn", note: "note" };
  for (const [field, value] of Object.entries(expected)) {
    assert.equal(canonical[field], value, `${slug}.${field} in canonical CSV`);
    assert.equal(derived[derivedFields[field]], field === "founding_year" ? Number(value) : value,
      `${slug}.${derivedFields[field]} in derived output`);
  }
}

test("Precision limits its metadata indication to paralysis", () => {
  companyFields("precision-neuroscience", { indication: "Paralysis" });
});

test("Paradromics uses the source product name Connexus BCI", () => {
  companyFields("paradromics", {"modality": "Connexus BCI"});
});

test("Axoft describes a soft neural interface without inferring polymer chemistry", () => {
  companyFields("axoft", {"modality": "Soft Neural Interface"});
});

test("Nia targets memory loss without restricting its cause", () => {
  companyFields("nia-therapeutics", {"indication": "Memory loss"});
});

test("Coherence identifies SOMA while retaining its cancer indication", () => {
  companyFields("coherence-neuro", {"modality": "SOMA Brain-computer Interface", "indication": "Cancer"});
});

test("NeuroXess names its implantable flexible BCI without an unsupported throughput label", () => {
  companyFields("neuroxess", {"modality": "Implantable Flexible BCI"});
});

test("Gestala describes ultrasound BCI and intended neurological-disorder treatment", () => {
  companyFields("gestala", {"modality": "Ultrasound BCI", "indication": "Neurological disorders (in development)"});
});

test("Motif describes DOT neuromodulation without claiming deep-brain hardware placement", () => {
  companyFields("motif-neurotech", {"modality": "DOT Neuromodulation", "interface_depth": "", "indication": "Treatment-resistant depression (in development)"});
});

test("Newronika distinguishes its Cologno Monzese headquarters from its Milan legal address", () => {
  companyFields("newronika", {"hq": "Cologno Monzese (Milan metropolitan area), Italy"});
});

test("Blackrock retains its 2008 Blackrock Microsystems business history without a rebrand aside", () => {
  foundingFields("blackrock-neurotech", {"founding_year": "2008", "note": "Company history dates the business to 2008 as Blackrock Microsystems."});
});

test("Neurosoft retains source-reported 2020 cofounding without unlinked database claims", () => {
  foundingFields("neurosoft-bioelectronics", {"founding_year": "2020", "note": "Startupticker's press-release account explicitly states Neurosoft Bioelectronics was co-founded in 2020."});
});

test("Neuracle retains HSG's 2011 founding without unproven namesake exclusions", () => {
  foundingFields("neuracle-technology", {"founding_year": "2011", "note": "Investor HSG states that Neuracle was founded in 2011."});
});

test("Forest retains its 2023 establishment and FRO label without unlinked status claims", () => {
  foundingFields("forest-neurotech", {"founding_year": "2023", "note": "Convergent Research lists Forest Neurotech as a focused research organization (FRO), established in 2023."});
});
