import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseCsv } from "../../scripts/lib/funding-index.mjs";

// Check runtime and canonical inputs independently of the public catalogue. Include
// historical evidence where it informs selection or methodology, not QA captures.
const scopes = [
  /^(?:src\/(?:data|app|components|lib)|data|public\/data)\//,
  /^scripts\/(?:capture-google-trends|generate-derived|openalex-citation-latency|research\/|lib\/|publications\/|vendor\/|sync-performance-curves|refresh-google-trends|weekly-)/,
  /^docs\/(?:bci-|citation-latency\/|connectomics-|data\/|draft-chart|expectations-related|funding-founding\/|google-trends\/|historical-chart|janelia-|performance-|public-data-size|publication|recording-|retired-metrics|source-audit-20261116\/|sources\/)/,
];
const ignored = /(?:^|\/)(?:qa|verification(?:-[^/]*)?|integration-20261106|feedback(?:-public)?)(?:\/|\.|$)|\/test_[^/]+$|(?:^|\/)(?:atlas-analytics[^/]*|feedback(?:-[^/]*)?|site-icons|launch-logo|chart-export-brand|chart-export)\.[^/]+$/;
const inputs = /\.(?:ts|tsx|csv|json|py|mjs|md)$/;
const sourceLinkAlternates = JSON.parse(readFileSync(new URL("../../src/data/source-link-alternates.json", import.meta.url), "utf8"));
const links = /https?:\/\/[^\s<>"`'\\|\]}]+/g;

function cleanLiteral(literal) {
  let url = literal.replace(/[.,;:]+$/, "");
  while (url.endsWith(")") && url.split(")").length > url.split("(").length) url = url.slice(0, -1);
  return url.replaceAll("&amp;", "&");
}

export function canonicalSource(literal) {
  const url = new URL(literal);
  if (url.hostname === "doi.org" || url.hostname === "dx.doi.org") {
    url.hostname = "doi.org";
    url.protocol = "https:";
    url.pathname = url.pathname.toLowerCase();
  }
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_.+|fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  }
  return url.href;
}

function exclusion(literal, url) {
  const { hostname: host, pathname: path } = url;
  if (literal.includes("${") || literal.includes("[0-9") || literal.includes("%7B") || literal.endsWith("?date=")) return "computed URL/template; see its public provider, literal request metadata or pinned reference";
  if (/^(localhost|127\.|\[::1\])/.test(host) || /(?:\.example(?:\.com|\.org)?|\.invalid|\.local)$/.test(host)) return "dev or example";
  if (/\/impact-preview-[a-z0-9]+/.test(path)) return "unpublished provider surface";
  // Public compilation URLs were read cookieless on 2026-11-19. Preserve exact
  // query multiplicity; other Google documents still require publication review.
  const publicCompilations = [
    "https://docs.google.com/spreadsheets/d/1PukHvhxTqC72tau9HDnq1LKIl3F6V_FGr_y3G-jjZ-k/edit#gid=0",
    "https://docs.google.com/spreadsheet/pub?hl=en_US&hl=en_US&key=0Ai7vcDJIlD6AdF9vQWlNRDh2S1dub09jMWRvTFRpemc&single=true&gid=0&output=csv",
  ];
  if (/^(docs|drive)\.google\.com$/.test(host) && !publicCompilations.includes(url.href)) return "document access/publication not established";
  if (host === "openalex.org" && /^\/[WAI]123$/.test(path)) return "example identifier";
  if (host === "www.google.com" && /^\/(s2\/favicons|search)/.test(path)) return path.startsWith("/search") ? "discovery search query, no citable result" : "favicon asset provenance";
  if (/^(icons\.duckduckgo\.com|favicon\.yandex\.net|www\.googleusercontent\.com)$/.test(host)) return "favicon asset provenance";
  if (host === "neuro-atlas-app.vercel.app") return "deployment navigation";
  if (host === "gamma-api.polymarket.com" || host === "api.elections.kalshi.com" || host === "www.metaculus.com" && path === "/api") return "configured forecast endpoint; current view links external questions without fetching prices";
  if (literal.includes(")?(")) return "regular-expression literal";
  if (host === "openapi.vercel.sh" || host === "www.w3.org" || host === "api.github.com" || host === "raw.githubusercontent.com" && path.startsWith("/protocol/neuro-atlas/")) return "hosting, namespace or feed transport";
  // Published, immutable measurement/method documents are first-party sources.
  // Repo roots, PRs and QA receipts remain navigation rather than evidence.
  if (host === "github.com" && /^\/protocol\/neuro-atlas(?:\.git|\/.*)?\/?$/.test(path) && !/^\/protocol\/neuro-atlas\/blob\/[a-f0-9]{40}\/docs\/(?!qa\/)/.test(path) && url.href !== "https://github.com/protocol/neuro-atlas/blob/b6f99efaa80251c4fbbe608a329776617ae383ac/src/lib/field-velocity/schema.ts") return "Neuro Atlas repository or contribution navigation";
  if (host === "www.protocol.ai" || host === "www.plneuro.xyz" && /^(\/privacy-policy\/?|\/neuro-atlas(?:\/.*)?)$/.test(path) || host === "x.com" && path === "/protocollabs_rd") return "organization, policy or site navigation";
  return null;
}

export function scanSources() {
  const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter((path) =>
    scopes.some((pattern) => pattern.test(path)) && inputs.test(path) && !ignored.test(path) && !/^src\/data\/methodology-sources\.json$|^docs\/(?:publication-growth-20261106|recording-evidence)\//.test(path)
  );
  const included = new Map();
  const excluded = new Map();
  for (const path of paths) {
    const content = readFileSync(path, "utf8");
    let relevant = content;
    if (path === "src/data/field-velocity/neurotech.snapshot.json") {
      // Schema validation retains the upstream toolkit, but no current Neuro Atlas
      // route renders it or uses its examples as measurement/method evidence.
      const { toolkit, ...usedSnapshot } = JSON.parse(content);
      relevant = JSON.stringify(usedSnapshot);
      for (const match of JSON.stringify(toolkit).matchAll(links)) {
        const literal = cleanLiteral(match[0]);
        const href = canonicalSource(literal);
        if (!excluded.has(href)) excluded.set(href, []);
        excluded.get(href).push({ path, literal, reason: "unused inherited toolkit example" });
      }
    }
    const fields = path.endsWith(".csv") && !content.startsWith("#") ? parseCsv(content).flatMap(Object.values).join("\n") : relevant;
    for (const match of fields.matchAll(links)) {
      const literal = cleanLiteral(match[0]);
      // The published citation method is pinned in the reader, not a transport ref.
      const revision = path === "src/lib/field-velocity/citation-latency-feed.ts"
        ? /const CITATION_SOURCE_REVISION = '([a-f0-9]{40})'/.exec(content)?.[1]
        : undefined;
      const alternate = sourceLinkAlternates[canonicalSource(literal)];
      if (alternate) {
        const original = canonicalSource(literal);
        if (!excluded.has(original)) excluded.set(original, []);
        excluded.get(original).push({ path, literal, reason: "superseded original citation retained for provenance; verified replacement used for the reader link" });
      }
      const destination = alternate ?? (revision ? literal.replace("${CITATION_SOURCE_REVISION", revision + "/scripts/velocity/field_velocity_openalex.py") : literal);
      let href, reason;
      try {
        href = canonicalSource(destination);
        reason = exclusion(destination, new URL(href));
      } catch {
        href = literal;
        reason = "malformed URL literal";
      }
      if (path === "docs/publications/matched-baselines-fixtures.json" && new URL(href).hostname === "openalex.org" && /^\/(?:source-types|types)\//.test(new URL(href).pathname)) reason = "OpenAlex response group identifier, not a source citation";
      if (path.startsWith("data/logos/")) reason = "logo asset provenance (not scientific or market evidence)";
      const map = reason ? excluded : included;
      if (!map.has(href)) map.set(href, []);
      map.get(href).push({ path, literal, ...(reason && { reason }) });
    }
  }
  return { paths, included, excluded };
}
