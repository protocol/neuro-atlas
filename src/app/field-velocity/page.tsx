import { atlasMetadata } from "@/lib/atlas-metadata";
import { PlateHero } from "@/components/plate-header";
import { VelocityTabs } from "@/components/sections/velocity-tabs";
import { METRIC_GROUPS, METRIC_CHART_EVIDENCE } from "@/data/metric-chart-visibility";
import SNAPSHOT from "@/data/field-velocity/neurotech.snapshot.json";
import PROVENANCE from "@/data/field-velocity/neurotech.snapshot.json.provenance.json";
import { parseFeed } from "@/lib/field-velocity/schema";
import { selectPerformance, selectPace } from "@/lib/field-velocity/performance";
import { PerformanceCurves } from "@/components/performance-curves";
import { PaceReadings } from "@/components/pace-readings";
import { GoogleTrends } from "@/components/google-trends";

export const metadata = atlasMetadata("/field-velocity", "Field velocity — Neuro Atlas");

const feed = parseFeed(SNAPSHOT);
const evidence = Object.values(METRIC_CHART_EVIDENCE);

export default function FieldVelocityPage() {
  return (
    <>
      <PlateHero
        kicker="Pace"
        meta={["PL R&D metrics"]}
        title="Field velocity"
        description={`Explore neurotech measurements across ${METRIC_GROUPS.length} groups, alongside expectations.`}
        stats={[
          { value: String(METRIC_GROUPS.length), label: "metric groups" },
          { value: String(evidence.reduce((sum, item) => sum + item.plots.length, 0)), label: "curated numeric panels" },
          { value: String(evidence.reduce((sum, item) => sum + item.plots.reduce((total, plot) => total + plot.points.length, 0), 0)), label: "observations" },
          { value: String(evidence.filter(item => item.timeline).length), label: "event timeline" },
        ]}
      />
      <div className="mt-8">
        <VelocityTabs engagementPreview={<GoogleTrends selection={["neurotech"]} />} references={{
          recording: <PerformanceCurves data={selectPerformance(feed)} provenance={PROVENANCE} selection={["simultaneously-recorded-neurons"]} />,
        }} performance={<><PaceReadings data={selectPace(feed)} /><GoogleTrends selection={["neuralink"]} /></>} />
      </div>
    </>
  );
}
