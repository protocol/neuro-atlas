import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import Home from "../src/app/page.tsx";
import EcosystemPage from "../src/app/ecosystem/page.tsx";
import * as Nav from "../src/components/site-nav.tsx";

globalThis.React = React;
const moduleValue = (x) => x.default ?? x;
const MAP = "https://www.neurofounders.co/resources/start-up-map";
test("old Ecosystem bookmarks redirect to the original map", () => {
  assert.throws(() => moduleValue(EcosystemPage)(), (error) => error.digest === `NEXT_REDIRECT;replace;${MAP};307;`);
});
const render = (Component) => new JSDOM(renderToStaticMarkup(React.createElement(Component))).window.document;

test("sidebar and mobile header follow Milestones, Field Velocity, BCI Funding Index, Ecosystem order", () => {
  const nav = moduleValue(Nav);
  for (const Component of [nav.SideNav, nav.MobileBar]) {
    const doc = render(Component);
    const links = [...doc.querySelectorAll("nav a")].filter(link => ["/milestones", "/field-velocity", "/funding", MAP].includes(link.getAttribute("href")));
    assert.deepEqual(links.map(link => link.getAttribute("href")), ["/milestones", "/field-velocity", "/funding", MAP]);
    assert.deepEqual(links.map(link => link.textContent), ["Milestones", "Field Velocity", "BCI Funding Index", "Ecosystem ↗"]);
  }
});

test("Ecosystem links directly to Neurofounders from home and both navigation layouts", () => {
  const nav = moduleValue(Nav);
  for (const Component of [moduleValue(Home), nav.SideNav, nav.MobileBar]) {
    const doc = render(Component);
    const link = doc.querySelector(`a[href="${MAP}"]`);
    assert.ok(link, "Ecosystem must link to the original map");
    assert.equal(link.target, "_blank");
    assert.match(link.rel, /noreferrer/);
    assert.match(link.getAttribute("aria-label") ?? link.textContent, /Neurofounders/);
    assert.equal(doc.querySelector('a[href="/ecosystem"]'), null);
  }
});
