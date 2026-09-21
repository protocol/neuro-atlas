import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { DRAFT_CHARTS, DRAFT_CHART_CATEGORIES } from "../src/data/draft-charts.ts";
import { DRAFT_CHART_EVIDENCE } from "../src/data/draft-chart-observations.ts";
import { DraftChartsSection } from "../src/components/sections/draft-charts-section.tsx";
import { restoreFocusAfterPaneReveal } from "../src/components/chart-modal.tsx";
import { revealActiveTab, scheduleActiveTabReveal } from "../src/components/sub-tabs.tsx";
import { performanceAnchors, performanceUrl, setPerformanceFocusReturn, takePerformanceFocusReturn } from "../src/lib/field-velocity/navigation.ts";

const manifest = [
  "Brain tissue mapped over time",
  "Largest published connectome over time",
  "Connectomics imaging throughput over time",
  "Cost to map 1 cm³ over time",
  "Automated reconstruction accuracy over time",
  "Human proofreading burden over time",
  "Human tissue preservation quality over time",
  "Tissue loss in subdivision/sectioning over time",
  "Molecular annotation coverage over time",
  "Humans with implanted high-bandwidth BCIs over time",
  "Neural recording hours collected over time",
  "Paired structure–function dataset scale over time",
  "Comparative connectomics cohort size over time",
  "Open-access connectomics data over time",
  "Public connectome reuse over time",
  "Simulation/emulation fidelity over time",
  "Number of simulations/emulations over time",
  "NeuroAI performance–cost frontier over time",
  "Demonstrated applications enabled by connectomics over time",
];

test("Draft charts preserves all 19 authorized technical definitions exactly once across six categories", () => {
  assert.equal(DRAFT_CHARTS.length, 19);
  assert.deepEqual(DRAFT_CHARTS.map(chart => chart.title), manifest);
  assert.equal(new Set(DRAFT_CHARTS.map(chart => chart.title)).size, 19);
  assert.deepEqual(DRAFT_CHART_CATEGORIES, [
    "Mapping scale",
    "Cost and automation",
    "Tissue quality and annotation",
    "Human interfaces and recordings",
    "Data access and scientific use",
    "Simulation, NeuroAI, and impact",
  ]);
  assert.deepEqual([...new Set(DRAFT_CHARTS.map(chart => chart.category))], DRAFT_CHART_CATEGORIES);
  for (const chart of DRAFT_CHARTS) {
    assert.match(chart.axes, /x-axis:/i);
    assert.match(chart.axes, /y-axis:/i);
    assert.ok(chart.constraint.length > 35, `${chart.title} needs a comparability constraint`);
    assert.equal('readiness' in chart, false, 'Evidence status belongs to the evidence module, not the definition');
  }
});

test("Reconstruction accuracy uses time on x with a fixed benchmark version", () => {
  const chart = DRAFT_CHARTS.find(c => c.title === "Automated reconstruction accuracy over time");
  assert.match(chart.axes, /x-axis: evaluation year/);
  assert.match(chart.definition, /fixed.*dataset.*benchmark.*metric version/i);
});

test("Draft chart manifest is a stable, sanitized technical definition set", () => {
  const digest = createHash("sha256").update(JSON.stringify(DRAFT_CHARTS)).digest("hex");
  assert.equal(digest, "d9552334284ab6663bdccabbdf7a6cfe2720d057ab88de92c7f1fcbb6db1360e");
  const serialized = JSON.stringify(DRAFT_CHARTS);
  assert.doesNotMatch(serialized, /https?:\/\//i);
  assert.doesNotMatch(serialized, /\b(?:meeting|discussion|participant|comment|private URL)\b/i);
});

test("Draft charts renders source-backed plots as the primary gallery, retaining all definitions and exact categories", () => {
  globalThis.React = React;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartsSection)));
  try {
    const document = dom.window.document;
    const plotted = DRAFT_CHARTS.filter(chart => DRAFT_CHART_EVIDENCE[chart.title]?.status === 'plotted');
    assert.ok(plotted.length > 0, 'Actual source-backed production data is assembled');
    assert.equal(document.querySelectorAll('[data-draft-chart-status="plotted"]').length, plotted.length);
    assert.equal(document.querySelectorAll("[data-draft-chart-card]").length, 19);
    assert.deepEqual([...document.querySelectorAll("[data-draft-chart-category]")].map(group => group.dataset.draftChartCategory), DRAFT_CHART_CATEGORIES);
    for (const chart of plotted) {
      const card = [...document.querySelectorAll('[data-draft-chart-card]')].find(card => card.dataset.draftChartCard === chart.title);
      const plots = DRAFT_CHART_EVIDENCE[chart.title].plots;
      assert.equal(card.querySelectorAll('svg').length, plots.length + (DRAFT_CHART_EVIDENCE[chart.title].timeline ? 1 : 0), 'Each scope gets its own plot or categorical timeline');
      const evidence = DRAFT_CHART_EVIDENCE[chart.title];
      if (evidence.timeline) assert.equal(card.querySelectorAll('[data-source-event]').length, evidence.timeline.events.length);
      if (evidence.gapReason) {
        assert.ok(card.querySelector('[data-draft-still-missing]'), 'Bounded proxies show what remains unmeasured');
        assert.match(card.querySelector('[data-draft-still-missing]').textContent, /Still missing/);
        assert.ok(card.querySelector('[data-draft-still-missing]').textContent.includes(evidence.gapReason));
      }
      assert.equal(card.querySelectorAll('[data-source-observation]').length, plots.reduce((sum, plot) => sum + plot.points.length, 0));
      assert.ok(card.querySelector('details[data-draft-methodology]'), 'Definitions live in a disclosure');
      assert.equal(card.querySelector('details[data-draft-methodology]').hasAttribute('open'), false);
    }
    const count = document.querySelector('[data-draft-chart-counts]');
    assert.ok(count.textContent.includes(`${plotted.length} plotted`));
    assert.ok(count.textContent.includes(`${DRAFT_CHARTS.length - plotted.length} evidence gaps`));
    assert.deepEqual([...document.querySelectorAll('.draft-chart-link')].map(link => link.getAttribute('href')).sort(), ['#neural-recording-hours', '#tissue-mapped']);
    assert.doesNotMatch(document.body.textContent, /Definition drafts · no observations/);
  } finally { dom.window.close(); }
});

test('evidence gaps are explicit compact disclosures outside the plotted gallery, never empty SVG charts', () => {
  globalThis.React = React;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartsSection)));
  try {
    const document = dom.window.document;
    const gaps = DRAFT_CHARTS.filter(chart => DRAFT_CHART_EVIDENCE[chart.title]?.status !== 'plotted');
    const section = document.querySelector('[data-draft-evidence-gaps]');
    assert.ok(section, 'Separate clearly labeled evidence-gap section');
    assert.match(section.querySelector('h3').textContent, /Evidence gaps/);
    assert.equal(section.querySelectorAll('svg').length, 0);
    assert.equal(section.querySelectorAll('[data-draft-chart-status="gap"]').length, gaps.length);
    for (const chart of gaps) {
      const card = [...section.querySelectorAll('[data-draft-chart-card]')].find(card => card.dataset.draftChartCard === chart.title);
      assert.ok(card);
      assert.ok(card.querySelector('details:not([open])'));
      assert.ok(card.textContent.includes(DRAFT_CHART_EVIDENCE[chart.title].gapReason));
      assert.match(card.textContent, /Evidence gap/);
    }
  } finally { dom.window.close(); }
});

test("Draft charts is a stable non-modal tab location", () => {
  assert.ok(performanceAnchors.includes("draft-charts"));
  assert.equal(performanceUrl("https://atlas.example/field-velocity?review=1#old", "draft-charts"), "https://atlas.example/field-velocity?review=1#draft-charts");
});

test("a Draft chart link records its exact return focus target", () => {
  const dom = new JSDOM('<a href="#tissue-mapped">Open metric</a>');
  try {
    const link = dom.window.document.querySelector("a");
    setPerformanceFocusReturn(link);
    assert.equal(takePerformanceFocusReturn(), link);
    assert.equal(takePerformanceFocusReturn(), null);
  } finally {
    dom.window.close();
  }
});

test('the wired gallery stylesheet makes two readable columns, mobile single columns, and fixed-height point inspection', () => {
  const css = (() => { try { return readFileSync('src/components/draft-chart-plot.css', 'utf8'); } catch { return ''; } })();
  assert.match(css, /\.draft-charts-gallery \.draft-chart-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.draft-plot-svg\s*\{[^}]*min-height:\s*300px/);
  assert.match(css, /\.draft-plot-inspector\s*\{[^}]*height:\s*\d+(?:\.\d+)?rem[^}]*overflow-y:\s*auto/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(readFileSync('src/app/globals.css', 'utf8'), /@import "\.\.\/components\/draft-chart-plot\.css"/);
});

test('plot-first cards keep full scope in the source disclosure, not in a paragraph wall above the SVG', () => {
  globalThis.React = React;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartsSection)));
  try {
    for (const figure of dom.window.document.querySelectorAll('.draft-plot:not(.draft-event-timeline)')) {
      assert.equal(figure.querySelectorAll(':scope > .draft-plot-scope').length, 0);
      assert.ok(figure.querySelector('details .draft-plot-scope'));
      const svg = figure.querySelector('svg');
      assert.equal(svg.previousElementSibling.tagName, 'FIGCAPTION', 'The graph immediately follows the panel title');
    }
  } finally { dom.window.close(); }
});

test("Draft chart status rows wrap before labels spill into card padding", () => {
  const css = readFileSync("src/components/performance-curves.css", "utf8");
  assert.match(css, /\.draft-chart-card-header\s*\{[^}]*flex-wrap:\s*wrap/);
});

test("Draft chart readiness labels are constrained on narrow screens", () => {
  const css = readFileSync("src/components/performance-curves.css", "utf8");
  assert.match(css, /@media \(max-width: 560px\) \{[^}]*\.draft-chart-readiness[^}]*max-width:/);
});

test("The three-position Field velocity rail contains overflow on narrow screens", () => {
  const source = readFileSync("src/components/sub-tabs.tsx", "utf8");
  assert.match(source, /max-w-full overflow-x-auto/);
  assert.match(source, /shrink-0/);
});

test("a visible Metrics trigger regains focus synchronously on close", () => {
  const dom = new JSDOM('<button>Open metric</button>', { pretendToBeVisual: true });
  try {
    const trigger = dom.window.document.querySelector("button");
    restoreFocusAfterPaneReveal(trigger);
    assert.equal(dom.window.document.activeElement === trigger, true);
  } finally {
    dom.window.close();
  }
});

test("a Draft chart metric link regains focus only after its hidden pane is visible", () => {
  const dom = new JSDOM('<div hidden><a href="#tissue-mapped">Open metric</a></div>', { pretendToBeVisual: true });
  try {
    const pane = dom.window.document.querySelector("div");
    const link = dom.window.document.querySelector("a");
    const frames = [];
    dom.window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
    restoreFocusAfterPaneReveal(link);
    assert.equal(dom.window.document.activeElement, dom.window.document.body);
    assert.equal(frames.length, 1);
    frames.shift()(0);
    assert.equal(dom.window.document.activeElement, dom.window.document.body);
    assert.equal(frames.length, 1);
    pane.hidden = false;
    frames.shift()(0);
    assert.equal(dom.window.document.activeElement, link);
  } finally {
    dom.window.close();
  }
});

test("the active narrow rail tab is revealed by scrolling only the rail", () => {
  const dom = new JSDOM('<div><button>Draft charts</button></div>');
  try {
    const rail = dom.window.document.querySelector("div");
    const active = dom.window.document.querySelector("button");
    rail.getBoundingClientRect = () => ({ left: 33, right: 272 });
    active.getBoundingClientRect = () => ({ left: 250, right: 314 });
    rail.scrollLeft = 0;
    revealActiveTab(rail, active);
    assert.equal(rail.scrollLeft, 42);
    assert.equal(dom.window.document.documentElement.scrollLeft, 0);
  } finally {
    dom.window.close();
  }
});

test("the active narrow rail tab is revealed again after the final layout frame", () => {
  const dom = new JSDOM('<div><button>Draft charts</button></div>', { pretendToBeVisual: true });
  try {
    const rail = dom.window.document.querySelector("div");
    const active = dom.window.document.querySelector("button");
    rail.getBoundingClientRect = () => ({ left: 33, right: 272 });
    active.getBoundingClientRect = () => ({ left: 250, right: 314 });
    let frame;
    dom.window.requestAnimationFrame = callback => { frame = callback; return 1; };
    scheduleActiveTabReveal(rail, active);
    assert.equal(rail.scrollLeft, 0);
    frame(0);
    assert.equal(rail.scrollLeft, 42);
    assert.equal(dom.window.document.documentElement.scrollLeft, 0);
  } finally {
    dom.window.close();
  }
});
