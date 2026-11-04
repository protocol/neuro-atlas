import {feedbackRoutes} from "@/lib/feedback/runtime";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const GET=feedbackRoutes.list;
export const POST=feedbackRoutes.create;
