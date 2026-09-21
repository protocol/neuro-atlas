// Verify real production output after a build with the SAME environment settings.
// This does not bypass auth or replace paired-app HTTP/browser verification.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const prefix = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const site = process.env.ATLAS_SITE_URL || undefined;
const indexable = process.env.ATLAS_INDEXABLE === "true";
const read = file => fs.readFileSync(file, "utf8");
const config = JSON.parse(read(".next/required-server-files.json")).config;
assert.equal(config.basePath, prefix, "Build and verification basePath differ");
const routes = ["/", "/milestones", "/funding", "/field-velocity", "/methodology"];
const internalPaths = new Set(routes.map(route => prefix + route));
if (prefix) internalPaths.add(prefix); // Next removes the home-link trailing slash by default.
let assets = new Set();
for (const route of routes) {
  const html = read(`.next/server/app/${route === "/" ? "index" : route.slice(1)}.html`);
  const document = new JSDOM(html).window.document;
  const canonical = document.querySelector('link[rel="canonical"]');
  const og = document.querySelector('meta[property="og:url"]');
  if (site) {
    const expected = new URL(prefix + route, site).href;
    assert.equal(canonical?.getAttribute("href"), expected, route);
    assert.equal(og?.getAttribute("content"), expected, route);
    assert.equal(document.querySelector('meta[name="robots"]')?.getAttribute("content"), indexable ? "index, follow" : "noindex, nofollow", route);
  } else {
    assert.equal(canonical, null, route);
    assert.equal(og, null, route);
  }
  for (const a of document.querySelectorAll('a[href^="/"]')) {
    assert.ok(internalPaths.has(a.getAttribute("href")), `Unexpected internal URL: ${a.getAttribute("href")}`);
  }
  for (const element of document.querySelectorAll('img[src], script[src], link[href]')) {
    const url = element.getAttribute("src") ?? element.getAttribute("href");
    if (!url.startsWith("/") || url.startsWith("//")) continue;
    assert.ok(url.startsWith(prefix + "/"), `Unprefixed asset ${url}`);
    const local = url.slice(prefix.length).split("?")[0];
    const file = local.startsWith("/_next/") ? `.next/${local.slice(7)}` : local === "/favicon.ico" ? "src/app/favicon.ico" : `public${local}`;
    assert.ok(fs.existsSync(file), `Missing built/public asset ${file}`);
    assets.add(url);
  }
  const active = [...document.querySelectorAll('[aria-current="page"]')].map(a => a.getAttribute("href"));
  assert.deepEqual(active, ["/milestones", "/funding", "/field-velocity"].includes(route) ? [prefix + route, prefix + route] : [], route);
  assert.equal([...document.querySelectorAll('a[href="https://www.plrd.org/"]')].filter(a => a.textContent.trim() === "by PL R&D").length, 2, "Desktop/mobile return links");
  assert.equal(document.querySelectorAll('footer a[href="https://www.plrd.org/"]').length, 1, "Footer return link");
  assert.ok(document.querySelector('a[href="https://github.com/protocol/neuro-atlas"]'), "Transferred repository link");
}
const redirects = JSON.parse(read(".next/routes-manifest.json")).redirects;
const regulatory = redirects.find(row => row.source === prefix + "/regulatory-landscape");
assert.ok(regulatory, "Missing regulatory redirect");
assert.equal(regulatory.destination, prefix + "/milestones");
assert.equal(regulatory.statusCode, 307);
const sitemap = read(".next/server/app/sitemap.xml.body");
const sitemapDocument = new JSDOM(sitemap, { contentType: "text/xml" }).window.document;
assert.deepEqual([...sitemapDocument.querySelectorAll("loc")].map(node => node.textContent), site && indexable ? routes.map(route => new URL(prefix + route, site).href) : []);
const logos = fs.readdirSync("public/logos");
for (const logo of logos) assert.ok(fs.statSync(path.join("public/logos", logo)).size > 0);
console.log(JSON.stringify({ mode: prefix || "root", pages: routes.length, referencedAssets: assets.size, publicLogos: logos.length, canonicalOrigin: site ?? null, indexable, redirect: regulatory.destination, auth: "unchanged; HTTP/browser gate checks are separate", result: "PASS" }, null, 2));
