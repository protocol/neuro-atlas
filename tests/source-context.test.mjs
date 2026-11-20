import { bundledCitationData } from "../src/lib/field-velocity/citation-latency-bundled.ts";
import { projectCitationRecord } from "../src/lib/field-velocity/citation-latency-feed.ts";
import { normalizeSourceContextUrl } from "../src/lib/source-context-url.ts";
import { readFileSync } from "node:fs";
const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const snapshot = readJson("../src/data/field-velocity/neurotech.snapshot.json");
const participantAdditions = readJson("../src/data/field-velocity/bci-participants.additions.json");
const translation = readJson("../src/data/field-velocity/bci-translation-evidence.json");
import { HISTORICAL_RECORDING, HISTORICAL_RECORDING_SOURCE } from "../src/data/historical-recording.ts";
import { RECORDING_VIEWS } from "../src/data/recording-evidence.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { METRIC_CHARTS, METRIC_CHART_EVIDENCE, isVisibleMetric, RETIRED_METRIC_PLOT_IDS } from "../src/data/metric-chart-visibility.ts";
import { DRAFT_CHART_LINKS } from "../src/data/draft-chart-links.ts";
import { fieldVelocityLink } from "../src/data/field-velocity-links.ts";

const implementation = await import("../src/lib/source-context.ts").catch(error => {
  if (error.code === "ERR_MODULE_NOT_FOUND") return {};
  throw error;
});

test("a visible observation resolves to its current canonical chart anchor", () => {
  assert.equal(typeof implementation.sourceContextsForUrl, "function", "reverse citation API is implemented");
  const point = METRIC_CHART_EVIDENCE["Brain tissue mapped over time"].plots[0].points.find(point => point.id === "bock-mouse-imaged-2011-01-01");
  assert.equal(point.sourceUrl, "https://cellimagelibrary.org/images/40263");
  assert.deepEqual(implementation.sourceContextsForUrl(point.sourceUrl), [{
    href: "/field-velocity#selected-tissue-volume-checkpoints",
    label: "Selected tissue-volume checkpoints",
  }]);
});

test("every confirmed visible plot reference resolves to the actual rendered panel", () => {
  for (const chart of METRIC_CHARTS.filter(isVisibleMetric)) {
    const evidence = METRIC_CHART_EVIDENCE[chart.title];
    const links = DRAFT_CHART_LINKS.find(link => link.title === chart.title);
    for (const plot of evidence.plots) {
      assert.ok(!RETIRED_METRIC_PLOT_IDS.has(plot.id));
      const panel = links.panels.find(panel => panel.plotId === plot.id);
      const link = fieldVelocityLink(panel.id);
      const references = [plot.curationSource?.url,
        ...plot.points.flatMap(point => [point.sourceUrl, point.calculationSource?.url, ...point.supportingReferences?.map(reference => reference.url) ?? []]),
        plot.referenceTrendline?.methodologyUrl,
        ...plot.referenceTrendlines?.map(trend => trend.methodologyUrl) ?? [],
      ].filter(Boolean);
      for (const url of references) assert.ok(implementation.sourceContextsForUrl(url).some(context => context.href === `/field-velocity#${link.slug}`), `${url} → ${link.slug}`);
    }
    if (evidence.timeline) {
      const panel = links.panels.find(panel => panel.plotId === null);
      const link = fieldVelocityLink(panel.id);
      for (const event of evidence.timeline.events) assert.ok(implementation.sourceContextsForUrl(event.sourceUrl).some(context => context.href === `/field-velocity#${link.slug}`), `${event.id} → application timeline`);
    }
  }
});

test("exact source identity allows only tracking removal and DOI resolver normalization", () => {
  const bock = "https://cellimagelibrary.org/images/40263";
  const original = implementation.sourceContextsForUrl(bock);
  assert.ok(original.length);
  assert.deepEqual(implementation.sourceContextsForUrl(`${bock}?utm_source=atlas&FBCLID=tracking`), original);
  const doiPoint = Object.values(METRIC_CHART_EVIDENCE).flatMap(evidence => evidence.plots.flatMap(plot => plot.points)).find(point => point.sourceUrl?.startsWith("https://doi.org/"));
  const doiUrl = new URL(doiPoint.sourceUrl);
  const doiContexts = implementation.sourceContextsForUrl(doiPoint.sourceUrl);
  assert.ok(doiContexts.length);
  assert.deepEqual(implementation.sourceContextsForUrl(`http://dx.doi.org${doiUrl.pathname.toUpperCase()}?utm_campaign=test`), doiContexts);
  for (const different of ["https://cellimagelibrary.org", `${bock}/`, `${bock}?record=another`, `${bock}#different`, bock.replace("https:", "http:")]) {
    assert.deepEqual(implementation.sourceContextsForUrl(different), [], different);
  }
});

test("recording references select the exact historical or alternate measurement view", () => {
  const views = [HISTORICAL_RECORDING, ...RECORDING_VIEWS];
  for (const view of views) {
    for (const point of view.points) {
      assert.ok(implementation.sourceContextsForUrl(point.sourceUrl).some(context => context.href === `/field-velocity?recordingView=${view.id}#simultaneous-neural-recordings`), `${point.id} selects ${view.id}`);
    }
  }
  for (const url of [HISTORICAL_RECORDING_SOURCE.sourceUrl, HISTORICAL_RECORDING_SOURCE.producerUrl]) {
    assert.ok(implementation.sourceContextsForUrl(url).some(context => context.href === "/field-velocity?recordingView=historical#simultaneous-neural-recordings"));
  }
});

test("participant evidence resolves to the mounted participants chart, not retired series", () => {
  const inherited = snapshot.measurementSeries.find(series => series.id === "bci-implants");
  const urls = [...inherited.tracks, ...participantAdditions.tracks].flatMap(track => track.points.map(point => point.sourceUrl));
  urls.push(...participantAdditions.papers.map(paper => paper.url));
  for (const url of urls) assert.ok(implementation.sourceContextsForUrl(url).some(context => context.href === "/field-velocity#implanted-bci-participants-over-time"), url);
});

test("current latency cards resolve their reviewed endpoint pairs and projected citation sources", () => {
  const urls = [translation.corpusUrl, ...translation.previewSources.map(source => source.url),
    ...translation.intervals.flatMap(pair => [pair.report.url, pair.human.url]),
    ...translation.additionalPathways.flatMap(pathway => pathway.sources.map(source => source.url))];
  for (const url of urls) assert.ok(implementation.sourceContextsForUrl(url).some(context => context.href === "/field-velocity#latency-compression"), url);
  const citation = projectCitationRecord(bundledCitationData, snapshot.records.find(record => record.instrument === "idea_vintage"));
  for (const source of citation.sources) assert.ok(implementation.sourceContextsForUrl(source.url).some(context => context.href === "/field-velocity#citation-latency"), source.url);
});

test("publication and mounted Google Trends sources target real current cards", () => {
  const publications = readJson("../src/data/publications/publication-charts.snapshot.json");
  for (const url of [publications.source.url, "https://docs.openalex.org"]) {
    for (const anchor of ["neurotech-papers-per-year", "publication-growth-by-group", "researchers-by-publication-sector", "researchers-first-and-latest-affiliations"]) {
      assert.ok(implementation.sourceContextsForUrl(url).some(context => context.href === `/field-velocity#${anchor}`), `${url} → ${anchor}`);
    }
  }
  const trends = readJson("../public/data/google-trends/bundled-20261106/google-trends.json");
  const active = trends.groups.find(group => group.id === "neurotech");
  assert.ok(implementation.sourceContextsForUrl(active.sourceUrl).some(context => context.href === "/field-velocity#neurotech-search-terms"));
  for (const url of ["https://support.google.com/trends/answer/4365533?hl=en", "https://support.google.com/trends/answer/4359550?hl=en"]) {
    assert.ok(implementation.sourceContextsForUrl(url).some(context => context.href === "/field-velocity#neurotech-search-terms"));
  }
  assert.deepEqual(implementation.sourceContextsForUrl(trends.groups.find(group => group.id === "neuralink").sourceUrl), [], "unmounted brand context must not get a category fallback");
});

test("visible methodology citations use their actual sections and forecast sources select the real tab", () => {
  assert.deepEqual(implementation.sourceContextsForUrl("https://neurotechnology.substack.com/p/representations2"), [{ href: "/methodology#data-gathering", label: "How data is gathered · Milestones" }]);
  assert.deepEqual(implementation.sourceContextsForUrl("https://www.plrd.org/"), [{ href: "/methodology#field-velocity-methodology", label: "How data is gathered · Field Velocity" }]);
  const inflections = readJson("../src/data/velocity/neurotech_inflection_points.json");
  const markets = readJson("../src/data/velocity/neurotech_market_signals.json");
  for (const point of inflections.points) {
    const market = markets.mappings.find(mapping => mapping.title === point.title);
    if (market?.match !== "proxy") continue;
    for (const source of [market.primary, market.fallback].filter(Boolean)) {
      assert.ok(implementation.sourceContextsForUrl(source.url).some(context => context.href === "/field-velocity#inflection-points"), source.url);
    }
  }
  assert.deepEqual(implementation.sourceContextsForUrl("https://www.neurofounders.co/resources/start-up-map"), [], "ecosystem route redirects externally and has no local cited context");
});

const recordImplementation = await import("../src/lib/source-context-records.ts").catch(error => {
  if (error.code === "ERR_MODULE_NOT_FOUND") return {};
  throw error;
});

test("Milestones source-filter bindings return exact canonical events and matched-record URLs", () => {
  assert.equal(typeof recordImplementation.milestoneRecordsForSource, "function", "matched milestone records API exists");
  const milestones = readJson("../src/data/milestones.json");
  for (const milestone of milestones.filter(record => record.sourceUrl)) {
    const expected = milestones.filter(record => record.sourceUrl === milestone.sourceUrl);
    assert.deepEqual(recordImplementation.milestoneRecordsForSource(milestone.sourceUrl), expected);
    assert.ok(implementation.sourceContextsForUrl(milestone.sourceUrl).some(context => context.href.startsWith("/milestones?source=") && normalizeSourceContextUrl(new URL(context.href, "https://neuro-atlas.invalid").searchParams.get("source")) === normalizeSourceContextUrl(milestone.sourceUrl)));
  }
});

test("Funding source filters return only the exact cited company facts, rounds and milestones", () => {
  assert.equal(typeof recordImplementation.fundingRecordsForSource, "function", "matched funding records API exists");
  const funding = readJson("../src/data/funding-index.json");
  const round = funding.rounds[0];
  const matches = recordImplementation.fundingRecordsForSource(round.sourceUrl);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].company.slug, round.companySlug);
  assert.deepEqual(matches[0].rounds, funding.rounds.filter(item => item.companySlug === round.companySlug && item.sourceUrl === round.sourceUrl));
  assert.equal(matches[0].website, false);
  assert.equal(matches[0].founding, false);
  for (const company of funding.companies) {
    if (company.website) assert.ok(recordImplementation.fundingRecordsForSource(company.website).some(match => match.company.slug === company.slug && match.website));
    if (company.founding?.sourceUrl) assert.ok(recordImplementation.fundingRecordsForSource(company.founding.sourceUrl).some(match => match.company.slug === company.slug && match.founding));
  }
  for (const record of [...funding.rounds, ...funding.milestones]) {
    assert.ok(implementation.sourceContextsForUrl(record.sourceUrl).some(context => context.href.startsWith("/funding?source=") && normalizeSourceContextUrl(new URL(context.href, "https://neuro-atlas.invalid").searchParams.get("source")) === normalizeSourceContextUrl(record.sourceUrl)), record.sourceUrl);
  }
});

test("multiple real contexts are distinct, sorted by stable href and safe to reuse", () => {
  const url = "https://www.nature.com/articles/s41586-024-07558-y";
  const matches = implementation.sourceContextsForUrl(url);
  assert.ok(matches.length >= 4, "FlyWire supports several separate charts");
  assert.equal(new Set(matches.map(context => context.href)).size, matches.length, "repeated points and supporting references do not inflate +more");
  assert.deepEqual(matches.map(context => context.href), matches.map(context => context.href).sort());
  matches[0].label = "changed by consumer";
  matches.pop();
  assert.ok(!implementation.sourceContextsForUrl(url).some(context => context.label === "changed by consumer"));
});

test("unknown, research-only, retired and malformed inputs never receive invented context", () => {
  const catalog = readJson("../src/data/methodology-sources.json");
  const retired = "https://doi.org/10.1016/j.crmeth.2024.100720";
  assert.ok(Object.values(catalog).flat().some(([url]) => url === retired), "archival evidence really is in the source directory");
  for (const url of [retired, null, undefined, {}, 3, "", "not a URL", "/field-velocity", "javascript:alert(1)",
    "https:///cellimagelibrary.org/images/40263", "https:////cellimagelibrary.org/images/40263", "https://user:secret@cellimagelibrary.org/images/40263",
    "https://cellimagelibrary.org/images/40263 ", "https://cellimagelibrary.org/images/%ZZ", "https://cellimagelibrary.org\\images/40263"]) {
    assert.deepEqual(implementation.sourceContextsForUrl(url), [], String(url));
    assert.deepEqual(recordImplementation.milestoneRecordsForSource(url), [], String(url));
    assert.deepEqual(recordImplementation.fundingRecordsForSource(url), [], String(url));
  }
});

test("new runtime helper literals introduce no additional source-directory inventory", () => {
  const catalog = readJson("../src/data/methodology-sources.json");
  const existing = new Set(Object.values(catalog).flat().map(([url]) => normalizeSourceContextUrl(url)));
  for (const file of ["source-context.ts", "source-context-records.ts", "source-context-url.ts"]) {
    const text = readFileSync(new URL(`../src/lib/${file}`, import.meta.url), "utf8");
    for (const [url] of text.matchAll(/https?:\/\/[^\s<>"'`\\]+/g)) assert.ok(existing.has(normalizeSourceContextUrl(url)), `${file} introduces ${url}`);
  }
});
