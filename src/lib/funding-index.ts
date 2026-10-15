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
  scope: string;
  logo?: string;
  founding?: FundingFounding | null;
};

export type FundingRound = {
  companySlug: string;
  announcedOn: string;
  datePrecision?: string;
  stage: string;
  amountUsdM: number;
  amountNativeM?: number | null;
  currency?: string;
  displayAmount?: string;
  investors?: string[];
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
        observedCapitalUsdM: Number(companyRounds.reduce((total, round) => total + round.amountUsdM, 0).toFixed(2)),
        latestStage: companyRounds.at(-1)?.stage ?? "Undisclosed",
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
  marker: "BDD" | "CE" | "IDE" | "NMPA" | "Pivotal" | "TAP";
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

export type FundingIndexData = {
  companies: FundingCompany[];
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

export function formatCapital(amountUsdM: number): string {
  const value = amountUsdM >= 1000 ? amountUsdM / 1000 : amountUsdM;
  const suffix = amountUsdM >= 1000 ? "B" : "M";
  const maximumFractionDigits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value)}${suffix}`;
}
