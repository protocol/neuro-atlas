import { citationFileResponse } from '@/lib/field-velocity/citation-latency-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{revision:string;file:string}>}) {
 const {revision,file}=await params;
 return citationFileResponse(revision,file);
}
