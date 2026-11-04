export function allowedOrigin(origin:string, expected:string,fixture=false):boolean {
  try { const u=new URL(origin); return u.origin===origin && (origin===expected || (fixture && !process.env.VERCEL && process.env.NODE_ENV!=='production' && u.protocol==='http:' && u.hostname==='127.0.0.1' && !!u.port)); } catch {return false;}
}
export async function boundedJson(response:Response,maxBytes:number):Promise<unknown> {
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json') || !response.body) throw new Error('remote_unavailable');
  const reader=response.body.getReader(); let bytes=0;const chunks:Uint8Array[]=[];
  try { for(;;) {const {value,done}=await reader.read();if(done) break;bytes+=value.byteLength;if(bytes>maxBytes) throw new Error('remote_unavailable');chunks.push(value);} return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  finally {await reader.cancel().catch(()=>{});}
}
