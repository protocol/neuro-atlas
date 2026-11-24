import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { renderToStaticMarkup } from "react-dom/server";
import { fieldVelocityGraph } from "../src/data/field-velocity-links.ts";
globalThis.React = React;

const inventory = JSON.parse(readFileSync(new URL("./fixtures/readable-atlas-urls.json", import.meta.url)));

test("each catalog identity has one real statically rendered graph and its evidence", async () => {
  const mod = await import("../src/app/field-velocity/[slug]/page.tsx");
  const { default: GraphPage, generateStaticParams, generateMetadata, dynamicParams } = mod.default?.default ? mod.default : mod;
  assert.equal(dynamicParams, true, "unknown paths must reach the explicit 404 guard instead of framework fallback rerouting");
  assert.deepEqual(generateStaticParams().map(v => v.slug).sort(), inventory.map(v => v[1]).sort());
  for (const [title, slug] of inventory) {
    const props = { params: Promise.resolve({slug}) };
    // The published slug and overview-title inventory stay frozen. #141 makes
    // this two-unit chart’s standalone heading deliberately quantity-neutral.
    const currentTitle = slug === "estimated-acquisition-efficiency-voxels-per-dollar" ? "Estimated acquisition efficiency" : title;
    assert.equal((await generateMetadata(props)).title, `${currentTitle} — Neuro Atlas`);
    const dom = new JSDOM(renderToStaticMarkup(await GraphPage(props)));
    try {
      const doc = dom.window.document;
      assert.equal(doc.querySelector("h1")?.textContent, currentTitle, slug);
      assert.ok(doc.querySelector("[data-graph-page] svg"), slug);
      assert.ok(doc.querySelector("[data-graph-page] a[href^='https://']"), slug);
      assert.ok(doc.querySelector("[data-graph-page] table, [data-graph-page] .draft-event-list"), slug);
      assert.ok(doc.querySelector("[data-download-chart]"), slug);
      assert.equal(doc.querySelectorAll("dialog, [data-metric-tile], [data-performance-card]").length, 0, slug);
      assert.match(doc.querySelector("[data-graph-back]").getAttribute("href"), /\/field-velocity#/);
    } finally { dom.window.close(); }
  }
  for (const slug of ["unknown", "idea_vintage", "neuralink-brand-context"]) {
    await assert.rejects(GraphPage({params: Promise.resolve({slug})}), /404/);
  }
});


test("legacy fragment translation preserves exactly the current catalog URL's relevant state", async () => {
  const mod = await import("../src/lib/field-velocity/graph-navigation.ts");
  const { legacyGraphDestination } = mod.default ?? mod;
  const links = await import("../src/data/field-velocity-links.ts");
  const { FIELD_VELOCITY_LINKS } = links.default ?? links;
  const draft = await import("../src/data/draft-chart-links.ts");
  const { draftChartAnchors, metricChartAnchors } = draft.default ?? draft;
  for (const prefix of ["", "/neuro-atlas"]) {
    const overview = `https://atlas.example${prefix}/field-velocity`;
    const known = new Set();
    for (const entry of FIELD_VELOCITY_LINKS) for (const anchor of new Set([entry.slug, entry.target, ...entry.aliases])) {
      known.add(anchor);
      for (const view of ["historical", "electrical", "human-channels", "optical", "unknown", "", "optical&recordingView=electrical", "optical&recordingView=optical"]) {
        const search = "?utm_campaign=a&utm_campaign=b&token=secret&review=1&recordingView=" + view;
        const expected = entry.kind === "chart" && !entry.fallback
          ? `${prefix}/field-velocity/${entry.slug}?review=1${entry.target === "simultaneously-recorded-neurons" && /^(historical|electrical|human-channels|optical)$/.test(view) ? `&recordingView=${view}` : ""}` : null;
        assert.equal(legacyGraphDestination(`${overview}${search}#${anchor}`, prefix), expected, anchor);
      }
    }
    for (const anchor of [...draftChartAnchors, ...metricChartAnchors]) assert.ok(known.has(anchor), anchor);
    for (const hash of ["", "#%", "#unknown", "#//evil.example/", "#https://evil.example/", "#javascript:alert(1)"]) {
      assert.equal(legacyGraphDestination(`${overview}${hash}`, prefix), null);
    }
    assert.equal(legacyGraphDestination(`${overview}/citation-latency#idea_vintage`, prefix), null, "no redirect loop or rewrite of graph URLs");
    assert.equal(legacyGraphDestination(`${overview}/#idea_vintage`, prefix), `${prefix}/field-velocity/citation-latency`);
  }
});


// Follow-up intentionally supersedes PR144's navigate-on-card contract.
test("production catalog keeps all25 card identities as exploration buttons, not page navigation", async () => {
  const page = await import("../src/app/field-velocity/page.tsx");
  const layout = await import("../src/app/field-velocity/layout.tsx");
  const Overview = page.default?.default ?? page.default;
  const Layout = layout.default?.default ?? layout.default;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(AppRouterContext.Provider, {value: {}}, React.createElement(Layout, null, React.createElement(Overview)))));
  try {
    const doc = dom.window.document;
    const bodies = [...doc.querySelectorAll("[data-metric-card-body]")];
    const slugs = bodies.map(body => {
      assert.ok(body.matches('button[aria-haspopup="dialog"]') || body.querySelector('button[aria-haspopup="dialog"]'), 'each preview opens in place');
      assert.equal(body.querySelectorAll('[data-graph-link]').length, 0);
      const owner = body.closest('[data-draft-popout], [data-performance-card], [data-trends-card]');
      const anchor = owner.dataset.draftPopout ?? owner.dataset.performanceCard ?? `google-trends-${owner.dataset.trendsCard}`;
      return fieldVelocityGraph(anchor).slug;
    });
    assert.deepEqual(slugs.sort(), inventory.map(value => value[1]).sort());
  } finally { dom.window.close(); }
});


test("ordinary link activation stores per-entry overview search, groups, offsets and an arrow return ticket", async () => {
  const mod = await import("../src/lib/field-velocity/overview-return.ts");
  const { captureOverviewDeparture, readOverviewReturn, claimGraphOrigin, prepareOverviewReturn } = mod.default ?? mod;
  const dom = new JSDOM(`<section class="metrics-index"><input id="metrics-search" value="H01">
    <section data-metrics-category="Cost and automation" data-metric-state="collapsed"></section>
    <div id="metric-category-0-charts" data-metric-rail></div></section>`, {url:"https://atlas.example/field-velocity?campaign=a&campaign=b#metrics"});
  try {
    const w = dom.window;
    w.history.replaceState({ __NA: true, tree: ["retained"] }, "");
    w.document.querySelector("[data-metric-rail]").scrollLeft = 193;
    Object.defineProperty(w, "scrollY", {value: 410});
    captureOverviewDeparture(w, "/field-velocity/citation-latency?campaign=a&campaign=b", "idea_vintage");
    assert.deepEqual(w.history.state.tree, ["retained"]);
    const snapshot = readOverviewReturn(w);
    assert.equal(snapshot.href, "/field-velocity?campaign=a&campaign=b#metrics");
    assert.equal(snapshot.query, "H01");
    assert.equal(snapshot.groups["Cost and automation"], "collapsed");
    assert.equal(snapshot.rails["metric-category-0-charts"], 193);
    assert.equal(snapshot.scrollY, 410);
    assert.equal(snapshot.anchor, "idea_vintage");
    w.history.pushState({}, "", "/field-velocity/citation-latency?campaign=a&campaign=b");
    assert.deepEqual(claimGraphOrigin(w), snapshot);
    assert.equal(prepareOverviewReturn(w), snapshot.href);
    w.history.pushState({}, "", snapshot.href);
    assert.deepEqual(readOverviewReturn(w), snapshot);
    w.history.pushState({}, "", snapshot.href);
    assert.equal(readOverviewReturn(w), null, "a fresh visit does not inherit a spent arrow ticket");
  } finally { dom.window.close(); }
});


test("share URLs and exported filenames use the canonical route with only the chosen recording view", async () => {
  const mod = await import("../src/lib/chart-export.ts");
  const { chartShareUrl, chartImageFilename } = mod.default ?? mod;
  for (const prefix of ["", "/neuro-atlas"]) {
    const url = `https://user:private@atlas.example${prefix}/field-velocity`;
    const path = `https://atlas.example${prefix}/field-velocity`;
    for (const view of ["historical", "electrical", "human-channels", "optical"]) {
      const query = `?token=private&review=1&recordingView=${view}`;
      const legacy = `${url}${query}#simultaneously-recorded-neurons`;
      const canonical = `${path}/simultaneous-neural-recordings?recordingView=${view}`;
      for (const current of [legacy, canonical]) {
        assert.equal(chartShareUrl(current, "simultaneously-recorded-neurons"), canonical);
        assert.equal(chartImageFilename("simultaneously-recorded-neurons", current), `neuro-atlas-simultaneous-neural-recordings-${view}.png`);
        assert.equal(chartShareUrl(current, "idea_vintage"), `${path}/citation-latency`);
      }
    }
    const malformed = `${url}?recordingView=optical&recordingView=optical`;
    assert.equal(chartShareUrl(malformed, "simultaneously-recorded-neurons"), `${path}/simultaneous-neural-recordings`);
    assert.equal(chartImageFilename("simultaneously-recorded-neurons", malformed), "neuro-atlas-simultaneous-neural-recordings.png");
  }
});


test("the route layout retains native legacy exploration hashes without standalone redirects", async () => {
  const { mount, settle } = await import("./modal-helpers.mjs");
  const mod = await import("../src/app/field-velocity/layout.tsx");
  const Layout = mod.default?.default ?? mod.default;
  const replacements = [];
  let length;
  const child = React.createElement("div", {"data-overview-stub": true});
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(AppRouterContext.Provider,
    { value: { replace(href) { replacements.push(href); } } }, React.createElement(Layout, null, child))), "#draft-panel-bci-bitrate", win => {
      win.history.replaceState({keep: "router"}, "", "/field-velocity?review=1&review=2#draft-panel-bci-bitrate");
      length = win.history.length;
    });
  try {
    await settle();
    assert.deepEqual(replacements, [], "overview fragments stay exploration locations");
    assert.equal(window.history.length, length);
    assert.equal(window.history.state.keep, "router");
    assert.equal(document.querySelector("dialog"), null);
    await React.act(async () => { window.location.hash = "google-trends-neuralink"; });
    await settle();
    assert.equal(replacements.length, 0, "retired brand context stays on the overview");
  } finally { await cleanup(); }
});
