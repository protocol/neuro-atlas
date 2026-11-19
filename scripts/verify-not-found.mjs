import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const origin = new URL(process.argv[2] || "http://127.0.0.1:38194");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname), "Runtime QA is loopback-only");
const basePath = process.argv[3] ?? "/neuro-atlas";
const missing = ["/field-velocity3", "/field-velocity3/", "/funding/missing-company", "/not-a-page?source=missing"];
const results = [];
for (const path of missing) {
  const response = await fetch(new URL(basePath + path, origin), { redirect: "manual" });
  // Next canonicalizes a trailing slash before serving its not-found page.
  const page = response.status === 308
    ? await fetch(new URL(response.headers.get("location"), origin), { redirect: "manual" })
    : response;
  assert.equal(page.status, 404, `${path} must retain an actual HTTP 404`);
  const dom = new JSDOM(await page.text());
  const document = dom.window.document;
  assert.equal(document.querySelector("h1")?.textContent, "Off the map.");
  assert.ok(document.querySelector('meta[name="robots"][content*="noindex"]'), "Missing pages must not be indexed");
  assert.equal(document.querySelector(".next-error-h1"), null, "No stock Next error or body reset");
  assert.equal(document.querySelectorAll("main").length, 1);
  const links = [...document.querySelectorAll(".atlas-not-found a")].map((a) => a.getAttribute("href"));
  assert.deepEqual(links, [basePath || "/", `${basePath}/milestones`, `${basePath}/field-velocity`, `${basePath}/funding`]);
  results.push({ path, status: page.status, links });
  dom.window.close();
}
for (const path of ["", "/milestones", "/field-velocity", "/funding"]) {
  const response = await fetch(new URL((basePath + path) || "/", origin), { redirect: "manual" });
  assert.equal(response.status, 200, `Recovery destination ${path || "/"} must resolve`);
}
console.log(JSON.stringify({ result: "PASS", missing: results, recovery: "all four destinations return 200" }, null, 2));
