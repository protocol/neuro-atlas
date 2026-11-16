// Server-only image admission and private Linear custody verification.
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {z} from 'zod';
export const MAX_SCREENSHOT_BYTES = 768 * 1024;
export const screenshotSchema = z.discriminatedUnion('status', [
  z.object({status:z.literal('captured'), mimeType:z.literal('image/png'), width:z.number().int().min(1).max(1200), height:z.number().int().min(1).max(800), data:z.string().min(4).max(MAX_SCREENSHOT_BYTES / 3 * 4).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)}).strict(),
  z.object({status:z.literal('unavailable'), reason:z.enum(['capture_failed','unsupported','too_large','not_visible'])}).strict(),
]);
export type Screenshot = z.infer<typeof screenshotSchema>;
export async function admitScreenshot(image: Screenshot | undefined) {
  if (!image || image.status !== 'captured') return;
  const bytes = Buffer.from(image.data, 'base64');
  if (bytes.length > MAX_SCREENSHOT_BYTES || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw Error('invalid image');
  const decoder = sharp(bytes, {limitInputPixels:1200 * 800, failOn:'warning'});
  const meta = await decoder.metadata();
  if (meta.format !== 'png' || meta.width !== image.width || meta.height !== image.height || (meta.pages ?? 1) !== 1) throw Error('invalid image');
  // Full decode, not merely trusting the IHDR/client dimensions; reject truncated data.
  await decoder.raw().toBuffer();
  return {bytes, hash:createHash('sha256').update(bytes).digest('hex')};
}
export function imageSuffix(image: Screenshot | undefined, hash?: string, url?: string) {
  if (!image) return '';
  if (image.status === 'unavailable') return `\n\nScreenshot unavailable: ${image.reason} (visitor explicitly sent without an image).`;
  return `\n\nSelected element screenshot (${image.width} × ${image.height}; PNG SHA-256 ${hash}):\n\n![Selected element screenshot](${url ?? `data:image/png;base64,${image.data}`})`;
}
/** No arbitrary URL, query capability, redirect, port, credentials or foreign host. */
export function linearAssetUrl(value: string) {
  return /^https:\/\/uploads\.linear\.app\/[a-f0-9-]{36}\/[a-f0-9-]{36}(?:\/[A-Za-z0-9_.-]{1,200})?$/.test(value);
}
export function storedImageUrl(description: string, prefix: string) {
  if (!description.startsWith(prefix)) return;
  const remainder = description.slice(prefix.length);
  const match = /^!\[Selected element screenshot\]\(([^\s()]+)\)$/.exec(remainder);
  return match && linearAssetUrl(match[1]) ? match[1] : undefined;
}
export function screenshotHash(bytes: Uint8Array) {return createHash('sha256').update(bytes).digest('hex');}
