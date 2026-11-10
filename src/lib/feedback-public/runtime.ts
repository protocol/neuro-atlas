import {createPublicFeedbackRoutes} from './server';
let routes: ReturnType<typeof createPublicFeedbackRoutes> | undefined;
/** Lazy and process-local: never constructs a provider connection during a build. */
export function publicFeedbackRoutes() { return routes ??= createPublicFeedbackRoutes(); }
