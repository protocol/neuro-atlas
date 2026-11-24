export const CAPITAL_EXCLUSION_LABEL = "Excluded from indexed total — conversion overlap unresolved";

// A displayed source amount is not necessarily additive capital. Shared by the
// canonical generator and client aggregates; unknown treatments fail closed.
export function countedCapital(round) {
  if (round.capitalTreatment === undefined || round.capitalTreatment === "") return round.amountUsdM;
  if (round.capitalTreatment !== "overlap-unresolved" || !round.note?.trim()) {
    throw new Error(`Invalid capital treatment: ${round.capitalTreatment}`);
  }
  return 0;
}
