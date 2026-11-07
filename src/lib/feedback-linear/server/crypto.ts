import {createCipheriv, createDecipheriv, createHmac, randomBytes} from 'node:crypto';
import {z} from 'zod';
import {FeedbackError} from '../../feedback/errors';
import type {LinearConfig} from './config';

export const unauthorized = (): never => {throw new FeedbackError(401, 'unauthorized', 'Sign in to feedback again.');};
export function derivedKey(config: LinearConfig, purpose: string): Buffer {
  return createHmac('sha256', Buffer.from(config.sessionKey, 'base64url')).update(purpose).digest();
}
export function seal(config: LinearConfig, purpose: string, data: unknown): string {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', derivedKey(config, purpose), iv);
  cipher.setAAD(Buffer.from(`${purpose}:${config.origin}:${config.clientId}`));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function unseal<T>(config: LinearConfig, purpose: string, value: string, schema: z.ZodType<T>): T {
  try {
    if (!/^[A-Za-z0-9_-]{40,12000}$/.test(value)) return unauthorized();
    const raw = Buffer.from(value, 'base64url');
    if (raw.toString('base64url') !== value) return unauthorized();
    const decipher = createDecipheriv('aes-256-gcm', derivedKey(config, purpose), raw.subarray(0,12));
    decipher.setAAD(Buffer.from(`${purpose}:${config.origin}:${config.clientId}`));
    decipher.setAuthTag(raw.subarray(12,28));
    return schema.parse(JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')));
  } catch {return unauthorized();}
}
