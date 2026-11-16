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
        Dates distinguish underlying events from announcements and reports; month-only
        dates do not imply a particular day. “Date unverified” preserves a legacy position
        whose date was not established in the linked source. Clinical / regulatory includes
        designations, advisory programs, and planned studies—not only trials already begun.
        Financing values include explicitly labeled commitments, not cash receipts or
        acquisition values. Some source-access and legacy exchange-rate provenance gaps remain.
      </p>
    </>
  );
}
