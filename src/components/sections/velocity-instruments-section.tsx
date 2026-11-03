import { ParticipantCommitments } from "@/components/participant-commitments";

export function VelocityInstrumentsSection({ performance, flat = false }: { performance: React.ReactNode; flat?: boolean }) {
  const reading = <ParticipantCommitments />;
  if (flat) return <>{performance}{reading}</>;
  return <>
    {performance}
    <section className="performance-curves" aria-label="Implanted BCI study participants">
      <div className="pc-grid">{reading}</div>
    </section>
  </>;
}
