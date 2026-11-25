import { atlasMetadata } from "@/lib/atlas-metadata";
import fundingData from "@/data/funding-index.json";
import { FundingIndexDashboard } from "@/components/funding-index-dashboard";
import { FundingSourceContext } from "@/components/funding-source-context";
import { PlateHero } from "@/components/plate-header";
import { formatCapital, type FundingIndexData } from "@/lib/funding-index";

export const metadata = atlasMetadata(
  "/funding",
  "BCI Funding Index · Neuro Atlas",
  "Financing rounds, investors, and regulatory milestones for selected BCI companies.",
);

export default async function FundingPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const source = (await searchParams)?.source;
  const data = fundingData as FundingIndexData;
  return (
    <>
      <PlateHero
        kicker="Funding"
        meta={["V1 · 2026"]}
        title="BCI Funding Index"
        description={`Financing rounds, investors, and regulatory milestones for ${data.summary.selectedCompanies} implanted and implant-adjacent BCI companies selected for the index.`}
        status="partial"
        stats={[
          { value: String(data.summary.selectedCompanies), label: "selected companies" },
          { value: formatCapital(data.summary.observedCapitalUsdM), label: "indexed financing · including commitments" },
          { value: String(data.summary.indexedRounds), label: "documented financings" },
          { value: String(data.summary.regulatoryMilestones), label: "regulatory milestones" },
        ]}
      />
      <FundingSourceContext source={source} />
      <FundingIndexDashboard data={data} />
    </>
  );
}
