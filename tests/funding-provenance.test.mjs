import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";

import {
  buildFundingIndex,
  formatFundingDate,
} from "../scripts/lib/funding-index.mjs";
import { formatFundingDate as formatFundingDateFromTypeScript } from "../src/lib/funding-index.ts";
import { FundingIndexDashboard } from "../src/components/funding-index-dashboard.tsx";

const company = {
  slug: "precision",
  name: "Precision",
  hq: "New York, USA",
  modality: "ECoG",
  interface_depth: "Cortical Surface",
  indication: "Paralysis",
  website: "https://example.com",
  scope: "Implanted",
};

function round(overrides = {}) {
  return {
    company_slug: "precision",
    announced_on: "2024-02-01",
    date_precision: "day",
    stage: "Seed",
    amount_usd_m: "12",
    amount_native_m: "",
    currency: "USD",
    display_amount: "$12m",
    investors: "Lead Fund",
    source_url: "https://example.com/seed",
    note: "",
    source_kind: "",
    reviewed_on: "",
    ...overrides,
  };
}

function dashboardData(overrides = {}) {
  return {
    companies: [{
      slug: "precision",
      name: "Precision",
      hq: "New York, USA",
      modality: "ECoG",
      interfaceDepth: "Cortical Surface",
      indication: "Paralysis",
      website: "https://example.com",
      scope: "Implanted",
    }],
    rounds: [{
      companySlug: "precision",
      announcedOn: "2024-02-01",
      datePrecision: "day",
      stage: "Seed",
      amountUsdM: 12,
      displayAmount: "$12m",
      investors: ["Lead Fund"],
      sourceUrl: "https://example.com/seed",
      note: "Indexed financing.",
    }],
    milestones: [{
      companySlug: "precision",
      announcedOn: "2024",
      datePrecision: "year",
      marker: "IDE",
      indication: "Paralysis",
      sourceUrl: "https://example.com/ide",
      note: "Regulatory marker.",
    }],
    investors: [],
    summary: {
      selectedCompanies: 1,
      indexedRounds: 1,
      regulatoryMilestones: 1,
      observedCapitalUsdM: 12,
      firstYear: 2024,
      lastYear: 2024,
      asOf: "2026-09-30",
      excludedBelowThreshold: 0,
    },
    methodology: {
      thresholdUsdM: 2,
      scope: "Selected companies.",
      coverage: "Selective public sources.",
    },
    ...overrides,
  };
}

function renderDashboard(data) {
  globalThis.React = React;
  return new JSDOM(renderToStaticMarkup(React.createElement(FundingIndexDashboard, { data }))).window.document;
}

test("passes optional public-source provenance through without labeling older rows reviewed", () => {
  const index = buildFundingIndex({
    companies: [company],
    rounds: [
      round({ source_kind: "primary", reviewed_on: "2026-09-30" }),
      round({
        announced_on: "2024-03-01",
        stage: "Series A",
        source_kind: "reporting",
        reviewed_on: "2026-09-29",
      }),
      round({ announced_on: "2024-04-01", stage: "Series B" }),
    ],
    milestones: [],
  });

  assert.deepEqual(index.rounds.map((item) => [item.sourceKind, item.reviewedOn]), [
    ["primary", "2026-09-30"],
    ["reporting", "2026-09-29"],
    [undefined, undefined],
  ]);
});

test("rejects duplicate events, invalid source kinds, and invalid disclosed amounts", () => {
  const sources = { companies: [company], milestones: [] };

  assert.throws(
    () => buildFundingIndex({
      ...sources,
      rounds: [round(), round({ source_url: "https://example.com/duplicate" })],
    }),
    /duplicate/i,
  );
  assert.throws(
    () => buildFundingIndex({ ...sources, rounds: [round({ source_kind: "verified" })] }),
    /source_kind/i,
  );
  assert.throws(
    () => buildFundingIndex({ ...sources, rounds: [round({ amount_usd_m: "-1" })] }),
    /amount/i,
  );
  assert.throws(
    () => buildFundingIndex({ ...sources, rounds: [round({ amount_usd_m: "Infinity" })] }),
    /amount/i,
  );
});

test("keeps the existing threshold and excludes missing amounts without treating them as zero", () => {
  const index = buildFundingIndex({
    companies: [company],
    rounds: [
      round({ amount_usd_m: "1.5", stage: "Pre-seed" }),
      round({ announced_on: "2024-03-01", stage: "Undisclosed", amount_usd_m: "" }),
    ],
    milestones: [],
  });

  assert.deepEqual(index.rounds, []);
  assert.equal(index.summary.excludedBelowThreshold, 1);
});

test("dedupes exact repeated investor names within an event without changing participation counts", () => {
  const index = buildFundingIndex({
    companies: [company],
    rounds: [round({ investors: "Lead Fund; Lead Fund; Follow Fund" })],
    milestones: [],
  });

  assert.deepEqual(index.rounds[0].investors, ["Lead Fund", "Follow Fund"]);
  assert.equal(index.investors.find((investor) => investor.name === "Lead Fund").roundCount, 1);
});

test("formats year, month, and day dates without inventing a month or day", () => {
  assert.equal(formatFundingDate("2024", "year"), "2024");
  assert.equal(formatFundingDate("2024-02", "month"), "Feb 2024");
  assert.equal(formatFundingDate("2024-02-01", "day"), "Feb 1, 2024");
  assert.equal(formatFundingDateFromTypeScript("2024", "year"), formatFundingDate("2024", "year"));
  assert.equal(formatFundingDateFromTypeScript("2024-02", "month"), formatFundingDate("2024-02", "month"));
  assert.equal(formatFundingDateFromTypeScript("2024-02-01", "day"), formatFundingDate("2024-02-01", "day"));
});

test("renders source provenance, reviewed dates, and partial-history coverage", () => {
  const document = renderDashboard(dashboardData({
    rounds: [{
      ...dashboardData().rounds[0],
      sourceKind: "primary",
      reviewedOn: "2026-09-30",
    }],
  }));
  const text = document.body.textContent;

  assert.match(text, /Primary source/);
  assert.match(text, /Source reviewed Sep 30, 2026/);
  assert.match(text, /Latest selective review Sep 30, 2026/);
  assert.doesNotMatch(text, /Data through/);
  assert.match(text, /Financing histories remain partial/);
  assert.match(text, /indexed sum is not an all-time total/i);
  assert.match(text, /2024/);
  assert.doesNotMatch(text, /Jan 2024/);
});

test("labels reporting sources and leaves unreviewed cards without a verified label", () => {
  const document = renderDashboard(dashboardData({
    rounds: [{
      ...dashboardData().rounds[0],
      sourceKind: "reporting",
      reviewedOn: "2026-09",
      datePrecision: "month",
    }],
  }));
  const text = document.body.textContent;

  assert.match(text, /Reported source/);
  assert.match(text, /Source reviewed Sep 2026/);
  assert.doesNotMatch(text, /Verified source|\bverified\b/i);
});
