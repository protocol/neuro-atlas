import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import * as HomeModule from "../src/app/page.tsx";
import * as Nav from "../src/components/site-nav.tsx";
import { SiteFooter } from "../src/components/site-footer.tsx";
import { NEUROFOUNDERS_MAP_URL } from "../src/lib/ecosystem.ts";

const Home = HomeModule.default?.default ?? HomeModule.default;
const render = (Component) => new JSDOM(renderToStaticMarkup(React.createElement(Component))).window.document;

test("external source and methodology discovery move into the footer while primary navigation stays native", () => {
  for (const Component of [Home, Nav.SideNav, Nav.MobileBar]) {
    const document = render(Component);
    assert.equal(document.querySelector(`a[href="${NEUROFOUNDERS_MAP_URL}"]`), null, "Relocate the external map instead of duplicating it");
    assert.equal(document.querySelector('a[href="/methodology"]'), null, "The shared footer owns methodology discovery");
  }
  const home = render(Home);
  assert.deepEqual([...home.querySelectorAll(".landing-tile")].map((a) => a.getAttribute("href")), ["/milestones", "/field-velocity", "/funding"]);
  for (const Component of [Nav.SideNav, Nav.MobileBar]) {
    const document = render(Component);
    assert.deepEqual([...document.querySelectorAll("nav a")].map((a) => a.getAttribute("href")), ["/milestones", "/field-velocity", "/funding"]);
  }
  const footer = render(SiteFooter);
  assert.ok(footer.querySelector(`a[href="${NEUROFOUNDERS_MAP_URL}"]`));
  assert.ok(footer.querySelector('a[href="/methodology"]'));
});
