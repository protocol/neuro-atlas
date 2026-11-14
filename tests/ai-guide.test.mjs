import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { mount, click } from "./modal-helpers.mjs";
import { buildCatalog } from "../src/lib/ai/catalog.ts";

async function loadGuide() {
  assert.ok(existsSync("src/app/ai/page.tsx"), "An SSR human AI guide must exist");
  return import("../src/app/ai/page.tsx");
}
test("SSR AI guide explains the gated context, provides full and section downloads and documents bounded JSON", async () => {
  const { default: Page } = await loadGuide();
  const { document } = new JSDOM(renderToStaticMarkup(React.createElement(Page))).window;
  assert.equal(document.querySelectorAll("h1").length, 1);
  const text = document.body.textContent;
  assert.match(text, /authentication|gated/i);
  assert.match(text, /not a census/i);
  assert.match(text, /valuation/i);
  assert.match(text, /hypothes/i);
  assert.match(text, /no new license/i);
  assert.ok(document.querySelector('a[href="/llms.txt"]'));
  assert.ok(document.querySelector('a[href="/llms-full.txt?download=1"][download]'));
  for (const section of buildCatalog().sections) assert.ok(document.querySelector(`a[href="${section.markdownUrl}?download=1"][download]`));
  assert.ok(document.querySelector('a[href^="/api/ai/query?"]'));
  assert.match(text, /400|404/);
  assert.match(text, /50|10000/);
  assert.ok(document.querySelector('textarea[readonly]'));
  assert.ok(document.querySelector('button'));
});

test("guide is visible in the shared footer and every page advertises describedby", async () => {
  const { SiteFooter } = await import("../src/components/site-footer.tsx");
  const { document } = new JSDOM(renderToStaticMarkup(React.createElement(SiteFooter))).window;
  const link = document.querySelector('footer a[href="/ai/"]');
  assert.ok(link, "A compact visible footer entry is required");
  assert.match(link.textContent, /AI/);
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.match(layout, /<link\s+rel="describedby"\s+href="\/llms\.txt"\s+type="text\/plain"\s*\/>/);
});

test("copy prompt resolves the serving host, copies actual text and exposes a manual fallback", async () => {
  await loadGuide();
  const { StarterPrompt } = await import("../src/components/ai-starter-prompt.tsx");
  let copied = "";
  const cleanup = await mount(React.createElement(StarterPrompt));
  try {
    Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText: async text => { copied = text; } } });
    const textarea = document.querySelector("textarea");
    // ReactDOM was imported before jsdom existed; its legacy input-event branch
    // needs these no-op hooks for focusing a read-only textarea in this harness.
    textarea.attachEvent = () => {};
    textarea.detachEvent = () => {};
    assert.ok(textarea.value.includes("https://atlas.example/llms.txt"));
    assert.match(textarea.value, /source|units|hypotheses/);
    await click(document.querySelector("button"));
    assert.equal(copied, textarea.value);
    assert.match(document.querySelector('[role="status"]').textContent, /copied/i);
    Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("denied"); } } });
    await click(document.querySelector("button"));
    assert.match(document.querySelector('[role="status"]').textContent, /select|copy.*manually/i);
    assert.equal(document.activeElement, textarea);
  } finally { await cleanup(); }
});
