import { atlasMetadata } from "@/lib/atlas-metadata";
import fundingData from "@/data/funding-index.json";
import { FundingIndexDashboard } from "@/components/funding-index-dashboard";
import { PlateHero } from "@/components/plate-header";
import { formatCapital, type FundingIndexData } from "@/lib/funding-index";

export const metadata = atlasMetadata(
  "/funding",
  "BCI Funding Index · Neuro Atlas",
  "A screened view of BCI financing rounds, investors, and regulatory milestones.",
);

export default function FundingPage() {
  const data = fundingData as FundingIndexData;
  return (
    <>
      <PlateHero
        kicker="Capital intelligence"
        meta={["V1 · 2026"]}
        title="BCI Funding Index"
        description="A screened view of who has financed 25 implanted and implant-adjacent BCI companies — with round history, investor participation, and regulatory inflection points on one plate."
        status="partial"
        stats={[
          { value: String(data.summary.selectedCompanies), label: "selected companies" },
          { value: formatCapital(data.summary.observedCapitalUsdM), label: "raised in indexed rounds" },
          { value: String(data.summary.indexedRounds), label: "sourced financings" },
          { value: String(data.summary.regulatoryMilestones), label: "regulatory markers" },
        ]}
      />
      <FundingIndexDashboard data={data} />
    </>
  );
}
