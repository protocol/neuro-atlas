import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import Home from "../src/app/page.tsx";

globalThis.React = React;
const HomeComponent = typeof Home === "function" ? Home : Home.default;

test("the landing directory presents three descriptive rows with separate decorative artwork", () => {
  const document = new JSDOM(renderToStaticMarkup(React.createElement(HomeComponent))).window.document;
  const rows = [...document.querySelectorAll(".landing-rows > .landing-tile")];
  assert.equal(rows.length, 3, "All three destinations belong to a single row directory");
  assert.deepEqual(rows.map(row => row.getAttribute("href")), ["/milestones", "/field-velocity", "/funding"]);
  const topics = [
    ["Capital", "Clinical & regulatory", "Commercial"],
    ["Technical capabilities", "Research activity", "Inflection points"],
    ["Companies", "Funding rounds", "Investors"],
  ];
  for (const [index, row] of rows.entries()) {
    assert.ok(row.querySelector('.landing-tile-visual[aria-hidden="true"] svg'));
    const content = row.querySelector(".landing-tile-content");
    assert.ok(content?.querySelector("h3"), "The row title stays with its descriptive copy");
    const description = content.querySelector(".landing-tile-description");
    assert.ok(description.textContent.length > 100, "Each row adds specific context beyond the former one-line blurb");
    assert.equal(row.getAttribute("aria-describedby"), description.id);
    assert.deepEqual([...content.querySelectorAll("li")].map(li => li.textContent), topics[index]);
    assert.equal(row.querySelector("a, button"), null, "Each row is one complete navigation target");
  }
  assert.match(rows[2].querySelector(".landing-tile-description").textContent, /implanted and implant-adjacent/);
  assert.equal(document.querySelector(".landing-grid"), null, "The previous multi-column directory is replaced");
});
