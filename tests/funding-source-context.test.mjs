import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import * as PageModule from "../src/app/funding/page.tsx";
import { FundingSourceContext } from "../src/components/funding-source-context.tsx";

const FundingPage = PageModule.default?.default ?? PageModule.default;
const data = JSON.parse(readFileSync(new URL("../src/data/funding-index.json", import.meta.url), "utf8"));
globalThis.React = React;

async function renderPage(source) {
  return new JSDOM(renderToStaticMarkup(await FundingPage({ searchParams: Promise.resolve({ source }) })));
}

function withoutContext(document) {
  document.querySelector("#source-context")?.remove();
  return document.body.innerHTML.replace(/_R_[^"]*_/g, "REACT_ID");
}

function contextFor(source) {
  return new JSDOM(renderToStaticMarkup(React.createElement(FundingSourceContext, { source })));
}

test("Funding source queries show only the actual matched round, leaving the dashboard unchanged", async () => {
  const round = data.rounds[0];
  const company = data.companies.find((row) => row.slug === round.companySlug);
  const dom = await renderPage(round.sourceUrl);
  const defaultDom = await renderPage(undefined);
  try {
    const context = dom.window.document.querySelector("section#source-context");
    assert.ok(context, "The Funding receiver must render an exact-source reference block");
    const heading = dom.window.document.getElementById(context.getAttribute("aria-labelledby"));
    assert.ok(heading && context.contains(heading));
    assert.ok(context.textContent.includes(company.name));
    assert.ok(context.textContent.includes(round.stage));
    assert.ok(context.textContent.includes(round.displayAmount));
    assert.ok(context.textContent.includes(round.note));
    assert.equal(context.querySelector("time").getAttribute("datetime"), round.announcedOn);
    assert.equal(context.querySelector("a").getAttribute("href"), round.sourceUrl);
    assert.ok(!context.textContent.includes(company.founding.note), "A round source is not evidence for unrelated company founding facts");
    assert.ok(!context.textContent.includes(company.hq));
    assert.equal(withoutContext(dom.window.document), withoutContext(defaultDom.window.document));
  } finally {
    dom.window.close();
    defaultDom.window.close();
  }
});

test("company website, founding, and regulatory references show only their matched facts", () => {
  const company = data.companies[0];
  const milestone = data.milestones.find((row) => !data.rounds.some((round) => round.sourceUrl === row.sourceUrl));
  for (const [source, expected] of [
    [company.website, ["Company website", company.name]],
    [company.founding.sourceUrl, ["Founded", String(company.founding.year), company.founding.note]],
    [milestone.sourceUrl, [milestone.marker, milestone.note, milestone.indication]],
  ]) {
    const dom = contextFor(source);
    try {
      const context = dom.window.document.querySelector("#source-context");
      assert.ok(context);
      for (const text of expected) assert.ok(context.textContent.includes(text), `Missing exact source fact: ${text}`);
      assert.equal(context.querySelector("a").getAttribute("href"), source);
      if (source === company.website) {
        assert.ok(!context.textContent.includes(company.founding.note));
        assert.ok(!context.textContent.includes(data.rounds[0].note));
      }
    } finally { dom.window.close(); }
  }
});

test("named-investor evidence does not imply source support for the indexed round amount", () => {
  const round = data.rounds.find((row) => row.investorEvidence?.some((item) => item.sourceUrl !== row.sourceUrl));
  const evidence = round.investorEvidence.find((item) => item.sourceUrl !== round.sourceUrl);
  const dom = contextFor(evidence.sourceUrl);
  try {
    const context = dom.window.document.querySelector("#source-context");
    assert.match(context.textContent, /Named-investor evidence/);
    assert.ok(context.textContent.includes(evidence.investorName));
    assert.ok(context.textContent.includes(evidence.sourceExcerpt));
    assert.match(context.textContent, /not the indexed round amount/);
    assert.ok(!context.textContent.includes(round.displayAmount));
    assert.ok(!context.textContent.includes(round.note));
    assert.equal(context.querySelector("a").getAttribute("href"), evidence.sourceUrl);
  } finally { dom.window.close(); }
});

test("Funding rejects unknown, malformed, host-only, substring, and repeated source values", () => {
  const source = data.rounds[1].sourceUrl;
  for (const value of [undefined, "", "not a url", "javascript:alert(1)", "https://unknown.example/article", new URL(source).origin, source + "unrelated", [source], [source, source]]) {
    assert.equal(renderToStaticMarkup(React.createElement(FundingSourceContext, { source: value })), "", String(value));
  }
});

test("Funding tracking aliases retain original source hrefs", () => {
  const source = data.rounds[0].sourceUrl;
  const dom = contextFor(source + "?utm_source=directory&fbclid=example");
  try {
    assert.equal(dom.window.document.querySelector("#source-context a").getAttribute("href"), source);
  } finally { dom.window.close(); }
});

test("the actual Funding route renders its reference alongside the mounted client dashboard", async () => {
  const { mount } = await import("./modal-helpers.mjs");
  const round = data.rounds[0];
  const cleanup = await mount(await FundingPage({ searchParams: Promise.resolve({ source: round.sourceUrl }) }));
  try {
    assert.ok(document.querySelector("#source-context").textContent.includes(round.note));
    assert.ok(document.querySelector('[aria-label="Company financing timeline. Scroll horizontally for later years."]'));
  } finally { await cleanup(); }
});
