import { z } from 'zod';
import { config } from 'dotenv';

config(); // load .env if present

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
  S3_BUCKET_NAME: z.string().min(1, 'S3_BUCKET_NAME is required'),
  S3_ENDPOINT: z.string().url().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),

  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  PORT: z
    .string()
    .optional()
    .transform((v) => parseInt(v ?? '3000', 10)),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .optional()
    .default('development'),
  MAX_UPLOAD_BYTES: z
    .string()
    .optional()
    .transform((v) => parseInt(v ?? '10485760', 10)),
  PRESIGNED_URL_TTL_SECONDS: z
    .string()
    .optional()
    .transform((v) => parseInt(v ?? '900', 10)),
  CORS_ORIGINS: z.string().optional(),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error(`[config] Missing or invalid environment variables:\n${errors}`);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
