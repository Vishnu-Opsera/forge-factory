import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

export const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
});

/** Upload a buffer to S3. Enforces SSE-S3 and custom metadata. */
export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
  artifactId: string,
  versionNumber: number,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'x-artifact-id': artifactId,
        'x-version': String(versionNumber),
      },
    }),
  );
}

/** Check whether an object exists (used for deduplication). */
export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Generate a presigned GET URL valid for PRESIGNED_URL_TTL_SECONDS. */
export async function presignedGetUrl(key: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }),
    { expiresIn: env.PRESIGNED_URL_TTL_SECONDS },
  );
}

/** Return the raw object body as a Buffer. */
export async function downloadObject(key: string): Promise<Buffer> {
  const resp = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }));
  if (!resp.Body) throw new Error('Empty S3 response body');
  const chunks: Uint8Array[] = [];
  for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Ping S3 by checking bucket existence (used in health check). */
export async function pingS3(timeoutMs = 2000): Promise<boolean> {
  try {
    await Promise.race([
      s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET_NAME })),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('timeout')), timeoutMs),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}
