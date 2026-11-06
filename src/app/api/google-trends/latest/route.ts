import { trendsLatestResponse } from '@/lib/field-velocity/google-trends-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() { return trendsLatestResponse(); }
