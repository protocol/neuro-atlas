import {feedbackRoutes} from "@/lib/feedback/runtime";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export async function POST(request:Request,context:{params:Promise<{id:string}>}) {
  return feedbackRoutes.followup(request,(await context.params).id);
}
