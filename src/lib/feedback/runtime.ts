import {createFeedbackDatabase} from "./database";
import {loadFeedbackConfig} from "./config";
import {createFeedbackService,type FeedbackService} from "./service";
import {createFeedbackRouteHandlers} from "./routes";
let service:FeedbackService|null=null;
/** No environment access/connection until a request; disabled has no storage fallback. */
export function getFeedbackRuntime():FeedbackService|null {
  const config=loadFeedbackConfig();if(!config)return null;
  if(!service)service=createFeedbackService({config,database:createFeedbackDatabase(config.databaseUrl)});
  return service;
}
export const feedbackRoutes=createFeedbackRouteHandlers(getFeedbackRuntime);
