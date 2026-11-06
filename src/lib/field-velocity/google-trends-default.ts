import SNAPSHOT from '../../../public/data/google-trends/bundled-20261106/google-trends.json';
import { parseTrendsView } from './google-trends-view';
export type { TrendsView } from './google-trends-view';

// Git blob ID of the admitted feed bytes, not an upstream publication/commit.
export const BUNDLED_TRENDS_REVISION = '7574619a0ea64efbf482d31d57916857f97b966d';
export const bundledTrends = parseTrendsView({ revision: BUNDLED_TRENDS_REVISION, snapshot: SNAPSHOT });
