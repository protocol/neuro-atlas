import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import * as PageModule from "../src/app/milestones/page.tsx";
import { MilestoneSourceContext } from "../src/components/milestone-source-context.tsx";

const MilestonesPage = PageModule.default?.default ?? PageModule.default;
const milestones = JSON.parse(readFileSync(new URL("../src/data/milestones.json", import.meta.url), "utf8"));
globalThis.React = React;

async function renderPage(source) {
  const page = await MilestonesPage({ searchParams: Promise.resolve({ source }) });
  return new JSDOM(renderToStaticMarkup(page));
}

function withoutContext(document) {
  document.querySelector("#source-context")?.remove();
  return document.body.innerHTML.replace(/_R_[^"]*_/g, "REACT_ID");
}

test("a source query renders its exact milestone reference without changing the timeline", async () => {
  const milestone = milestones[0];
  const dom = await renderPage(milestone.sourceUrl);
  const defaultDom = await renderPage(undefined);
  try {
    const context = dom.window.document.querySelector("section#source-context");
    assert.ok(context, "The exact source must have a server-rendered reference section");
    const heading = dom.window.document.getElementById(context.getAttribute("aria-labelledby"));
    assert.ok(heading && context.contains(heading), "The reference section must have an accessible heading");
    assert.equal(context.querySelectorAll("li").length, 1);
    const item = context.querySelector("li");
    assert.ok(item.textContent.includes(milestone.company));
    assert.ok(item.textContent.includes(milestone.activity));
    assert.equal(item.querySelector("time").getAttribute("datetime"), milestone.date);
    assert.ok(item.textContent.includes(milestone.note), "Use the actual milestone note, not a generated summary");
    assert.equal(item.querySelector("a").getAttribute("href"), milestone.sourceUrl);
    assert.equal(withoutContext(dom.window.document), withoutContext(defaultDom.window.document),
      "Source context is additive; the full default timeline and header must be unchanged");
  } finally {
    dom.window.close();
    defaultDom.window.close();
  }
});

test("reference dates retain the source record's precision and verification basis", async () => {
  for (const milestone of [
    milestones.find((row) => row.datePrecision === "month"),
    milestones.find((row) => row.dateBasis === "unverified"),
  ]) {
    const dom = await renderPage(milestone.sourceUrl);
    try {
      const context = dom.window.document.querySelector("#source-context");
      const date = context.querySelector("time");
      if (milestone.datePrecision === "month") {
        assert.equal(date.getAttribute("datetime"), milestone.date.slice(0, 7), "Do not turn a month-only source date into a precise day");
        assert.equal(date.textContent, "Jan 2024");
        assert.match(context.textContent, /Event date/);
      } else {
        assert.equal(date.getAttribute("datetime"), milestone.date);
        assert.match(context.textContent, /Date unverified/);
      }
    } finally { dom.window.close(); }
  }
});

test("a shared source includes every matched milestone and no other events", () => {
  const first = milestones.find((row) => milestones.filter((other) => other.sourceUrl === row.sourceUrl).length > 1);
  const matches = milestones.filter((row) => row.sourceUrl === first.sourceUrl);
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MilestoneSourceContext, { source: first.sourceUrl })));
  try {
    const items = [...dom.window.document.querySelectorAll("#source-context li")];
    assert.equal(items.length, matches.length);
    items.forEach((item, index) => {
      assert.ok(item.textContent.includes(matches[index].note));
      assert.equal(item.querySelector("a").getAttribute("href"), matches[index].sourceUrl);
    });
  } finally { dom.window.close(); }
});

test("Milestones rejects unknown, malformed, host-only, substring, and repeated source values", () => {
  const source = milestones[0].sourceUrl;
  for (const value of [undefined, "", "not a url", "javascript:alert(1)", "https://unknown.example/article", new URL(source).origin, source + "unrelated", source + "#unrelated", [source], [source, source]]) {
    assert.equal(renderToStaticMarkup(React.createElement(MilestoneSourceContext, { source: value })), "", String(value));
  }
});

test("Milestones tracking aliases retain original source hrefs", () => {
  const source = milestones[0].sourceUrl;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MilestoneSourceContext, { source: source + "?utm_source=directory&fbclid=example" })));
  try {
    assert.equal(dom.window.document.querySelector("#source-context a").getAttribute("href"), source);
  } finally { dom.window.close(); }
});

test("the actual Milestones route renders its reference alongside the mounted client timeline", async () => {
  const { mount } = await import("./modal-helpers.mjs");
  const milestone = milestones[0];
  const cleanup = await mount(await MilestonesPage({ searchParams: Promise.resolve({ source: milestone.sourceUrl }) }));
  try {
    assert.ok(document.querySelector("#source-context").textContent.includes(milestone.note));
    assert.ok([...document.querySelectorAll("h2")].some((heading) => heading.textContent === "Milestone timeline"));
    assert.ok(document.querySelector('[aria-label="Timeline layout"]'));
  } finally { await cleanup(); }
});
