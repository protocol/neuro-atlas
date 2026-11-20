import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";

test("every Atlas route inherits one footer outside the main content landmark", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.equal((layout.match(/<SiteFooter\s*\/>/g) ?? []).length, 1);
  assert.ok(layout.indexOf("<SiteFooter") > layout.indexOf("</main>"));
});

test("the shared footer provides PL destinations and a visible investment disclaimer", async () => {
  assert.ok(existsSync("src/components/site-footer.tsx"), "The shared site footer is missing");
  const { SiteFooter } = await import("../src/components/site-footer.tsx");
  const { document } = new JSDOM(renderToStaticMarkup(React.createElement(SiteFooter))).window;
  const footer = document.querySelector("footer");
  assert.ok(footer, "Use a semantic contentinfo landmark");
  const expectedLinks = new Map([
    ["PL R&D", "https://www.plrd.org/"],
    ["PL Neuro", "https://www.plneuro.xyz/"],
    ["Protocol Labs", "https://www.protocol.ai/"],
    ["X / Twitter", "https://x.com/protocollabs_rd"],
    ["Contribute on GitHub", "https://github.com/protocol/neuro-atlas/blob/main/CONTRIBUTING.md"],
    ["Privacy Policy", "https://www.plneuro.xyz/privacy-policy/"],
    ["Terms of Service", "https://www.protocol.ai/legal/#terms-conditions"],
  ]);
  for (const [label, href] of expectedLinks) {
    const link = [...footer.querySelectorAll("a")].find((a) => a.textContent.trim() === label);
    assert.ok(link, `Missing ${label}`);
    assert.equal(link.getAttribute("href"), href);
  }
  const text = footer.textContent.replace(/\s+/g, " ");
  const disclaimer = [...footer.querySelectorAll("p")].at(-1).textContent.replace(/\s+/g, " ").trim();
  assert.equal(disclaimer, "Neuro Atlas is for informational purposes only and is not investment, legal, or medical advice. It is not an offer, solicitation, or recommendation of any security or investment product, and makes no commitment or guarantee of future performance or outcomes. Company and project inclusion does not imply endorsement. Data is compiled from third-party sources and may contain errors, be incomplete, or become outdated, and is provided without warranty. You should review the linked primary sources and do your own due diligence before relying on any data in this site. Protocol Labs, Inc. and PL Capital hold, or may hold, financial interests in companies or funds featured here.");
  assert.equal(footer.querySelector("details, button:not([data-feedback-trigger])"), null, "No hidden disclaimer or nonfunctional cookie control");
  assert.equal(footer.querySelectorAll("button[data-feedback-trigger]").length, 1, "Only the functional mobile Feedback control is added");
  assert.doesNotMatch(text, /CC-BY|all rights reserved/i, "Do not impose a new license on sourced data");
});

import { atlasPath } from "../src/lib/atlas-path.ts";
import { NEUROFOUNDERS_MAP_URL } from "../src/lib/ecosystem.ts";

test("the fourth footer group identifies the two sources and opens the existing methodology page", async () => {
  const { SiteFooter } = await import("../src/components/site-footer.tsx");
  const { window } = new JSDOM(renderToStaticMarkup(React.createElement(SiteFooter)));
  try {
    const groups = [...window.document.querySelectorAll('nav[aria-label="Footer"] h2')];
    assert.deepEqual(groups.map((heading) => heading.textContent), ["Explore", "Connect", "Legal", "Data & Methodology"]);
    const links = [...groups[3].parentElement.querySelectorAll("a")];
    assert.deepEqual(links.map((a) => [a.textContent, a.getAttribute("href")]), [
      ["Neurotech Futures", "https://neurotechnology.substack.com"],
      ["Neurofounders", NEUROFOUNDERS_MAP_URL],
      ["Learn more", atlasPath("/methodology")],
    ]);
  } finally { window.close(); }
});

for (const chrome of ["SideNav", "MobileBar"]) {
  test(`${chrome} attributes Neuro Atlas to PL Neuro with its logo and no powered-by block`, async () => {
    const nav = await import("../src/components/site-nav.tsx");
    const { window } = new JSDOM(renderToStaticMarkup(React.createElement(nav[chrome])));
    try {
      const { document } = window;
      const attribution = [...document.querySelectorAll("a")].find((link) => link.textContent.trim() === "by PL Neuro");
      assert.ok(attribution, "Missing by PL Neuro attribution");
      assert.equal(attribution.getAttribute("href"), "https://www.plneuro.xyz/");
      const logo = attribution.querySelector("img");
      assert.ok(logo?.getAttribute("src")?.endsWith("/powered-plneuro.svg"));
      assert.doesNotMatch(document.body.textContent, /powered by|by PL R&D|Neurotech Futures/i);
      assert.equal(document.querySelector(`a[href="${NEUROFOUNDERS_MAP_URL}"]`), null, "The footer now owns the external source destination");
    } finally { window.close(); }
  });
}
