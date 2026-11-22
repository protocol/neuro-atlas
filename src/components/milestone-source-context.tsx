import { milestoneRecordsForSource } from "@/lib/source-context-records";
import { formatFundingDate } from "@/lib/funding-index";

/** A quoted reference to existing records, not a timeline selection or inferred match. */
export function MilestoneSourceContext({ source }: { source: unknown }) {
  const matches = milestoneRecordsForSource(source);
  if (!matches.length) return null;

  return (
    <section
      id="source-context"
      aria-labelledby="source-context-heading"
      className="mt-8 scroll-mt-6 rounded-xl border border-border p-5"
    >
      <h2 id="source-context-heading" className="text-base font-semibold">Milestone source context</h2>
      <p className="mt-1 text-sm text-muted">Milestone references citing this source. The full timeline remains below.</p>
      <ul className="mt-4 space-y-4">
        {matches.map((row, index) => (
          <li key={`${row.company}-${row.date}-${row.activity}-${index}`} className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
            <h3 className="text-sm font-semibold">{row.company} · {row.activity}</h3>
            <p className="text-xs text-muted">
              {row.dateBasis === "event" ? "Event date" : row.dateBasis === "announcement" ? "Announced" : row.dateBasis === "reported" ? "Reported" : "Date unverified"}{" "}
              <time dateTime={row.datePrecision === "month" ? row.date.slice(0, 7) : row.datePrecision === "year" ? row.date.slice(0, 4) : row.date}>
                {formatFundingDate(row.date, row.datePrecision)}
              </time>
            </p>
            <p className="text-sm leading-relaxed">{row.note}</p>
            <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-sm underline underline-offset-4">
              Original source<span className="sr-only"> for {row.company} · {row.activity} (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
