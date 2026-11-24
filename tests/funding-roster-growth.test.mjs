import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { createRequire } from "node:module";
import FundingPageModule from "../src/app/funding/page.tsx";
const FundingPage = typeof FundingPageModule === "function" ? FundingPageModule : FundingPageModule.default;

const require = createRequire(import.meta.url);
const funding = require("../src/data/funding-index.json");
globalThis.React = React;

test("funding hero description follows the current selected-company count rather than the original 25-company seed", async () => {
  const original = funding.summary.selectedCompanies;
  try {
    funding.summary.selectedCompanies = original + 3;
    const page = await FundingPage({ searchParams: Promise.resolve({}) });
    const hero = React.Children.toArray(page.props.children)[0];
    assert.equal(hero.props.stats[0].value, String(original + 3), "The test exercises the actual source-bound page with a changed roster count");
    assert.ok(hero.props.description.includes(`${original + 3} implanted`), "The visible description must grow with the canonical roster, just like its statistics");
    assert.ok(!hero.props.description.includes(`${original} implanted`));
  } finally {
    funding.summary.selectedCompanies = original;
  }
});
