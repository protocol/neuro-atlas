import {publicFeedbackRoutes} from '@/lib/feedback-public/runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET(request: Request) { return publicFeedbackRoutes().config(request); }
