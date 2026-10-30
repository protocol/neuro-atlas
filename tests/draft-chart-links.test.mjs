import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React, { act, StrictMode } from "react";
import { VelocityTabs } from "../src/components/sections/velocity-tabs.tsx";
import { performanceUrl, navigatePerformance } from "../src/lib/field-velocity/navigation.ts";
import { mount, click, settle } from "./modal-helpers.mjs";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { DraftChartsSection } from "../src/components/sections/draft-charts-section.tsx";
async function until(predicate) {
  for (let i = 0; i < 30; i++) { await settle(); if (predicate()) return; }
  assert.ok(predicate(), "navigation settled within deadline");
}
const tabs = () => React.createElement(StrictMode, null, React.createElement(VelocityTabs, { performance: null }));
function configureScroll(scrolled) {
  return window => {
    window.history.replaceState({ existing: "preserved" }, "", "/neuro-atlas/field-velocity?review=1&review=2" + window.location.hash);
    window.HTMLElement.prototype.scrollIntoView = function () {
      assert.equal(this.closest("[hidden]"), null, "reveal before scrolling");
      scrolled.push(this.id);
    };
  };
}
const expected = JSON.parse(readFileSync(new URL("./fixtures/draft-chart-links.json", import.meta.url), "utf8"));

test("fresh actual chart/panel URLs open the matching popup; retired definitions still reveal inline", async () => {
  globalThis.React = React;
  for (const candidate of expected) {
    for (const id of [candidate.id, ...candidate.panels.map(panel => panel.id)].flatMap(id => [id, id.replace(/^draft-/, "metric-")])) {
      const scrolled = [];
      const cleanup = await mount(tabs(), `#${id}`, configureScroll(scrolled));
      try {
        assert.equal(document.querySelector("[aria-current=true]").textContent, "Metrics", id);
        const target = document.getElementById(id);
        assert.ok(target, id);
        if (target.hasAttribute("data-retired-metric-anchor")) {
          await until(() => scrolled.includes(id));
          assert.equal(target.closest("[data-draft-chart-card]"), null);
          const category = target.closest("[data-metrics-category]");
          assert.ok(category);
          assert.equal(category.querySelector("[data-metric-toggle]").getAttribute("aria-expanded"), "true");
          assert.equal(category.querySelectorAll("[data-draft-chart-status=gap]").length, 0);
          assert.equal(document.querySelector("dialog[open]"), null);
        } else {
          await until(() => document.querySelector("dialog[open] .pc-modal-header button") === document.activeElement);
          const modal = document.querySelector("dialog[open]");
          assert.equal(document.querySelectorAll("dialog[open]").length, 1, id);
          const owner = modal.closest("[data-draft-popout]");
          assert.ok(owner.dataset.draftPopout === id || owner.dataset.draftPopoutAliases.split(" ").includes(id), `matching popup for ${id}`);
          assert.ok(modal.querySelector("[data-source-observation], [data-source-event]"), `real source marks for ${id}`);
          assert.equal(modal.closest("[hidden]"), null, id);
          assert.deepEqual(scrolled, [], "modal entry never scrolls background");
        }
        assert.equal(target.closest("[hidden]"), null);
        assert.equal(window.location.pathname, "/neuro-atlas/field-velocity");
        assert.equal(window.location.search, "?review=1&review=2");
      } finally { await cleanup(); }
    }
  }
});

test("stable alias URLs, same-hash navigation and Back/Forward preserve popup history without background scroll", async () => {
  globalThis.React = React;
  const scrolled = [];
  const cleanup = await mount(tabs(), "#draft-charts", configureScroll(scrolled));
  try {
    assert.deepEqual(scrolled, [], "legacy section anchor does not change scroll behavior");
    await click(document.querySelector("[data-expand-metrics]"));
    const first = expected[0].id.replace(/^draft-/, "metric-"), panel = expected[1].panels[1].id.replace(/^draft-/, "metric-");
    const openAt = async anchor => {
      await until(() => window.location.hash === `#${anchor}` && !!document.querySelector("dialog[open]"));
      const owner = document.querySelector("dialog[open]").closest("[data-draft-popout]");
      assert.ok(owner.dataset.draftPopout === anchor || owner.dataset.draftPopoutAliases.split(" ").includes(anchor), anchor);
      assert.equal(document.querySelectorAll("dialog[open]").length, 1);
      assert.deepEqual(scrolled, [], "popup/history navigation does not scroll background");
    };
    await act(async () => navigatePerformance(first));
    await openAt(first);
    assert.match(window.history.state.atlasModalFrom, /#draft-charts$/);
    assert.equal(window.history.state.existing, "preserved");
    const length = window.history.length;
    await act(async () => navigatePerformance(first));
    await openAt(first);
    assert.equal(window.history.length, length, "repeat navigation creates no duplicate history entry");
    await act(async () => navigatePerformance(panel));
    await openAt(panel);
    await act(async () => navigatePerformance("expectations"));
    assert.equal(document.querySelector("[aria-current=true]").textContent, "Expectations");
    assert.equal(document.querySelector("dialog[open]"), null);
    await act(async () => window.history.back());
    await openAt(panel);
    assert.equal(document.querySelector("[aria-current=true]").textContent, "Metrics");
    await act(async () => window.history.back());
    await openAt(first);
    await act(async () => window.history.forward());
    await openAt(panel);
    const gap = expected.find(candidate => candidate.panels.length === 0).id;
    await act(async () => { window.location.hash = gap; });
    await until(() => scrolled.at(-1) === gap);
    assert.equal(document.querySelector("dialog[open]"), null);
    assert.equal(document.getElementById(gap).closest("[data-metrics-category]").querySelector("[data-metric-toggle]").getAttribute("aria-expanded"), "true");
    assert.equal(document.getElementById(gap).closest("[data-draft-chart-card]"), null);
  } finally { await cleanup(); }
});

test("all share URLs preserve exact origin, base path and query; unknown targets fail closed", () => {
  for (const candidate of expected) {
    for (const id of [candidate.id, ...candidate.panels.map(panel => panel.id)]) {
      for (const base of ["https://www.plrd.org/neuro-atlas/field-velocity?x=1&x=2", "http://127.0.0.1:3389/field-velocity?review=1"]) {
        assert.equal(performanceUrl(base + "#old", id), base + "#" + id);
      }
    }
  }
  for (const id of ["draft-unknown", "draft-panel-unknown", "DRAFT-BRAIN-TISSUE-MAPPED", "draft-brain-tissue-mapped/"]) {
    assert.throws(() => performanceUrl("https://atlas.example/field-velocity", id), /Unknown/);
  }
});

test("candidate and panel copy controls copy without navigating; failure is visible", async () => {
  globalThis.React = React;
  const original = Object.getOwnPropertyDescriptor(globalThis.navigator, "clipboard");
  let copied;
  Object.defineProperty(globalThis.navigator, "clipboard", { configurable: true, value: { writeText: async text => { copied = text; } } });
  const cleanup = await mount(tabs(), "#draft-charts", configureScroll([]));
  try {
    await click(document.querySelector("[data-expand-metrics]"));
    const buttons = [...document.querySelectorAll('[data-copy-draft-link]')];
    assert.equal(buttons.length, 15, 'One Copy link per actual plot or timeline, not per alias');
    for (const button of buttons) {
      const canonical = button.dataset.copyDraftLink;
      assert.ok(document.getElementById(canonical));
      await click(button);
      assert.equal(copied, `https://atlas.example/neuro-atlas/field-velocity?review=1&review=2#${canonical}`);
      assert.equal(button.parentElement.querySelector("[role=status]").textContent, "Copied");
      assert.equal(window.location.hash, "#draft-charts");
    }
    globalThis.navigator.clipboard.writeText = async () => { throw new Error("denied"); };
    const button = document.querySelector("[data-copy-draft-link]");
    await click(button);
    assert.match(button.parentElement.querySelector("[role=status]").textContent, /Copy failed/);
  } finally {
    await cleanup();
    if (original) Object.defineProperty(globalThis.navigator, "clipboard", original);
    else delete globalThis.navigator.clipboard;
  }
});

test("all stable candidate/panel targets survive; retired targets have no share controls or charts", () => {
  globalThis.React = React;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(VelocityTabs, { performance: null })));
  try {
    const document = dom.window.document;
    const allIds = [...document.querySelectorAll("[id]")].map(node => node.id);
    assert.equal(new Set(allIds).size, allIds.length, "no duplicate DOM IDs");
    for (const candidate of expected) {
      const card = document.getElementById(candidate.id);
      assert.ok(card, `Missing candidate target ${candidate.id}`);
      if (!card.hasAttribute("data-retired-metric-anchor")) assert.equal(card.dataset.draftChartCard, candidate.title);
      for (const id of [candidate.id, ...candidate.panels.map(panel => panel.id)]) {
        const target = document.getElementById(id);
        assert.ok(target, `Missing target ${id}`);
        if (target.hasAttribute("data-retired-metric-anchor")) {
          assert.equal(target.closest("[data-draft-chart-card]"), null);
          assert.ok(target.closest("[data-metrics-category]"));
          continue;
        }
        const tile = target.closest('[data-draft-chart-card]');
        assert.equal(tile?.dataset.draftChartCard, candidate.title, 'Each panel remains in its original definition, now as a peer tile');
        const popout = tile.querySelector('[data-draft-popout]');
        assert.ok([popout.dataset.draftPopout, ...popout.dataset.draftPopoutAliases.split(' ')].includes(id), `Alias still opens its original plot: ${id}`);
        assert.equal(tile.querySelectorAll('[data-copy-draft-link]').length, 1);
        assert.equal(tile.querySelector('[data-copy-draft-link]').dataset.copyDraftLink, popout.dataset.draftPopout);
      }
      if (card.hasAttribute('data-retired-metric-anchor')) continue;
      const retained = candidate.panels.filter(panel => !document.getElementById(panel.id).hasAttribute("data-retired-metric-anchor"));
      const tiles = [...document.querySelectorAll('[data-draft-chart-card]')].filter(tile => tile.dataset.draftChartCard === candidate.title);
      assert.equal(tiles.length, new Set(retained.map(panel => panel.plotId)).size);
    }
  } finally { dom.window.close(); }
});
