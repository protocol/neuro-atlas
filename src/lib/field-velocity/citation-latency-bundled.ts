import SNAPSHOT from '../../data/field-velocity/citation-latency.bundled-20261106.json';
import { citationBundleSchema, parseCitationCsv, validateCitationBundle } from './citation-latency-feed';

// Git blob ID of the admitted anonymous bundle, not a published upstream commit.
export const BUNDLED_CITATION_REVISION = '2efd3a7cec78af7b29a75e6c2611348a426e4df9';
export const bundledCitation = { revision: BUNDLED_CITATION_REVISION, bundle: citationBundleSchema.parse(SNAPSHOT) };
// Synchronous initial render uses the same CSV/schema parser. Integrity and interval
// validation are exercised at the server boundary and on every client adoption.
export const bundledCitationData = { bundle: bundledCitation.bundle, ...parseCitationCsv(bundledCitation.bundle.csv) };
export async function verifiedBundledCitation() {
  await validateCitationBundle(bundledCitation.bundle);
  return bundledCitation;
}
