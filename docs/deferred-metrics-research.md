# Deferred Metrics research

These five proposals are a research backlog, not website content. They currently have no defensible plotted series. The reader-facing Metrics page should show actual sourced measurements; it should not render these proposals as empty cards, progress notices, or gap counters.

This document changes no application code, source values, routes, or access controls. Merging it would not enable a chart. Each eventual chart needs its own sourced data and implementation review.

## 1. Cost to map 1 cm³ over time

**Question:** What has it cost to produce a mapped cubic centimeter at a specified reconstruction quality?

**Why deferred:** Imaging components, grants, and estimated whole-brain budgets omit different costs. They cannot be combined into a comparable all-in history.

**Acceptance before plotting:**
- Define the tissue, resolution, reconstruction completeness and quality threshold.
- Recover realized imaging, compute, storage and proofreading costs with an explicit inclusion boundary and date/currency basis.
- Distinguish measured costs from estimates, and partial components from totals. Do not relabel acquisition voxels per dollar as end-to-end mapping cost.

Archived proposal: `draft-mapping-cost` in [`draft-chart-links.ts`](../src/data/draft-chart-links.ts); definition and evidence status remain in [`draft-charts.ts`](../src/data/draft-charts.ts) and [`draft-chart-evidence.json`](../src/data/draft-chart-evidence.json).

## 2. Human tissue preservation quality over time

**Question:** What fraction of connections remains traceable after tissue preservation?

**Why deferred:** The reviewed 2025 human brain-bank study did not rigorously quantify traceability. Artifact area and visible synapses are not interchangeable with the fraction of connections traceable.

**Acceptance before plotting:**
- Define a traceability endpoint, sampling protocol and denominator.
- Recover comparable measurements, with preservation conditions and evaluation uncertainty.
- Keep image-quality proxies separate from directly evaluated connectivity preservation.

Archived proposal: `draft-tissue-preservation`.

## 3. Molecular annotation coverage over time

**Question:** What share of a defined tissue volume or cell population carries an experimentally validated molecular annotation?

**Why deferred:** Cell-type morphology, classifier accuracy and antigen counts measure different things; no consistent validated coverage series is established.

**Acceptance before plotting:**
- Choose the molecular label, assay, validation threshold and coverage denominator.
- Record directly measured coverage with tissue/species, resolution and date.
- Keep inferred identities separate from validated neurotransmitter or receptor measurements.

Archived proposal: `draft-molecular-annotation`.

## 4. Public connectome reuse over time

**Question:** How often are public connectome releases substantively reused in subsequent work?

**Why deferred:** No validated historical reuse corpus and denominator have been established. Citation counts alone do not establish actual reuse.

**Acceptance before plotting:**
- Define eligible releases and a reproducible publication or analysis corpus.
- Classify and validate actual reuse, with a dated cutoff and deduplication rules.
- Publish counts and denominators separately; compute percentages only when the denominator is justified.

Archived proposal: `draft-connectome-reuse`.

## 5. Number of simulations/emulations over time

**Question:** How many independently identifiable connectome-based simulation or emulation models have been produced?

**Why deferred:** A few selected model families are not a field-wide inventory. Models, runs, organisms and independently validated emulations are different units.

**Acceptance before plotting:**
- Choose and justify the counting unit.
- Assemble a dated, source-linked inventory with explicit inclusion and deduplication rules.
- Separate simulation count from model fidelity and demonstrated applications; do not infer activity from a few selected examples.

Archived proposal: `draft-simulation-count`.

## Re-entry into Metrics

For each proposal, require claim-level primary sources, reproducible extraction, explicit units/scope and validation tests before adding a populated chart. Necessary qualifications belong with that chart’s definitions and sources. Do not invent values to fill an empty proposal or remove an important qualifier to make an existing measurement appear complete.
