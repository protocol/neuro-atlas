import { citationLatestResponse } from '@/lib/field-velocity/citation-latency-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() { return citationLatestResponse(); }
