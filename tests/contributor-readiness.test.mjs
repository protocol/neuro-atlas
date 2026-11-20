import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { SiteFooter } from "../src/components/site-footer.tsx";
import * as MethodologyModule from "../src/app/methodology/page.tsx";

const Methodology = MethodologyModule.default?.default ?? MethodologyModule.default;
const guide = "https://github.com/protocol/neuro-atlas/blob/main/CONTRIBUTING.md";
const render = (Component) => new JSDOM(renderToStaticMarkup(React.createElement(Component))).window.document;

test("readers can start a fork contribution from the footer and methodology without losing Feedback", () => {
  for (const Component of [SiteFooter, Methodology]) {
    const document = render(Component);
    const link = document.querySelector(`a[href="${guide}"]`);
    assert.ok(link, "A contribution starts with the fork and review guide, not a write-access invitation");
    assert.match(link.textContent, /contribute on github/i);
    assert.ok([...document.querySelectorAll("button")].some((button) => /feedback/i.test(button.textContent)), "Keep account-free Feedback as the alternative");
  }
  const document = render(Methodology);
  assert.doesNotMatch(document.querySelector("#contribute").textContent, /plan to enable|in the meantime/i);
  assert.match(document.querySelector("#contribute").textContent, /reviewed before/i);
  assert.ok(document.querySelector('a[href="https://github.com/protocol/neuro-atlas/pulls"]'), "Existing PR discovery remains available");
});

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("contribution ownership and instructions support forks, source evidence, and owner review", () => {
  assert.match(read(".github/CODEOWNERS"), /^\*\s+@lksbrssr\s*$/m);
  const contributing = read("CONTRIBUTING.md");
  for (const term of [/git clone/, /git switch -c/, /fork/i, /primary source/i, /npm ci/, /Lukas/, /main/, /third-party/i]) {
    assert.match(contributing, term);
  }
  assert.doesNotMatch(contributing, /currently uses HTTP Basic|no repository-wide LICENSE|hardcoded source credential/i);
  assert.match(read("README.md"), /https:\/\/www\.plneuro\.xyz\/neuro-atlas/);
  assert.doesNotMatch(read("README.md"), /Gated home|placeholder modules|owner-authenticated intake/i);
  assert.match(read("SECURITY.md"), /security\/advisories\/new/);
});


test("original project work uses the IPFS-style license choice without relicensing third-party evidence", () => {
  assert.equal(JSON.parse(read("package.json")).license, "Apache-2.0 OR MIT");
  const summary = read("LICENSE");
  assert.match(summary, /Apache-2\.0 OR MIT/);
  assert.match(summary, /third-party/i);
  assert.match(read("LICENSE-MIT"), /Permission is hereby granted, free of charge/);
  assert.match(read("LICENSE-APACHE"), /Apache License/);
  const notices = read("THIRD_PARTY_NOTICES.md");
  for (const term of [/research data/i, /logos/i, /fonts/i, /trademarks/i, /not a blanket/i, /provenance/i]) assert.match(notices, term);
});


test("fork CI has read-only credentials and never executes PR code in a privileged target workflow", () => {
  const workflow = read(".github/workflows/contributor-checks.yml");
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /name: Contributor checks/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /--test-concurrency=2/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npm run build/);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|contents: write|id-token: write|vercel|npm publish/);
  const actions = [...workflow.matchAll(/uses:\s+([^\s]+)@([^\s]+)/g)];
  assert.ok(actions.length >= 2);
  for (const [, , revision] of actions) assert.match(revision, /^[a-f0-9]{40}$/);
});


test("public-data test fixtures do not require a Henry container directory", () => {
  assert.doesNotMatch(read("tests/public-data-inventory.test.mjs"), /mkdtempSync\(['"]\/opt\/data\//);
});
