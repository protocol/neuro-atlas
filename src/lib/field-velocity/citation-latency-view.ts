import { z } from 'zod';
import { validateCitationBundle, type ValidatedCitation } from './citation-latency-feed';
import { ARCHIVED_CITATION_REVISION, ARCHIVED_CITATION_GENERATED } from './citation-latency-default';
import { bundledCitation, bundledCitationData } from './citation-latency-bundled';
const envelope = z.object({revision:z.string().regex(/^[a-f0-9]{40}$/),bundle:z.unknown()}).strict();
export type CitationView = {revision:string; data:ValidatedCitation|null};
export const bundledCitationView: CitationView = {revision:bundledCitation.revision,data:bundledCitationData};
export const archivedCitationView: CitationView = {revision:ARCHIVED_CITATION_REVISION,data:null};
/** Reconstruct the record from exact admitted bytes, never API-supplied headline values. */
export async function parseCitationView(input:unknown):Promise<CitationView> {
  const view = envelope.parse(input);
  if (view.bundle === null) {
    if (view.revision !== ARCHIVED_CITATION_REVISION) throw new Error('Unknown archived citation release');
    return archivedCitationView;
  }
  const data = await validateCitationBundle(view.bundle);
  if (view.revision === ARCHIVED_CITATION_REVISION || Date.parse(data.generatedAt) < Date.parse(ARCHIVED_CITATION_GENERATED)) throw new Error('Stale or conflicting citation release');
  return {revision:view.revision,data};
}
