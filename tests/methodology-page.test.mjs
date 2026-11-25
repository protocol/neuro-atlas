import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import * as Methodology from "../src/app/methodology/page.tsx";
const MethodologyPage = Methodology.default?.default ?? Methodology.default;
import { SiteFooter } from "../src/components/site-footer.tsx";
import { atlasPath } from "../src/lib/atlas-path.ts";
import { NEUROFOUNDERS_MAP_URL } from "../src/lib/ecosystem.ts";

test("the canonical methodology page explains purpose, selection and refresh limits", () => {
  const { window } = new JSDOM(renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement("main", null, React.createElement(MethodologyPage)), React.createElement(SiteFooter))));
  try {
    const { document } = window;
    assert.equal(document.querySelector("h1")?.textContent, "Sources & methodology");
    const main = document.querySelector("main");
    const copy = main.textContent.replace(/\s+/g, " ");
    assert.ok(copy.includes("At PL Neuro, we wanted one place to follow how neurotechnology was progressing: what researchers could measure and build, which companies were reaching clinical and commercial milestones, and where capital was going. We couldn’t quite find the combination we were looking for, so we built it ourselves."));
    assert.ok(copy.includes("This is the kind of field building we’re proud to do at PL Neuro: turning scattered evidence into a useful public resource that researchers, builders, and funders can work from – and we hope to work with the community to improve it together."));
    for (const phrase of ["We aim to review and update Neuro Atlas daily", "weekly", "observation date", "USD 2 million", "Capital sums included disclosed financings, including labeled philanthropic commitments"]) assert.ok(copy.includes(phrase), phrase);
    const hrefs = [...main.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    for (const href of [NEUROFOUNDERS_MAP_URL, "https://neurotechnology.substack.com/p/representations2", atlasPath("/funding"), "https://www.plrd.org/", "https://github.com/protocol/neuro-atlas/pulls", "#data-disclaimer"]) assert.ok(hrefs.includes(href), href);
    assert.match(document.getElementById("data-disclaimer").textContent, /may contain errors/);
    for (const text of ["Principles and glossary", "Status legend", "Changelog", "Acronyms get tooltips", "Every reading carries provenance"]) assert.ok(!copy.includes(text), `Removed content must stay absent: ${text}`);
  } finally { window.close(); }
});

import { Feedback } from "../src/components/feedback/feedback.tsx";
import { mount, click } from "./modal-helpers.mjs";

test("the methodology Feedback button opens the existing selector without a login or submission", async () => {
  const requests = [];
  const cleanup = await mount(React.createElement(React.Fragment, null,
    React.createElement(MethodologyPage), React.createElement(Feedback)), "", (win) => {
    win.fetch = async (url, options) => {
      requests.push([String(url), options?.method ?? "GET"]);
      return Response.json({ enabled: true, connected: true });
    };
  });
  try {
    const trigger = document.querySelector("#contribute button[data-feedback-trigger]");
    assert.ok(trigger, "The methodology page needs a working Feedback button");
    assert.match(document.querySelector("#contribute").textContent, /Fork the Neuro Atlas repository and open a pull request/);
    trigger.focus();
    await click(trigger);
    assert.equal(document.querySelector("[data-feedback-selection]")?.getAttribute("aria-label"), "Select feedback element");
    assert.ok(requests.every(([url, method]) => method === "GET" && !url.includes("/auth/")));
    await click(trigger);
    assert.equal(document.querySelector("[data-feedback-selection]"), null);
    assert.equal(document.activeElement, trigger);
  } finally { await cleanup(); }
});


test("the rebuilt page removes old principles and status/history sections and keeps a compact header", () => {
  const { window } = new JSDOM(renderToStaticMarkup(React.createElement(MethodologyPage)));
  try {
    const document = window.document;
    assert.equal(document.querySelector("h1").textContent, "Sources & methodology");
    assert.equal(document.querySelector("header p"), null, "Remove the old subheader rather than hiding it");
    for (const label of ["Principles", "Status legend", "Changelog", "Acronyms get tooltips"]) {
      assert.ok(![...document.querySelectorAll("h2,h3,summary")].some((element) => element.textContent.includes(label)), label);
    }
    assert.equal(document.querySelectorAll("details").length, 6, "Only the six source categories remain as disclosures");
  } finally { window.close(); }
});

test("closed source-family summaries identify the actual providers before expanding hundreds of links", () => {
  const { window } = new JSDOM(renderToStaticMarkup(React.createElement(MethodologyPage)));
  try {
    const doc = window.document;
    assert.match(doc.querySelector("#sources-datasets summary").textContent, /OpenAlex.*Google Trends/);
    assert.match(doc.querySelector("#sources-discovery summary").textContent, /Neurotech Futures/);
    assert.match(doc.querySelector("#sources-reference summary").textContent, /PL R&D/);
    assert.ok(![...doc.querySelectorAll("h2")].some((h) => h.textContent === "Source overview"), "Use one categorized source overview instead of duplicate partial catalogs");
  } finally { window.close(); }
});

test("the methodology directory renders every classified link under its own disclosure", () => {
  const { window } = new JSDOM(renderToStaticMarkup(React.createElement(MethodologyPage)));
  try {
    const directory = window.document.getElementById("source-directory");
    assert.ok(directory, "Missing the public source directory");
    const sections = [...directory.querySelectorAll("details")];
    const catalog = JSON.parse(readFileSync("src/data/methodology-sources.json", "utf8"));
    assert.equal(sections.length, Object.keys(catalog).length);
    for (const [key, entries] of Object.entries(catalog)) {
      const details = directory.querySelector(`#sources-${key}`);
      assert.equal(details.open, false);
      assert.ok(details.querySelector("summary")?.textContent.includes(String(entries.length)));
      assert.deepEqual([...details.querySelectorAll("a[data-source-link]")].map((a) => [a.getAttribute("href"), a.textContent]), entries);
    }
  } finally { window.close(); }
});


test("Field Velocity credits researcher correspondence and invites missing references through Feedback", () => {
  const { window } = new JSDOM(renderToStaticMarkup(React.createElement(MethodologyPage)));
  try {
    const doc = window.document;
    const credit = doc.querySelector("#field-velocity-methodology");
    assert.ok(credit, "Field Velocity needs an explicit researcher acknowledgment");
    assert.match(credit.textContent, /corresponded with many of the original researchers around the world/);
    assert.match(credit.textContent, /grateful for their research and feedback.*represent their work accurately/);
    assert.match(credit.textContent, /research and feedback, which helps us represent their work accurately/);
    assert.match(credit.textContent, /missing credits or references/);
    assert.equal(credit.querySelector('a[href="#contribute"]')?.textContent, "Feedback");
    for (const [href, title] of [
      ["https://www.nature.com/articles/s41586-023-06377-x", "A high-performance speech neuroprosthesis"],
      ["https://www.nature.com/articles/s41586-024-07558-y", "Neuronal wiring diagram of an adult brain"],
      ["https://www.nature.com/articles/s41586-025-08790-w", "Functional connectomics spanning multiple areas of mouse visual cortex"],
    ]) {
      const link = doc.querySelector(`#sources-studies a[href="${href}"]`);
      assert.ok(link?.textContent.includes(title), title);
    }
  } finally { window.close(); }
});
