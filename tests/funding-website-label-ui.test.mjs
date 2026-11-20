import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { readFile } from "node:fs/promises";
import { buildFundingIndex, parseCsv } from "../scripts/lib/funding-index.mjs";
import { FundingIndexDashboard } from "../src/components/funding-index-dashboard.tsx";
import { mount, click } from "./modal-helpers.mjs";

const sourceData = JSON.parse(await readFile(new URL("../src/data/funding-index.json", import.meta.url), "utf8"));
globalThis.React = React;
const button = (text) => [...document.querySelectorAll("button")].find((element) => element.textContent === text);

function fixtureData(overrides = {}) {
  // Synthetic company, passed through the real CSV parser and builder rather than a name exception.
  const company = parseCsv([
    "slug,name,hq,modality,interface_depth,indication,website,scope,website_label",
    "fixture,Fixture Company,Fixture HQ,ECoG,Cortical Surface,Fixture indication,https://example.org/company,Implanted,Institutional profile (CIBR)",
  ].join("\n"))[0];
  const index = JSON.parse(JSON.stringify(buildFundingIndex({
    companies: [{ ...company, ...overrides }], rounds: [], milestones: [],
  })));
  return { ...sourceData, ...index, summary: { ...sourceData.summary, ...index.summary, selectedCompanies: 1 } };
}

for (const view of ["timeline", "stage"]) {
  test(`${view} renders the generated custom websiteLabel in company detail`, async () => {
    const data = fixtureData();
    const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
    try {
      await click(button(view));
      await click([...document.querySelectorAll("button")].find((element) => element.textContent.includes("Fixture Company")));
      const detail = document.querySelector('[role="dialog"]');
      const link = detail.querySelector('a[href="https://example.org/company"]');
      assert.ok(link, "company destination remains linked");
      assert.equal(link.querySelector("span").textContent, "Institutional profile (CIBR)");
      assert.equal(link.getAttribute("href"), data.companies[0].website);
      assert.equal(link.getAttribute("target"), "_blank");
      assert.equal(link.getAttribute("rel"), "noreferrer");
      assert.equal(detail.textContent.includes("Visit company website"), false);
    } finally { await cleanup(); }
  });
}

test("omitted and blank canonical labels retain Visit company website", async () => {
  for (const website_label of [undefined, "", "   "]) {
    const data = fixtureData({ website_label });
    const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
    try {
      await click([...document.querySelectorAll("button")].find((element) => element.textContent.includes("Fixture Company")));
      const link = document.querySelector('[role="dialog"] a[href="https://example.org/company"]');
      assert.equal(link?.querySelector("span").textContent, "Visit company website");
    } finally { await cleanup(); }
  }
});

test("company detail still omits the website action when no website is present", async () => {
  const cleanup = await mount(React.createElement(FundingIndexDashboard, {
    data: fixtureData({ website: "", website_label: "" }),
  }));
  try {
    await click([...document.querySelectorAll("button")].find((element) => element.textContent.includes("Fixture Company")));
    assert.equal(document.querySelector('[role="dialog"] a'), null);
  } finally { await cleanup(); }
});
