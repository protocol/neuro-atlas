import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { buildCatalog } from "../../src/lib/ai/catalog.ts";

// Run after npm run build and next start on a loopback port. No browser,
// credentials, authentication bypass, or production-site requests.
const origin = process.argv[2] ?? "http://127.0.0.1:3119";
const url = new URL(origin);
assert.ok(url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
assert.ok(!url.username && !url.password && url.pathname === "/");
const catalog = buildCatalog();
const basePaths = ["/ai/", "/llms.txt", "/llms-full.txt", "/llms-full.txt?download=1", "/api/ai/query?type=round&limit=1", "/api/ai/query?limit=invalid", "/ai/records/unknown.md", "/ai/sections/unknown.md"];
const paths = [...new Set([...basePaths, ...catalog.sections.flatMap(s => [s.markdownUrl, `${s.markdownUrl}?download=1`]), ...catalog.records.map(r => r.markdownUrl)])];
let requests = 0;
async function denied(path, method = "GET", headers = {}) {
  const response = await fetch(new URL(path, origin), { method, headers, signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 401, `${method} ${path}`);
  assert.match(response.headers.get("www-authenticate"), /Basic/);
  const body = await response.text();
  if (method !== "HEAD") assert.equal(body, "Authentication required.");
  requests++;
}
// The first real HTTP request is the readiness check; no blind sleep loop.
for (const path of paths) await denied(path);
for (const path of basePaths) for (const method of ["HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]) await denied(path, method);
for (const headers of [{ authorization: "Basic !invalid!" }, { "x-middleware-subrequest": "src/proxy:src/proxy:src/proxy:src/proxy:src/proxy" }, { "x-invoke-path": "/llms-full.txt" }]) await denied("/llms-full.txt", "GET", headers);
const html = readFileSync(".next/server/app/ai.html", "utf8");
const { document } = new JSDOM(html).window;
assert.equal(document.querySelectorAll('head link[rel="describedby"][href="/llms.txt"]').length, 1);
assert.equal(document.querySelectorAll('footer a[href="/ai/"]').length, 1);
assert.equal(document.querySelectorAll("h1").length, 1);
assert.ok(document.querySelector('textarea[readonly]'));
assert.ok(document.querySelector('a[href="/llms-full.txt?download=1"]'));
assert.doesNotMatch(html, /bci-dashboard-tawny|impact-preview|dhr-preview/);
console.log(JSON.stringify({ origin, requests, uniquePaths: paths.length, status: "PASS: all unauthenticated HTTP requests denied; production SSR guide/discovery verified", authenticatedSuccess: "Not exercised over HTTP; real GET handler success/error/header behavior is covered by npm test. Parent handles authenticated browser QA." }, null, 2));
