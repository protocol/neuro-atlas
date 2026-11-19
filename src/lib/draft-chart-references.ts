import type { DraftObservation } from "./draft-chart-types";

export type ConfirmedReference = { role?: string; title: string; url?: string };

/** Principal measurement citation first; candidates and calculation methods stay separate. */
export function observationReferences(point: DraftObservation): ConfirmedReference[] {
  const references = [{ role: point.sourceRole, title: point.sourceTitle, url: point.sourceUrl }, ...point.supportingReferences ?? []];
  return references.filter((reference, index) => !reference.url || references.findIndex(other => other.url === reference.url) === index);
}

export function observationSourceDescription(point: DraftObservation): string {
  return observationReferences(point).map(reference => `${reference.role ? `${reference.role}: ` : ""}${reference.title}`).join("; ");
}
