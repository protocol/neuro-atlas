import SNAPSHOT from '../../data/field-velocity/neurotech.snapshot.json';
import type { InstrumentRecord } from './schema';
export const ARCHIVED_CITATION_REVISION = 'f8c94214e392a121f1dbb80e0c6bf9776fc2bdc3';
export const archivedCitationRecord = SNAPSHOT.records.find(r => r.instrument === 'idea_vintage') as InstrumentRecord;
export const ARCHIVED_CITATION_GENERATED = archivedCitationRecord.provenance!.generated!;
export const archivedCitation = {revision: ARCHIVED_CITATION_REVISION, bundle: null};
