import { atlasMetadata } from "@/lib/atlas-metadata";
import { PlateHero } from "@/components/plate-header";
import { VelocityTabs } from "@/components/sections/velocity-tabs";

import SNAPSHOT from "@/data/field-velocity/neurotech.snapshot.json";
import PROVENANCE from "@/data/field-velocity/neurotech.snapshot.json.provenance.json";
import { parseFeed } from "@/lib/field-velocity/schema";
import { selectPerformance, selectPace } from "@/lib/field-velocity/performance";
import { PerformanceCurves } from "@/components/performance-curves";
import { PaceReadings } from "@/components/pace-readings";
import { GoogleTrends } from "@/components/google-trends";

export const metadata = atlasMetadata("/field-velocity", "Field velocity — Neuro Atlas");

const feed = parseFeed(SNAPSHOT);


export default function FieldVelocityPage() {
  return (
    <>
      <PlateHero
        kicker="Pace"
        meta={["PL R&D metrics"]}
        title="Field velocity"
        description="Explore neurotech measurements and expectations."
        stats={[]}
      />
      <div className="mt-8">
        <VelocityTabs engagementPreview={<GoogleTrends flat selection={["neurotech"]} />} references={{
          recording: <PerformanceCurves flat data={selectPerformance(feed)} provenance={PROVENANCE} selection={["simultaneously-recorded-neurons"]} />,
        }} performance={<><PaceReadings flat data={selectPace(feed)} /><GoogleTrends flat selection={["neuralink"]} /></>} />
      </div>
    </>
  );
}
