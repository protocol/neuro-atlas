import {publicationSourceResponse} from '@/lib/publication-feed-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET() {return publicationSourceResponse();}
