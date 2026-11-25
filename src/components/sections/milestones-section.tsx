import { SectionIntro } from "@/components/sections/section-intro";
import { MilestoneTimeline } from "@/components/milestone-timeline";

export function MilestonesSection() {
  return (
    <>
      <SectionIntro title="Milestone timeline">
        Financing, acquisitions, partnerships, first-in-human trials, and regulatory milestones across
        neural interfaces and neurotechnology. Choose BCI only or all neurotech.
        Click a year to explore it.
      </SectionIntro>
      <MilestoneTimeline />
      <p className="mt-4 text-xs leading-relaxed text-faint">
        Dates identify events, announcements, or reports, with month-only dates shown at
        month precision. “Date unverified” marks an older entry whose date remains
        unverified in the linked source. Clinical / regulatory includes designations,
        advisory programs, planned studies, and trials underway. Capital totals sum
        disclosed financing, including labeled commitments; acquisitions show transaction
        values separately. Some sources remain inaccessible, and the source and date
        of some older exchange-rate estimates remain unverified.
      </p>
    </>
  );
}
