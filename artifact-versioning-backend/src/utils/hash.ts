import { createHash } from 'crypto';

/** Return the SHA-256 hex digest of a buffer. */
export function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}
