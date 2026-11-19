import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";

globalThis.React = React;

test("unmatched URLs have a branded explanation and safe paths back into Neuro Atlas", async () => {
  assert.ok(existsSync(new URL("../src/app/not-found.tsx", import.meta.url)), "Provide a custom not-found page instead of Next's stock full-height error");
  const imported = await import("../src/app/not-found.tsx");
  const NotFound = typeof imported.default === "function" ? imported.default : imported.default.default;
  const document = new JSDOM(renderToStaticMarkup(React.createElement(NotFound))).window.document;
  assert.equal(document.querySelectorAll("h1").length, 1);
  assert.equal(document.querySelector("h1").textContent, "Off the map.");
  assert.match(document.body.textContent, /404/);
  assert.match(document.body.textContent, /page.*(find|found)|find.*page/i);
  assert.match(document.body.textContent, /link|address/i);
  const links = [...document.querySelectorAll("a")];
  assert.deepEqual(links.map((link) => link.getAttribute("href")), ["/", "/milestones", "/field-velocity", "/funding"]);
  assert.match(links[0].textContent, /Neuro Atlas/);
  assert.deepEqual(links.slice(1).map((link) => link.querySelector("h3").textContent), ["Milestones", "Field Velocity", "BCI Funding Index"]);
  for (const link of links) {
    assert.equal(link.getAttribute("target"), null, "Recovery stays in the same tab");
    assert.equal(link.querySelector("a,button"), null, "No nested controls");
  }
  assert.equal(document.querySelector("script,style,iframe,input"), null, "No stock body reset or unnecessary interactive client state");
  assert.ok(document.querySelector('svg[aria-hidden="true"]'));
});
