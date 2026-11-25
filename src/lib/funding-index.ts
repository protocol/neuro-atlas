import { countedCapital } from "./funding-capital.mjs";
export type FundingFounding = {
  year: number | null;
  sourceUrl: string;
  sourceKind: "primary" | "reporting" | "";
  reviewedOn: string;
  note: string;
};

export type FundingCompany = {
  slug: string;
  name: string;
  hq?: string;
  modality: string;
  interfaceDepth?: string;
  indication: string;
  website?: string;
  websiteLabel?: string;
  scope: string;
  logo?: string;
  founding?: FundingFounding | null;
};

export type FundingReportedTotal = {
  companySlug: string;
  amountUsdM: number;
  reportedOn: string;
  sourceUrl: string;
  sourceKind: "primary" | "reporting";
  scope: string;
  reviewedOn: string;
  note: string;
};

export type FundingHistoricalFx = {
  sourceUrl: string;
  companySlug: string;
  currency: string;
  amountNativeM: number;
  investmentDate: string | null;
  announcedOn: string;
  dateBasis: "announcement_date" | "investment_date" | "event_date";
  rateDate: string;
  rateDateBasis?: "previous_available_business_day";
  nativePerUsd: number;
  rateSource: string;
  rateSourceUrl: string;
  reviewedOn: string;
};

export type FundingRound = {
  companySlug: string;
  announcedOn: string;
  datePrecision?: string;
  dateBasis?: string;
  stage: string;
  amountUsdM: number;
  capitalTreatment?: string;
  amountNativeM?: number | null;
  fx?: FundingHistoricalFx;
  currency?: string;
  displayAmount?: string;
  investors?: string[];
  investorEvidence?: {
    investorName: string;
    sourceUrl: string;
    sourceKind: "primary" | "reporting";
    reviewedOn: string;
    sourceExcerpt: string;
  }[];
  sourceUrl?: string;
  note?: string;
  sourceKind?: "primary" | "reporting";
  reviewedOn?: string;
};

export type FundingFilters = {
  query: string;
  scope: string;
  modality: string;
};

export type FundingCompanyRow = FundingCompany & {
  observedCapitalUsdM: number;
  latestStage: string;
  rounds: FundingRound[];
};

export function normalizeFundingStage(stage: string): string {
  const normalized = stage.trim().toLowerCase().replace(/[()[\]–—-]/g, " ").replace(/\s+/g, " ").trim();
  const undisclosed = /^(?:(?:investment|financing)(?: (?:stage undisclosed|undisclosed(?: stage)?))?|stage undisclosed|undisclosed(?: stage)?|unspecified)$/;
  return !normalized || undisclosed.test(normalized) ? "Undisclosed" : stage;
}

export function buildCompanyRows(
  companies: FundingCompany[],
  rounds: FundingRound[],
  filters: FundingFilters,
): FundingCompanyRow[] {
  const query = filters.query.trim().toLowerCase();
  const roundsByCompany = new Map<string, FundingRound[]>();
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
        observedCapitalUsdM: Number(companyRounds.reduce((total, round) => total + countedCapital(round), 0).toFixed(2)),
        latestStage: normalizeFundingStage(companyRounds.at(-1)?.stage ?? "Undisclosed"),
        rounds: companyRounds,
      };
    })
    .sort((a, b) => b.observedCapitalUsdM - a.observedCapitalUsdM || a.name.localeCompare(b.name));
}
export function getTimelinePosition(announcedOn: string, firstYear: number, lastYear: number): number {
  const start = Date.UTC(firstYear, 0, 1);
  const end = Date.UTC(lastYear, 11, 31);
  const point = Date.parse(`${announcedOn}T00:00:00Z`);
  if (!Number.isFinite(point) || end <= start) return 0;
  return Math.min(100, Math.max(0, ((point - start) / (end - start)) * 100));
}
export type FundingMilestone = {
  companySlug: string;
  announcedOn: string;
  datePrecision: string;
  dateBasis?: string;
  marker: "BDD" | "CE" | "IDE" | "NMPA" | "Pivotal" | "Pivotal (planned)" | "TAP";
  indication: string;
  sourceUrl: string;
  note: string;
};

export type FundingInvestor = {
  name: string;
  roundCount: number;
  companyCount: number;
  associatedCapitalUsdM: number;
};

export type FundingPortfolioDisclosure = {
  investorName: string;
  sourceInvestorName?: string;
  sourceUrl: string;
  reviewedOn: string;
  sourceExcerpt?: string;
  note?: string;
  familyGrouping?: {
    memberNames: string[];
    reviewedOn: string;
    sourceUrls: string[];
    note: string;
  };
  companies: {
    name: string;
    website: string;
    companySlug?: string;
    matchSourceUrls?: string[];
    matchNote?: string;
  }[];
};

export function summarizePortfolioEvidence(
  disclosure: FundingPortfolioDisclosure,
  companies: FundingCompany[],
  rounds: FundingRound[],
) {
  const screenedSlugs = new Set(companies.map((company) => company.slug));
  const matchedSlugs = new Set(disclosure.companies.flatMap((company) =>
    company.companySlug && screenedSlugs.has(company.companySlug) ? [company.companySlug] : [],
  ));
  // Only an explicitly reviewed display family can join distinct source investor names.
  const memberNames = disclosure.familyGrouping?.memberNames ?? [disclosure.sourceInvestorName ?? disclosure.investorName];
  const records = new Map<string, { round: FundingRound; investors: Set<string> }>();
  for (const round of rounds) {
    if (!round.investors?.some((name) => memberNames.includes(name))) continue;
    // The canonical financing identity is company + announced date + source stage.
    // A second source or two family members in one record must not double count it.
    const identity = JSON.stringify([round.companySlug, round.announcedOn, round.stage]);
    const record = records.get(identity) ?? { round, investors: new Set<string>() };
    for (const name of round.investors) record.investors.add(name);
    records.set(identity, record);
  }
  const indexed = [...records.values()];
  const capital = (items: typeof indexed) => Number(items.reduce((sum, item) => sum + countedCapital(item.round), 0).toFixed(2));
  return {
    matchedCompanyCount: matchedSlugs.size,
    indexedFinancingCount: indexed.length,
    indexedCompanyCount: new Set(indexed.map(({ round }) => round.companySlug)).size,
    associatedCapitalUsdM: capital(indexed),
    members: memberNames.map((name) => {
      const memberRecords = indexed.filter((record) => record.investors.has(name));
      return {
        name,
        roundCount: memberRecords.length,
        companyCount: new Set(memberRecords.map(({ round }) => round.companySlug)).size,
        associatedCapitalUsdM: capital(memberRecords),
      };
    }),
  };
}

export type FundingIndexData = {
  companies: FundingCompany[];
  reportedTotals?: FundingReportedTotal[];
  portfolioDisclosures?: FundingPortfolioDisclosure[];
  rounds: FundingRound[];
  milestones: FundingMilestone[];
  investors: FundingInvestor[];
  summary: {
    selectedCompanies: number;
    indexedRounds: number;
    regulatoryMilestones: number;
    observedCapitalUsdM: number;
    firstYear: number;
    lastYear: number;
    asOf: string;
    excludedBelowThreshold: number;
  };
  methodology: {
    thresholdUsdM: number;
    scope: string;
    coverage: string;
  };
};
export function formatFundingDate(date: string, precision?: string): string {
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

export function formatFundingFxBasis(fx: {
  dateBasis: string;
  announcedOn: string;
  investmentDate: string | null;
  rateDate: string;
  rateDateBasis?: string;
}): string {
  const label = fx.dateBasis === "event_date" ? "Exchange rate for event date"
    : fx.dateBasis === "investment_date" ? "Exchange rate for investment date"
    : fx.dateBasis === "announcement_date" ? "Exchange rate for announcement date" : "Historical exchange rate";
  const basisDate = fx.dateBasis === "investment_date" ? fx.investmentDate : fx.announcedOn;
  const observation = fx.rateDateBasis === "previous_available_business_day"
    ? ` · previous published rate ${formatFundingDate(fx.rateDate, "day")}` : "";
  return `${label}${basisDate ? ` · ${formatFundingDate(basisDate, "day")}` : ""}${observation}`;
}

export function formatFundingRecordDate(date: string, precision?: string, basis?: string): string {
  const label = basis === "event" ? "Event date" : basis === "announcement" ? "Announced" : basis === "reported" ? "Reported" : "Date unverified";
  return `${label} ${formatFundingDate(date, precision)}`;
}

export function formatCapital(amountUsdM: number): string {
  const value = amountUsdM >= 1000 ? amountUsdM / 1000 : amountUsdM;
  const suffix = amountUsdM >= 1000 ? "B" : "M";
  const maximumFractionDigits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value)}${suffix}`;
}
