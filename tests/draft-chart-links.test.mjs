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

test("fresh candidate and panel URLs select Draft, reveal exact targets and expand gap details", async () => {
  globalThis.React = React;
  for (const candidate of expected) {
    for (const id of [candidate.id, ...candidate.panels.map(panel => panel.id)]) {
      const scrolled = [];
      const cleanup = await mount(tabs(), `#${id}`, configureScroll(scrolled));
      try {
        assert.equal(document.querySelector("[aria-current=true]").textContent, "Draft charts", id);
        await until(() => scrolled.includes(id));
        const target = document.getElementById(id);
        assert.equal(target.closest("[hidden]"), null);
        if (target.dataset.draftChartStatus === "gap") assert.ok(target.querySelector("[data-draft-gap-details]").open);
        assert.equal(window.location.pathname, "/neuro-atlas/field-velocity");
        assert.equal(window.location.search, "?review=1&review=2");
      } finally { await cleanup(); }
    }
  }
});

test("direct links, repeated clicks, hashchange and Back/Forward select and scroll without modal state", async () => {
  globalThis.React = React;
  const scrolled = [];
  const cleanup = await mount(tabs(), "#draft-charts", configureScroll(scrolled));
  try {
    assert.deepEqual(scrolled, [], "legacy section anchor does not change scroll behavior");
    const first = expected[0].id, panel = expected[1].panels[1].id;
    await click(document.querySelector(`a[href="#${first}"]`));
    await until(() => scrolled.at(-1) === first);
    assert.equal(window.history.state.atlasModalFrom, null);
    assert.equal(window.history.state.existing, "preserved");
    scrolled.length = 0;
    const length = window.history.length;
    await click(document.querySelector(`a[href="#${first}"]`));
    await until(() => scrolled.includes(first));
    assert.equal(window.history.length, length, "repeat scroll creates no duplicate history entry");
    await click(document.querySelector(`a[href="#${panel}"]`));
    await until(() => scrolled.at(-1) === panel);
    await act(async () => navigatePerformance("expectations"));
    assert.equal(document.querySelector("[aria-current=true]").textContent, "Expectations");
    scrolled.length = 0;
    await act(async () => window.history.back());
    await until(() => scrolled.at(-1) === panel);
    assert.equal(document.querySelector("[aria-current=true]").textContent, "Draft charts");
    await act(async () => window.history.back());
    await until(() => scrolled.at(-1) === first);
    await act(async () => window.history.forward());
    await until(() => scrolled.at(-1) === panel);
    const gap = expected.find(candidate => candidate.panels.length === 0).id;
    await act(async () => { window.location.hash = gap; });
    await until(() => scrolled.at(-1) === gap);
    assert.ok(document.getElementById(gap).querySelector("[data-draft-gap-details]").open);
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
    for (const candidate of expected) {
      for (const id of [candidate.id, ...candidate.panels.map(panel => panel.id)]) {
        const button = document.querySelector(`[data-copy-draft-link="${id}"]`);
        await click(button);
        assert.equal(copied, `https://atlas.example/neuro-atlas/field-velocity?review=1&review=2#${id}`);
        assert.equal(button.parentElement.querySelector("[role=status]").textContent, "Copied");
        assert.equal(window.location.hash, "#draft-charts");
      }
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

test("all 19 candidates and 24 evidence panels have pinned independent share targets", () => {
  globalThis.React = React;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartsSection)));
  try {
    const document = dom.window.document;
    const allIds = [...document.querySelectorAll("[id]")].map(node => node.id);
    assert.equal(new Set(allIds).size, allIds.length, "no duplicate DOM IDs");
    for (const candidate of expected) {
      const card = document.getElementById(candidate.id);
      assert.ok(card, `Missing candidate target ${candidate.id}`);
      assert.equal(card.dataset.draftChartCard, candidate.title);
      for (const id of [candidate.id, ...candidate.panels.map(panel => panel.id)]) {
        const target = document.getElementById(id);
        assert.ok(target, `Missing target ${id}`);
        assert.ok(card.contains(target));
        assert.ok(target.querySelector(`a[href="#${id}"]`), `Direct link ${id}`);
        assert.ok(target.querySelector(`button[data-copy-draft-link="${id}"]`), `Copy link ${id}`);
      }
      assert.equal(card.querySelectorAll("[data-draft-panel]").length, candidate.panels.length);
    }
  } finally { dom.window.close(); }
});
