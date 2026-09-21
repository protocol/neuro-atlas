import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import Home from "../src/app/page.tsx";

globalThis.React = React;
const HomeComponent = typeof Home === "function" ? Home : Home.default;
const render = () => new JSDOM(renderToStaticMarkup(React.createElement(HomeComponent))).window.document;

test("landing introduces the whole neurotechnology field without context-free snapshot figures", () => {
  const document = render();
  assert.equal(document.querySelector("h1").textContent.trim(), "Neurotechnology, mapped.");
  assert.doesNotMatch(document.body.textContent, /People implanted|Capital raised|Companies tracked|Market approvals|\$653m|363|25-company|live field tracker|Neuro Atlas Content/i);
  assert.equal(document.querySelector("h1 br"), null);
  assert.doesNotMatch(document.querySelector("h1").className, /max-w/);
});

test("four visual tiles keep all destinations and accessible names", () => {
  const document = render();
  const tiles = [...document.querySelectorAll(".landing-tile")];
  assert.equal(tiles.length, 4);
  assert.deepEqual(tiles.map((a) => a.getAttribute("href")), ["/milestones", "https://www.neurofounders.co/resources/start-up-map", "/funding", "/field-velocity"]);
  for (const tile of tiles) {
    assert.ok(tile.querySelector("h3"));
    assert.equal(tile.getAttribute("aria-labelledby"), tile.querySelector("h3").id);
    assert.ok(tile.querySelector('svg[aria-hidden="true"]'));
    assert.equal(tile.querySelector("svg text"), null, "Decorative diagrams must not imply live data readings");
    assert.equal(tile.querySelector("a,button"), null, "No nested interaction targets");
  }
});

test("hero offers a real explore anchor and GitHub pull-request route for feedback", () => {
  const document = render();
  const hero = document.querySelector(".landing-hero");
  const explore = hero.querySelector('a[href="#explore"]');
  assert.ok(explore, "Missing exploration CTA");
  assert.ok(document.querySelector("#explore"), "Explore target must exist");
  assert.equal(document.querySelector("#explore").getAttribute("tabindex"), "-1");
  const contribute = hero.querySelector('a[href="https://github.com/protocol/neuro-atlas/compare"]');
  assert.ok(contribute, "Contribution CTA should reach the new-PR flow, not a placeholder");
  assert.match(contribute.textContent, /Contribute via PR/);
  assert.match(hero.textContent, /Feedback, corrections, or new data/);
  assert.ok(document.querySelector('a[href="/methodology"]'));
});
