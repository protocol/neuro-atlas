import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { readFileSync, existsSync } from "node:fs";
import * as PageModule from "../src/app/methodology/page.tsx";
import { SiteFooter } from "../src/components/site-footer.tsx";
import { atlasPath } from "../src/lib/atlas-path.ts";
const Page = PageModule.default?.default ?? PageModule.default;
const catalog = JSON.parse(readFileSync("src/data/methodology-sources.json", "utf8"));

test("every source logo wall ends with a small non-exhaustive + more cue", () => {
  const dom = page();
  try {
    const strips = [...dom.window.document.querySelectorAll("#source-directory [data-source-brands]")];
    assert.equal(strips.length, Object.keys(catalog).length);
    for (const strip of strips) {
      const more = strip.querySelector("[data-source-more]");
      assert.ok(more, "A curated logo strip must not look exhaustive");
      assert.equal(more.textContent, "+ more");
      assert.equal(strip.lastElementChild, more);
      assert.equal(more.querySelector("a, button"), null, "The cue belongs to the category disclosure, not a fake link");
    }
  } finally { dom.window.close(); }
});

test("every expanded source link has a decorative logo or matching placeholder without changing link names", () => {
  const dom = page();
  try {
    const doc = dom.window.document;
    let fallbackCount = 0;
    let brandCount = 0;
    for (const link of doc.querySelectorAll("#source-directory li a[data-source-link]")) {
      const marks = link.querySelectorAll("[data-source-brand-id], [data-source-placeholder]");
      assert.equal(marks.length, 1, `Missing or duplicate source mark: ${link.textContent}`);
      assert.equal(marks[0].getAttribute("aria-hidden"), "true");
      if (marks[0].hasAttribute("data-source-placeholder")) {
        fallbackCount++;
        assert.ok(marks[0].querySelector("svg"), "Unknown providers use a bundled neutral icon");
        assert.equal(marks[0].querySelector("img"), null);
        assert.equal(marks[0].textContent, "", "The placeholder must not alter the link's name");
      } else brandCount++;
    }
    assert.ok(fallbackCount > 0 && brandCount > 0, "Check both known and unknown providers");
    for (const [key, rows] of Object.entries(catalog)) {
      assert.deepEqual([...doc.querySelectorAll(`#sources-${key} li a[data-source-link]`)].map(a => [a.getAttribute("href"), a.textContent]), rows);
    }
  } finally { dom.window.close(); }
});

function page() { return new JSDOM(renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement("main", null, React.createElement(Page)), React.createElement(SiteFooter)))); }

test("each source category has a restrained real-brand strip with legible source names", () => {
  const dom = page();
  try {
    for (const key of Object.keys(catalog)) {
      const summary = dom.window.document.querySelector(`#sources-${key} summary`);
      const strip = summary.querySelector("[data-source-brands]");
      assert.ok(strip, `${key} needs visible source logos before expanding`);
      const brands = [...strip.children].filter(element => element.querySelector("[data-source-brand-id]"));
      assert.ok(brands.length >= 1 && brands.length <= 4, `${key} should have a bounded source strip`);
      for (const brand of brands) {
        assert.ok(brand.textContent.trim(), "Keep readable source names with logomarks");
        assert.equal(brand.querySelector("img")?.getAttribute("alt"), "", "Adjacent source name owns the accessible label");
      }
    }
  } finally { dom.window.close(); }
});

test("recognized publisher and company links gain correct logos without changing any catalog links or labels", () => {
  const dom = page();
  try {
    const doc = dom.window.document;
    for (const [key, rows] of Object.entries(catalog)) {
      assert.deepEqual([...doc.querySelectorAll(`#sources-${key} li a[data-source-link]`)].map(a => [a.getAttribute("href"), a.textContent]), rows);
    }
    for (const [url, brand] of [
      ["https://www.nature.com/articles/s41586-023-06377-x", "nature"],
      ["https://neuralink.com/", "neuralink"],
    ]) {
      const link = [...doc.querySelectorAll("#source-directory li a[data-source-link]")].find(a => a.getAttribute("href") === url);
      assert.ok(link, url);
      assert.equal(link.querySelector("[data-source-brand-id]")?.getAttribute("data-source-brand-id"), brand, url);
    }
  } finally { dom.window.close(); }
});

test("both named footer data sources have their own real logo and retained link names", () => {
  const dom = page();
  try {
    const doc = dom.window.document;
    for (const name of ["Neurotech Futures", "Neurofounders"]) {
      const link = [...doc.querySelectorAll("footer a")].find(a => a.textContent === name);
      assert.ok(link, name);
      assert.ok(link.querySelector("img"), `${name} is currently text-only`);
      assert.equal(link.querySelector("img").getAttribute("alt"), "");
      assert.equal(link.getAttribute("href"), name === "Neurotech Futures" ? "https://neurotechnology.substack.com" : "https://www.neurofounders.co/resources/start-up-map");
    }
    assert.ok([...doc.querySelectorAll("footer h2")].some(h => h.textContent === "Data & Methodology"), "Use the owner's shorter footer heading");
  } finally { dom.window.close(); }
});

test("every source mark is a bundled, base-path-safe asset with intrinsic dimensions and no remote image calls", () => {
  const dom = page();
  try {
    const imgs = [...dom.window.document.querySelectorAll("[data-source-brand-id] img")];
    assert.ok(imgs.length > 50, "Recognized directory entries should receive marks as well as the category strips");
    for (const image of imgs) {
      const src = image.getAttribute("src");
      assert.ok(src.startsWith(atlasPath("/")), src);
      assert.ok(!src.startsWith("http"), src);
      const relative = src.replace(atlasPath("/"), "");
      assert.ok(existsSync(`public/${relative}`), `Missing logo asset ${relative}`);
      assert.ok(Number(image.getAttribute("width")) > 0 && Number(image.getAttribute("height")) > 0);
      assert.equal(image.getAttribute("alt"), "");
    }
  } finally { dom.window.close(); }
});
