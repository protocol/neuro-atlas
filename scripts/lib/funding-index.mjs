import { readFile } from "node:fs/promises";
import path from "node:path";
import { historicalFxFor } from "./historical-fx.mjs";

export const MINIMUM_ROUND_USD_M = 2;
const SOURCE_KINDS = new Set(["primary", "reporting"]);
// Exact reviewed alias only; do not case-fold unrelated investor identities.
// Official brand: https://themdadvantage.com/ (NeuroTechnology Investors / NTI).
const INVESTOR_ALIASES = new Map([["Neurotechnology Investors", "NeuroTechnology Investors"]]);

function isHttpsUrl(value) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function isReviewDate(value) {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") && Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function sourceDateBasis(value) {
  if (!value) return "unverified";
  if (!["event", "announcement", "reported", "unverified"].includes(value)) {
    throw new Error(`Invalid source date basis: ${value}`);
  }
  return value;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ""; }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
    else if (char !== '\r') field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1).filter((values) => values.some(Boolean)).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, (values[index] ?? "").trim()])),
  );
}

export async function loadFundingIndexSources(directory) {
  const load = async (name) => parseCsv(await readFile(path.join(directory, name), "utf8"));
  const [companies, rounds, milestones, foundings, fxConversions, portfolioDisclosures, investorGroups] = await Promise.all([
    load("companies.csv"),
    load("rounds.csv"),
    load("milestones.csv"),
    load("foundings.csv"),
    readFile(path.join(directory, "fx-conversions.json"), "utf8").then(JSON.parse),
    readFile(path.join(directory, "portfolio-disclosures.json"), "utf8").then(JSON.parse),
    readFile(path.join(directory, "investor-groups.json"), "utf8").then(JSON.parse),
  ]);
  return { companies, rounds, milestones, foundings, fxConversions, portfolioDisclosures, investorGroups };
}

export function buildFundingIndex({ companies, rounds, milestones, foundings, fxConversions = [], portfolioDisclosures = [], investorGroups = [] }) {
  const investorGroupNames = new Map();
  const displayNames = new Set();
  if (!Array.isArray(investorGroups)) throw new Error("Invalid investor grouping");
  for (const group of investorGroups) {
    if (typeof group.name !== "string" || !group.name.trim() || group.name !== group.name.trim() ||
        displayNames.has(group.name) || !isReviewDate(group.reviewedOn) || !group.note?.trim() ||
        !Array.isArray(group.sourceUrls) || !group.sourceUrls.length || !group.sourceUrls.every(isHttpsUrl) ||
        !Array.isArray(group.memberNames) || !group.memberNames.length ||
        group.memberNames.some((name) => typeof name !== "string" || !name.trim() || name !== name.trim())) {
      throw new Error("Invalid investor grouping");
    }
    displayNames.add(group.name);
    for (const name of group.memberNames) {
      if (investorGroupNames.has(name)) throw new Error("Invalid investor grouping: overlapping member");
      investorGroupNames.set(name, group.name);
    }
  }
  for (const [name, displayName] of investorGroupNames) {
    if (displayNames.has(name) && name !== displayName) throw new Error("Invalid investor grouping: nested display name");
  }
  const roster = new Set(companies.map((company) => company.slug));
  if (roster.size !== companies.length) throw new Error("Duplicate company slug");
  // Portfolio relationships are a separate evidence class, never synthetic rounds.
  for (const disclosure of portfolioDisclosures) {
    if (!disclosure.investorName?.trim() || !disclosure.sourceInvestorName?.trim() ||
        !isHttpsUrl(disclosure.sourceUrl) || !isReviewDate(disclosure.reviewedOn) ||
        !disclosure.sourceExcerpt?.trim() || !disclosure.note?.trim() || !disclosure.companies?.length) {
      throw new Error("Invalid portfolio provenance");
    }
    const family = disclosure.familyGrouping;
    if (family && (!isReviewDate(family.reviewedOn) || !family.note?.trim() ||
        !Array.isArray(family.memberNames) || !family.memberNames.includes(disclosure.sourceInvestorName) ||
        family.memberNames.some((name) => !name?.trim()) || new Set(family.memberNames).size !== family.memberNames.length ||
        !family.sourceUrls?.length || !family.sourceUrls.every(isHttpsUrl))) {
      throw new Error("Invalid portfolio family grouping");
    }
    const seenCompanies = new Set();
    const seenWebsites = new Set();
    const seenSlugs = new Set();
    for (const company of disclosure.companies) {
      if (!company.name?.trim() || !isHttpsUrl(company.website) ||
          (company.matchSourceUrls && !company.matchSourceUrls.every(isHttpsUrl))) {
        throw new Error("Invalid portfolio company");
      }
      if (company.companySlug && !roster.has(company.companySlug)) throw new Error(`Unknown portfolio company: ${company.companySlug}`);
      if (seenCompanies.has(company.name) || seenWebsites.has(company.website) ||
          (company.companySlug && seenSlugs.has(company.companySlug))) throw new Error(`Duplicate portfolio company: ${company.name}`);
      seenCompanies.add(company.name);
      seenWebsites.add(company.website);
      if (company.companySlug) seenSlugs.add(company.companySlug);
      const financingFields = ["announcedOn", "announced_on", "date", "stage", "amountUsdM", "amount_usd_m", "roundCount", "associatedCapitalUsdM"];
      if (financingFields.some((field) => field in company)) throw new Error("Portfolio relationship cannot contain financing fields");
    }
  }
  const foundingBySlug = new Map();
  for (const row of foundings ?? []) {
    const slug = row.company_slug;
    if (!roster.has(slug)) throw new Error(`Unknown founding company: ${slug}`);
    if (foundingBySlug.has(slug)) throw new Error(`Duplicate founding company: ${slug}`);
    const reviewedOn = row.reviewed_on?.trim() ?? "";
    const timestamp = Date.parse(`${reviewedOn}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== reviewedOn) {
      throw new Error(`Invalid founding review date: ${slug}`);
    }
    const rawYear = row.founding_year?.trim() ?? "";
    const year = rawYear ? Number(rawYear) : null;
    if (year !== null && (!/^\d{4}$/.test(rawYear) || year < 1800 || year > Number(reviewedOn.slice(0, 4)))) {
      throw new Error(`Invalid founding year: ${slug}`);
    }
    const sourceUrl = row.source_url?.trim() ?? "";
    let validSource = false;
    try { validSource = new URL(sourceUrl).protocol === "https:"; } catch { /* No usable source. */ }
    const sourceKind = row.source_kind?.trim() ?? "";
    const note = row.note?.trim() ?? "";
    if (!note || (year !== null && (!validSource || !SOURCE_KINDS.has(sourceKind))) ||
        (sourceUrl && !validSource) || (sourceKind && !SOURCE_KINDS.has(sourceKind))) {
      throw new Error(`Invalid founding provenance: ${slug}`);
    }
    foundingBySlug.set(slug, { year, sourceUrl, sourceKind, reviewedOn, note });
  }
  if (foundings && foundingBySlug.size !== roster.size) throw new Error("Missing founding roster entries");
  const normalizedCompanies = companies.map((company) => ({
    slug: company.slug,
    name: company.name,
    hq: company.hq,
    modality: company.modality,
    interfaceDepth: company.interface_depth,
    indication: company.indication,
    website: company.website,
    scope: company.scope,
    founding: foundingBySlug.get(company.slug) ?? null,
  }));
  const companySlugs = new Set(normalizedCompanies.map((company) => company.slug));
  const seenEvents = new Set();
  const parsedRounds = rounds.map((round) => {
    if (!companySlugs.has(round.company_slug)) throw new Error(`Unknown company slug: ${round.company_slug}`);
    const eventKey = `${round.company_slug}\0${round.announced_on}\0${round.stage}`;
    if (seenEvents.has(eventKey)) throw new Error(`Duplicate funding event: ${round.company_slug}, ${round.announced_on}, ${round.stage}`);
    seenEvents.add(eventKey);
    const sourceKind = round.source_kind?.trim();
    if (sourceKind && !SOURCE_KINDS.has(sourceKind)) throw new Error(`Invalid source_kind: ${sourceKind}`);
    const rawAmount = round.amount_usd_m?.trim() ?? "";
    const converted = historicalFxFor(round.source_url, round.announced_on, fxConversions);
    if (converted && (rawAmount || converted.fx.companySlug !== round.company_slug ||
        converted.fx.currency !== round.currency || converted.fx.amountNativeM !== Number(round.amount_native_m))) {
      throw new Error(`Conflicting historical FX round: ${round.source_url}`);
    }
    const amountUsdM = converted?.amountUsdM ?? (rawAmount ? Number(rawAmount) : Number.NaN);
    if (rawAmount && (!Number.isFinite(amountUsdM) || amountUsdM < 0)) throw new Error(`Invalid disclosed amount: ${rawAmount}`);
    return {
      companySlug: round.company_slug,
      announcedOn: round.announced_on,
      datePrecision: round.date_precision,
      dateBasis: sourceDateBasis(round.date_basis),
      stage: round.stage,
      amountUsdM,
      ...(converted ? { fx: converted.fx } : {}),
      amountNativeM: round.amount_native_m ? Number(round.amount_native_m) : null,
      currency: round.currency,
      displayAmount: round.display_amount,
      investors: [...new Set(round.investors ? round.investors.split(";").map((name) => name.trim()).filter(Boolean).map((name) => INVESTOR_ALIASES.get(name) ?? name) : [])],
      sourceUrl: round.source_url,
      note: round.note,
      ...(sourceKind ? { sourceKind } : {}),
      ...(round.reviewed_on?.trim() ? { reviewedOn: round.reviewed_on.trim() } : {}),
    };
  });
  const includedRounds = parsedRounds.filter((round) =>
    Number.isFinite(round.amountUsdM) && round.amountUsdM >= MINIMUM_ROUND_USD_M,
  );
  const excludedBelowThreshold = parsedRounds.filter((round) =>
    Number.isFinite(round.amountUsdM) && round.amountUsdM < MINIMUM_ROUND_USD_M,
  ).length;

  const investorMap = new Map();
  for (const round of includedRounds) {
    // Display families affect only this ranking, never the source participants.
    // Multiple named members in the same financing contribute one appearance.
    const rankedNames = new Set(round.investors.map((name) => investorGroupNames.get(name) ?? name));
    for (const name of rankedNames) {
      const current = investorMap.get(name) ?? { name, roundCount: 0, companySlugs: new Set(), associatedCapitalUsdM: 0 };
      current.roundCount += 1;
      current.companySlugs.add(round.companySlug);
      current.associatedCapitalUsdM += round.amountUsdM;
      investorMap.set(name, current);
    }
  }
  const investors = [...investorMap.values()]
    .map((investor) => ({
      name: investor.name,
      roundCount: investor.roundCount,
      companyCount: investor.companySlugs.size,
      associatedCapitalUsdM: Number(investor.associatedCapitalUsdM.toFixed(2)),
    }))
    .sort((a, b) => b.roundCount - a.roundCount || b.companyCount - a.companyCount || a.name.localeCompare(b.name));

  const normalizedMilestones = milestones.map((milestone) => {
    if (!companySlugs.has(milestone.company_slug)) throw new Error(`Unknown company slug: ${milestone.company_slug}`);
    return {
      companySlug: milestone.company_slug,
      announcedOn: milestone.announced_on,
      datePrecision: milestone.date_precision,
      dateBasis: sourceDateBasis(milestone.date_basis),
      marker: milestone.marker,
      indication: milestone.indication,
      sourceUrl: milestone.source_url,
      note: milestone.note,
    };
  });

  return {
    companies: normalizedCompanies,
    rounds: includedRounds,
    milestones: normalizedMilestones,
    investors,
    portfolioDisclosures: structuredClone(portfolioDisclosures),
    summary: { excludedBelowThreshold },
  };
}

export function normalizeFundingStage(stage) {
  const normalized = stage.trim().toLowerCase().replace(/[()[\]–—-]/g, " ").replace(/\s+/g, " ").trim();
  const undisclosed = /^(?:(?:investment|financing)(?: (?:stage undisclosed|undisclosed(?: stage)?))?|stage undisclosed|undisclosed(?: stage)?|unspecified)$/;
  return !normalized || undisclosed.test(normalized) ? "Undisclosed" : stage;
}

export function buildCompanyRows(companies, rounds, filters) {
  const query = filters.query.trim().toLowerCase();
  const roundsByCompany = new Map();
  for (const round of rounds) {
    const current = roundsByCompany.get(round.companySlug) ?? [];
    current.push(round);
    roundsByCompany.set(round.companySlug, current);
  }

  return companies
    .filter((company) => filters.scope === "All" || company.scope === filters.scope)
    .filter((company) => filters.modality === "All" || company.modality === filters.modality)
    .filter((company) => {
      if (!query) return true;
      return [company.name, company.modality, company.indication, company.hq ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .map((company) => {
      const companyRounds = [...(roundsByCompany.get(company.slug) ?? [])].sort((a, b) =>
        a.announcedOn.localeCompare(b.announcedOn),
      );
      return {
        ...company,
        observedCapitalUsdM: Number(companyRounds.reduce((total, round) => total + round.amountUsdM, 0).toFixed(2)),
        latestStage: normalizeFundingStage(companyRounds.at(-1)?.stage ?? "Undisclosed"),
        rounds: companyRounds,
      };
    })
    .sort((a, b) => b.observedCapitalUsdM - a.observedCapitalUsdM || a.name.localeCompare(b.name));
}

export function getTimelinePosition(announcedOn, firstYear, lastYear) {
  const start = Date.UTC(firstYear, 0, 1);
  const end = Date.UTC(lastYear, 11, 31);
  const point = Date.parse(`${announcedOn}T00:00:00Z`);
  if (!Number.isFinite(point) || end <= start) return 0;
  return Math.min(100, Math.max(0, ((point - start) / (end - start)) * 100));
}

export function formatFundingDate(date, precision) {
  if (precision === "year") return date.slice(0, 4);
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    ...(precision === "day" ? { day: "numeric" } : {}),
    timeZone: "UTC",
  }).format(parsed);
}

export function formatCapital(amountUsdM) {
  const value = amountUsdM >= 1000 ? amountUsdM / 1000 : amountUsdM;
  const suffix = amountUsdM >= 1000 ? "B" : "M";
  const maximumFractionDigits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value)}${suffix}`;
}
