import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import Home from "../src/app/page.tsx";
import EcosystemPage from "../src/app/ecosystem/page.tsx";
import * as Nav from "../src/components/site-nav.tsx";
import { SiteFooter } from "../src/components/site-footer.tsx";

globalThis.React = React;
const moduleValue = (x) => x.default ?? x;
const MAP = "https://www.neurofounders.co/resources/start-up-map";
test("old Ecosystem bookmarks redirect to the original map", () => {
  assert.throws(() => moduleValue(EcosystemPage)(), (error) => error.digest === `NEXT_REDIRECT;replace;${MAP};307;`);
});
const render = (Component) => new JSDOM(renderToStaticMarkup(React.createElement(Component))).window.document;

test("sidebar and mobile header retain the three native Atlas destinations in order", () => {
  const nav = moduleValue(Nav);
  for (const Component of [nav.SideNav, nav.MobileBar]) {
    const doc = render(Component);
    const links = [...doc.querySelectorAll("nav a")];
    assert.deepEqual(links.map(link => link.getAttribute("href")), ["/milestones", "/field-velocity", "/funding"]);
    assert.deepEqual(links.map(link => link.textContent), ["Milestones", "Field Velocity", "BCI Funding Index"]);
  }
});

test("Neurofounders source discovery is in the footer instead of the home and primary navigation", () => {
  const nav = moduleValue(Nav);
  for (const Component of [moduleValue(Home), nav.SideNav, nav.MobileBar]) {
    const doc = render(Component);
    assert.equal(doc.querySelector(`a[href="${MAP}"]`), null);
    assert.equal(doc.querySelector('a[href="/ecosystem"]'), null);
  }
  const footer = render(SiteFooter);
  const link = footer.querySelector(`a[href="${MAP}"]`);
  assert.ok(link);
  assert.equal(link.textContent, "Neurofounders");
});
