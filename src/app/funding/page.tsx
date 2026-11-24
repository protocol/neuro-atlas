import { atlasMetadata } from "@/lib/atlas-metadata";
import fundingData from "@/data/funding-index.json";
import { FundingIndexDashboard } from "@/components/funding-index-dashboard";
import { FundingSourceContext } from "@/components/funding-source-context";
import { PlateHero } from "@/components/plate-header";
import { formatCapital, type FundingIndexData } from "@/lib/funding-index";

export const metadata = atlasMetadata(
  "/funding",
  "BCI Funding Index · Neuro Atlas",
  "A screened view of BCI financing rounds, investors, and regulatory milestones.",
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
        kicker="Capital intelligence"
        meta={["V1 · 2026"]}
        title="BCI Funding Index"
        description="A screened view of who has financed 25 implanted and implant-adjacent BCI companies — with round history, investor participation, and regulatory inflection points on one plate."
        status="partial"
        stats={[
          { value: String(data.summary.selectedCompanies), label: "selected companies" },
          { value: formatCapital(data.summary.observedCapitalUsdM), label: "indexed financing · incl. commitments" },
          { value: String(data.summary.indexedRounds), label: "sourced financings" },
          { value: String(data.summary.regulatoryMilestones), label: "regulatory markers" },
        ]}
      />
      <FundingSourceContext source={source} />
      <FundingIndexDashboard data={data} />
    </>
  );
}
