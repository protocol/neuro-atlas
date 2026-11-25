export type CapitalDisclosure = { amountUsdM: number | null; capitalTreatment?: string; note?: string | null };
export const CAPITAL_EXCLUSION_LABEL: string;
export function countedCapital(record: CapitalDisclosure): number;
export function capitalExclusionLabel(record: CapitalDisclosure, total?: "indexed total" | "financing totals"): string | null;
