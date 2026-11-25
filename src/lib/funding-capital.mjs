export const CAPITAL_EXCLUSION_LABEL = "Excluded from indexed total — conversion overlap unresolved";

// A displayed source amount is not necessarily additive capital. Shared by the
// canonical generator and client aggregates; unknown treatments fail closed.
export function countedCapital(record) {
  const held = record.capitalTreatment !== undefined && record.capitalTreatment !== "";
  if (held && (!["overlap-unresolved", "superseded", "scope-unresolved"].includes(record.capitalTreatment) ||
      typeof record.note !== "string" || !record.note.trim())) {
    throw new Error(`Invalid capital treatment: ${record.capitalTreatment}`);
  }
  if (record.amountUsdM !== null && (typeof record.amountUsdM !== "number" ||
      !Number.isFinite(record.amountUsdM) || record.amountUsdM < 0)) {
    throw new Error(`Invalid capital amount: ${record.amountUsdM}`);
  }
  return held ? 0 : (record.amountUsdM ?? 0);
}

export function capitalExclusionLabel(record, total = "indexed total") {
  countedCapital(record); // Labels and aggregates accept the same validated treatments.
  const reason = record.capitalTreatment === "overlap-unresolved" ? "conversion overlap unresolved"
    : record.capitalTreatment === "superseded" ? "superseded disclosure"
    : record.capitalTreatment === "scope-unresolved" ? "financing scope unresolved" : null;
  return reason ? `Excluded from ${total} — ${reason}` : null;
}
