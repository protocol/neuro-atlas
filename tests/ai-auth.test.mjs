import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { NextRequest } from "next/server";
import { proxy, config } from "../src/proxy.ts";
import { buildCatalog } from "../src/lib/ai/catalog.ts";

// Next's test package expects the server runtime global. This installed version
// still exports the Middleware name despite its docs calling it doesProxyMatch.
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
const { unstable_doesMiddlewareMatch } = createRequire(import.meta.url)("next/experimental/testing/server");

// Pin the original gate without copying its secret into a fixture or a request.
const BASE_PROXY_SHA256 = "0f52046e4b3a388fd3dab3f5cf04b1987b7d339d97cadb5522287be031c2a8b7";
test("the original auth gate is byte-for-byte unchanged and matches every new resource", () => {
  assert.equal(createHash("sha256").update(readFileSync("src/proxy.ts")).digest("hex"), BASE_PROXY_SHA256);
  const catalog = buildCatalog();
  const paths = ["/ai", "/ai/", "/llms.txt", "/llms-full.txt", "/llms-full.txt?download=1", "/api/ai/query", "/api/ai/query?type=round", "/ai/records/unknown.md", "/ai/sections/unknown.md", ...catalog.sections.map(s => s.markdownUrl), ...catalog.records.map(r => r.markdownUrl)];
  for (const path of paths) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path }), true, path);
    for (const method of ["GET", "HEAD", "OPTIONS", "POST"]) {
      const response = proxy(new NextRequest(`https://atlas.example${path}`, { method }));
      assert.equal(response.status, 401, `${method} ${path}`);
      assert.match(response.headers.get("www-authenticate"), /Basic/);
    }
  }
});

test("malformed auth and middleware bypass hints do not bypass the gate", () => {
  for (const headers of [{ authorization: "Basic !invalid!" }, { "x-middleware-subrequest": "src/proxy:src/proxy:src/proxy:src/proxy:src/proxy" }, { "x-invoke-path": "/llms-full.txt" }]) {
    const response = proxy(new NextRequest("https://atlas.example/llms-full.txt", { headers }));
    assert.equal(response.status, 401);
  }
});
