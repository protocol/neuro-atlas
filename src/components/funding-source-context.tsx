import { capitalExclusionLabel } from "@/lib/funding-capital.mjs";
import { fundingRecordsForSource } from "@/lib/source-context-records";
import { normalizeSourceContextUrl } from "@/lib/source-context-url";
import { formatCapital, formatFundingDate, reportedTotalFootnote } from "@/lib/funding-index";

/** Only the facts and evidence actually bound to the requested canonical source. */
export function FundingSourceContext({ source }: { source: unknown }) {
  const matches = fundingRecordsForSource(source);
  if (!matches.length) return null;
  const key = normalizeSourceContextUrl(source);
  const isSource = (url: unknown) => normalizeSourceContextUrl(url) === key;

  return (
    <section id="source-context" aria-labelledby="source-context-heading" className="mt-8 scroll-mt-6 rounded-xl border border-border p-5">
      <h2 id="source-context-heading" className="text-base font-semibold">Funding source context</h2>
      <p className="mt-1 text-sm text-muted">Company records citing this source, grouped by the fact it supports. The full dashboard is below.</p>
      <ul className="mt-4 space-y-4">
        {matches.map(({ company, website, founding, rounds, milestones, reportedTotals }) => (
          <li key={company.slug} className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
            <h3 className="text-sm font-semibold">{company.name}</h3>
            <ul className="space-y-4 text-sm leading-relaxed">
              {website && company.website && (
                <li>
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Company website</a>
                </li>
              )}
              {founding && company.founding && (
                <li className="space-y-2">
                  <p className="font-medium">{company.founding.year === null ? "Founding year: unverified" : `Founded ${company.founding.year}`}</p>
                  <p>{company.founding.note}</p>
                  <a href={company.founding.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block underline underline-offset-4">Founding-year source</a>
                </li>
              )}
              {reportedTotals.map((total) => (
                <li key={`reported-total-${total.reportedOn}`} className="space-y-2">
                  <p className="font-medium">Company-reported total · {formatCapital(total.amountUsdM)}{reportedTotalFootnote(total) && <sup aria-label="See possible-overlap note">*</sup>}</p>
                  <p className="font-medium">{total.scope}</p>
                  {reportedTotalFootnote(total) && <p data-reported-total-footnote className="text-xs text-muted">* {reportedTotalFootnote(total)}</p>}
                  <p className="text-xs text-muted">Public company self-report · Reported <time dateTime={total.reportedOn}>{formatFundingDate(total.reportedOn, "day")}</time></p>
                  <p>{total.note}</p>
                  <a href={total.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block underline underline-offset-4">Original source (company-reported total)</a>
                </li>
              ))}
              {rounds.map((round, index) => (
                <li key={`round-${index}`} className="space-y-2">
                  {isSource(round.sourceUrl) && <>
                    <p className="font-medium">Financing record · {round.stage} · {round.displayAmount ?? formatCapital(round.amountUsdM)}</p>
                    <p className="text-xs text-muted">
                      {round.dateBasis === "event" ? "Event date" : round.dateBasis === "announcement" ? "Announced" : round.dateBasis === "reported" ? "Reported" : "Date unverified"}{" "}
                      <time dateTime={round.datePrecision === "month" ? round.announcedOn.slice(0, 7) : round.datePrecision === "year" ? round.announcedOn.slice(0, 4) : round.announcedOn}>
                        {formatFundingDate(round.announcedOn, round.datePrecision)}
                      </time>
                    </p>
                    {round.capitalTreatment && <p className="font-medium">{capitalExclusionLabel(round)}</p>}
                    {round.note && <p>{round.note}</p>}
                    <a href={round.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block underline underline-offset-4">Financing source</a>
                  </>}
                  {round.investorEvidence?.filter((evidence) => isSource(evidence.sourceUrl)).map((evidence, evidenceIndex) => (
                    <div key={evidenceIndex} className="space-y-2">
                      <p className="font-medium">Investor participation · {evidence.investorName}</p>
                      <blockquote>{evidence.sourceExcerpt}</blockquote>
                      <p className="text-xs text-muted">This source supports the named investor’s participation. The indexed financing amount has its own source.</p>
                      <a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block underline underline-offset-4">Investor participation source</a>
                    </div>
                  ))}
                </li>
              ))}
              {milestones.map((milestone, index) => (
                <li key={`milestone-${index}`} className="space-y-2">
                  <p className="font-medium">Regulatory milestone · {milestone.marker} · {milestone.indication}</p>
                  <p className="text-xs text-muted">
                    {milestone.dateBasis === "event" ? "Event date" : milestone.dateBasis === "announcement" ? "Announced" : milestone.dateBasis === "reported" ? "Reported" : "Date unverified"}{" "}
                    <time dateTime={milestone.datePrecision === "month" ? milestone.announcedOn.slice(0, 7) : milestone.datePrecision === "year" ? milestone.announcedOn.slice(0, 4) : milestone.announcedOn}>
                      {formatFundingDate(milestone.announcedOn, milestone.datePrecision)}
                    </time>
                  </p>
                  <p>{milestone.note}</p>
                  <a href={milestone.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block underline underline-offset-4">Regulatory milestone source</a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
