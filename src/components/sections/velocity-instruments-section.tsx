import INSTRUMENTS from "@/data/velocity/instruments.json";
import SNAPSHOT from "@/data/field-velocity/neurotech.snapshot.json";

const definition = INSTRUMENTS.instruments.find(item => item.id === "revealed_commitments")!;
// Use the already-curated shared cohort, not the older Atlas-only duplicate.
const commitment = SNAPSHOT.records.find(record => record.instrument === "revealed_commitments");

export function VelocityInstrumentsSection({ performance }: { performance: React.ReactNode }) {
  return <>
    {performance}
    {commitment?.state === "reading" && <section id="revealed_commitments" className="performance-curves" aria-labelledby="revealed_commitments-title">
      <header className="pc-section-header"><h2 id="revealed_commitments-title">{definition.label}</h2></header>
      <p className="pc-intro">{definition.subtitle}</p>
      <div className="pc-grid">
        <article className="pc-card card p-5">
          <p className="text-[13px] font-medium leading-snug">{commitment.metric}</p>
          <p className="tnum mt-0.5 text-xl font-semibold tracking-tight">{commitment.value}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">Historical study cohort, including intracortical, endovascular and ECoG systems—not an active installed base.</p>
          <details className="draft-chart-methodology">
            <summary>Definition and source</summary>
            <p className="mt-2 text-xs leading-relaxed text-muted">{commitment.trend}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {commitment.sources?.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-[11px] text-accent hover:underline">{source.label} ↗</a>)}
            </div>
          </details>
        </article>
      </div>
    </section>}
  </>;
}
