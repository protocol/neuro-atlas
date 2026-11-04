import {loadLinearConfig} from './config';
import {createLinearService} from './service';
import {createLinearRoutes} from './routes';
/** Request-time environment references only. No database, provider calls or jobs at import. */
export const linearFeedbackRoutes=createLinearRoutes(()=>{
  const config=loadLinearConfig();
  return config?createLinearService({config}):null;
});
