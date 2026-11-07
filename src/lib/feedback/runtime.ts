import {createFeedbackDatabase} from "./database";
import {loadFeedbackConfig} from "./config";
import {createFeedbackService,type FeedbackService} from "./service";
import {createFeedbackRouteHandlers} from "./routes";
import {linearFeedbackRoutes} from '../feedback-linear/server/runtime';
let service:FeedbackService|null=null;
/** No environment access/connection until a request; disabled has no storage fallback. */
export function getFeedbackRuntime():FeedbackService|null {
  if(process.env.FEEDBACK_BACKEND && process.env.FEEDBACK_BACKEND!=='postgres')return null;
  const config=loadFeedbackConfig();if(!config)return null;
  if(!service)service=createFeedbackService({config,database:createFeedbackDatabase(config.databaseUrl)});
  return service;
}
const postgresRoutes=createFeedbackRouteHandlers(getFeedbackRuntime);
// Deliberately no fallback when Linear is missing, invalid or unavailable.
function selected() {return process.env.FEEDBACK_BACKEND==='linear'?linearFeedbackRoutes:postgresRoutes;}
export const feedbackRoutes={
  config:(r:Request)=>selected().config(r),start:(r:Request)=>selected().start(r),
  finish:(r:Request)=>selected().finish(r),callback:(r:Request)=>selected().callback(r),
  revoke:(r:Request)=>selected().revoke(r),create:(r:Request)=>selected().create(r),
  list:(r:Request)=>selected().list(r),status:(r:Request,id:string)=>selected().status(r,id),
  followup:(r:Request,id:string)=>selected().followup(r,id),
};
