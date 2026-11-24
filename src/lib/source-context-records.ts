import MILESTONES from "../data/milestones.json";
import FUNDING from "../data/funding-index.json";
import type { FundingCompany, FundingRound, FundingMilestone, FundingIndexData, FundingReportedTotal } from "./funding-index";
import { normalizeSourceContextUrl } from "./source-context-url";

export type SourceMilestone = (typeof MILESTONES)[number];
export type FundingSourceMatch = {
  company: FundingCompany;
  /** Only the company fields actually citing this source are selected. */
  website: boolean;
  founding: boolean;
  /** Includes a round if its own citation or a named-investor citation matches. */
  rounds: FundingRound[];
  milestones: FundingMilestone[];
  reportedTotals: FundingReportedTotal[];
};

// Match the existing Funding page’s canonical JSON projection.
const data = FUNDING as FundingIndexData;
const { companies, rounds, milestones, reportedTotals = [] } = data;
const sameSource = (candidate: unknown, key: string) => normalizeSourceContextUrl(candidate) === key;

/** Canonical records, never a company/domain heuristic or an invented timeline item. */
export function milestoneRecordsForSource(url: unknown): SourceMilestone[] {
  const key = normalizeSourceContextUrl(url);
  return key ? MILESTONES.filter(record => sameSource(record.sourceUrl, key)) : [];
}

export function fundingRecordsForSource(url: unknown): FundingSourceMatch[] {
  const key = normalizeSourceContextUrl(url);
  if (!key) return [];
  return companies.map(company => ({
    company,
    website: sameSource(company.website, key),
    founding: sameSource(company.founding?.sourceUrl, key),
    rounds: rounds.filter(round => round.companySlug === company.slug && (sameSource(round.sourceUrl, key) || round.investorEvidence?.some(evidence => sameSource(evidence.sourceUrl, key)))),
    milestones: milestones.filter(record => record.companySlug === company.slug && sameSource(record.sourceUrl, key)),
    reportedTotals: reportedTotals.filter(total => total.companySlug === company.slug && sameSource(total.sourceUrl, key)),
  })).filter(match => match.website || match.founding || match.rounds.length || match.milestones.length || match.reportedTotals.length);
}

/** Exact URLs already bound to rendered company facts or timeline events. */
export const RECORD_CONTEXT_SOURCE_URLS: readonly string[] = [...new Set([
  ...MILESTONES.map(record => record.sourceUrl),
  ...companies.flatMap(company => [company.website, company.founding?.sourceUrl]),
  ...rounds.flatMap(round => [round.sourceUrl, ...round.investorEvidence?.map(evidence => evidence.sourceUrl) ?? []]),
  ...milestones.map(record => record.sourceUrl),
  ...reportedTotals.map(total => total.sourceUrl),
].filter((url): url is string => !!normalizeSourceContextUrl(url)))].sort();

/** Receivers render a matched-record block at #source-context; they must be integrated together. */
export function recordSourceContextsForUrl(url: unknown): { href: string; label: string }[] {
  const key = normalizeSourceContextUrl(url);
  if (!key) return [];
  // Preserve an actual original binding in the URL; tracking/DOI aliases share one destination.
  const original = RECORD_CONTEXT_SOURCE_URLS.find(candidate => sameSource(candidate, key));
  if (!original) return [];
  const events = milestoneRecordsForSource(original);
  const funding = fundingRecordsForSource(original);
  const contexts = [];
  if (events.length) contexts.push({ href: `/milestones?source=${encodeURIComponent(original)}#source-context`, label: `Milestones · ${events.length} matching ${events.length === 1 ? "event" : "events"}` });
  if (funding.length) contexts.push({ href: `/funding?source=${encodeURIComponent(original)}#source-context`, label: `BCI Funding Index · ${funding.length} matching ${funding.length === 1 ? "company" : "companies"}` });
  return contexts;
}
