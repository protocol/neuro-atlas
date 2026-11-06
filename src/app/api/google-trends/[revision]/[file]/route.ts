import { getTrendsRevision } from '@/lib/field-velocity/google-trends-server';
import { TRENDS_REVISION } from '@/lib/field-velocity/google-trends-reader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const files = ['google-trends.json', 'neurotech.csv', 'neuralink.csv'] as const;
export async function GET(_request: Request, { params }: { params: Promise<{ revision: string; file: string }> }) {
  const { revision, file } = await params;
  if (!TRENDS_REVISION.test(revision) || !files.some(name => name === file)) return new Response('Not found', { status: 404 });
  try {
    const data = await getTrendsRevision(revision);
    return new Response(data.files[file], { headers: {
      'Content-Type': file.endsWith('.csv') ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${file}"`,
      // Authenticated downloads stay private; the immutable server source is durably cached.
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'X-Trends-Revision': revision,
    } });
  } catch { return new Response('This exact source revision is temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
