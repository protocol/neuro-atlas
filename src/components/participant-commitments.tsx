import SNAPSHOT from "@/data/field-velocity/neurotech.snapshot.json";
import ADDITIONS from "@/data/field-velocity/bci-participants.additions.json";
import { parseFeed } from "@/lib/field-velocity/schema";
import { MeasurementCard } from "@/components/performance-curves";
import { participantTrackCopy, participantPaperNotes } from "@/data/participant-reader-copy";

const inherited = SNAPSHOT.measurementSeries.find(series => series.id === "bci-implants")!;
const extra = new Map(ADDITIONS.tracks.map(track => [track.id, track]));
const tracks = [
  ...inherited.tracks.map(track => ({ ...track,
    points: [...track.points, ...(extra.get(track.id)?.points ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
  })),
  ...ADDITIONS.tracks.filter(track => !inherited.tracks.some(original => original.id === track.id)),
].map(participantTrackCopy);
// The same strict measurement validator checks the additive local curation; the provider export stays intact.
const participants = parseFeed({ ...SNAPSHOT, measurementSeries: SNAPSHOT.measurementSeries.map(series => series.id === inherited.id ? {
  ...series,
  title: "Implanted BCI participants over time",
  description: "Reported assistive implanted-BCI recipients, grouped by review, company or program.",
  coverage: `${tracks.reduce((count, track) => count + track.points.length, 0)} dated checkpoints · ${tracks.length} separately reported cohorts`,
  caveat: "Cohorts overlap and are shown separately. Dates identify observation, publication or disclosure. NEO values are documented lower bounds.",
  checkedAt: ADDITIONS.checkedAt,
  tracks,
} : series) }).measurementSeries.find(series => series.id === "bci-implants")!;

/** Retain the established commitments URL while showing the sourced chronological cohorts. */
export function ParticipantCommitments() {
  const bounds = participants.tracks.flatMap(track => {
    const qualified = track.points.filter(point => point.qualifier);
    return qualified.length ? [`${track.label.split(" · ")[0]} ${qualified.map(point => `${point.qualifier === "at-least" ? "≥" : point.qualifier === "greater-than" ? ">" : "≈"}${point.value.toLocaleString("en-US")} (${point.datePrecision === "year" ? point.date.slice(0, 4) : point.datePrecision === "month" ? point.date.slice(0, 7) : point.date})`).join(", ")}`] : [];
  }).join("; ");
  return <MeasurementCard series={participants} anchor="revealed_commitments" previewNote={bounds} provenance={
    <section className="pc-methodology" aria-label="Recent participant-count literature">
      <h4>Recent participant-count literature</h4>
      <p>Review counts use each paper’s eligibility criteria and remain separate from program cohorts.</p>
      <ul className="pc-sources">{ADDITIONS.papers.map(paper => <li key={paper.doi}>
        <a href={paper.url} data-paper-doi={paper.doi} target="_blank" rel="noreferrer">{paper.title} ↗</a>
        <p>{paper.publishedDate} · {participantPaperNotes[paper.doi] ?? paper.note} Source: {paper.coverage}.</p>
      </li>)}</ul>
      <p>Sources checked {ADDITIONS.checkedAt}.</p>
    </section>
  } />;
}
