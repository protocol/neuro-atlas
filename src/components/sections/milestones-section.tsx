import { SectionIntro } from "@/components/sections/section-intro";
import { MilestoneTimeline } from "@/components/milestone-timeline";

export function MilestonesSection() {
  return (
    <>
      <SectionIntro title="Milestone timeline">
        Tracked deals, partnerships, first-in-human trials, and regulatory milestones across
        neural interfaces and neurotechnology. Filter by BCI only or view the broader
        neurotech ecosystem. Click a year to put it into focus.
      </SectionIntro>
      <MilestoneTimeline />
      <p className="mt-4 text-xs leading-relaxed text-faint">
        2026 events: Q1+ 2026 BCI Market Map by Neurotech Futures &amp; PL Neuro
        (bit.ly/Q126BCImemo), enriched with primary-source announcement dates, plus
        later 2026 events added only when a company release names the date.
        2024–2025 pathway events: screened from the Neurotech Futures regulatory
        digests, mapped onto the same clinical / commercial lanes.
      </p>
    </>
  );
}
