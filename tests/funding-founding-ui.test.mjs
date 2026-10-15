import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { readFile } from "node:fs/promises";
import { FundingIndexDashboard } from "../src/components/funding-index-dashboard.tsx";
import { buildCompanyRows } from "../src/lib/funding-index.ts";
import { mount, click } from "./modal-helpers.mjs";

const data = JSON.parse(await readFile(new URL("../src/data/funding-index.json", import.meta.url), "utf8"));
globalThis.React = React;
const button = (text) => [...document.querySelectorAll("button")].find((el) => el.textContent === text);

for (const view of ["timeline", "stage"]) {
  test(`${view} exposes every founding year and its exact source in company details`, async () => {
    const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
    try {
      if (view === "stage") await click(button("stage"));
      for (const company of data.companies) {
        const row = [...document.querySelectorAll("button")].find((el) => el.textContent.includes(company.name));
        assert.ok(row, company.slug);
        assert.match(row.textContent, new RegExp(`Founding year · ${company.founding?.year ?? "Unknown"}`), company.slug);
        row.focus();
        await click(row);
        const detail = document.querySelector('[role="dialog"]');
        assert.ok(detail, company.slug);
        const section = [...detail.querySelectorAll("section")].find((el) => el.querySelector("h3")?.textContent === "Founding year");
        assert.ok(section, "founding provenance belongs in company detail");
        assert.ok(section.textContent.includes(String(company.founding?.year ?? "Unknown")));
        assert.ok(section.textContent.includes(company.founding.note));
        assert.match(section.textContent, /Source reviewed Oct 15, 2026/);
        const source = section.querySelector("a");
        if (company.founding.sourceUrl) {
          assert.equal(source?.getAttribute("href"), company.founding.sourceUrl);
          assert.match(source.textContent, /Founding source/);
          assert.equal(source.getAttribute("target"), "_blank");
          assert.match(source.getAttribute("rel"), /noreferrer/);
        } else assert.equal(source, null);
        await click(detail.querySelector('[aria-label="Close detail panel"]'));
        assert.equal(document.activeElement, row);
      }
      assert.equal(document.querySelectorAll("button a").length, 0, "no nested link inside company button");
    } finally { await cleanup(); }
  });
}

test("missing research is shown as Unknown in both views, never zero or financing year", async () => {
  const missing = { ...data, companies: [{ ...data.companies[0], founding: null }] };
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data: missing }));
  try {
    for (const view of ["timeline", "stage"]) {
      await click(button(view));
      const row = [...document.querySelectorAll("button")].find((el) => el.textContent.includes(missing.companies[0].name));
      assert.match(row.textContent, /Founding year · Unknown/);
      await click(row);
      const detail = document.querySelector('[role="dialog"]');
      const section = [...detail.querySelectorAll("section")].find((el) => el.querySelector("h3")?.textContent === "Founding year");
      assert.match(section.textContent, /Unknown/);
      assert.match(section.textContent, /not yet verified/i);
      assert.equal(section.querySelector("a"), null);
      await click(detail.querySelector('[aria-label="Close detail panel"]'));
    }
  } finally { await cleanup(); }
});

test("company filtering and capital ranking preserve the founding provenance unchanged", () => {
  for (const company of data.companies) {
    const rows = buildCompanyRows(data.companies, data.rounds, { query: company.name, scope: "All", modality: "All" });
    assert.deepEqual(rows.find((row) => row.slug === company.slug)?.founding, company.founding);
  }
});
