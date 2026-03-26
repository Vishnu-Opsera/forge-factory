import OpenAI from 'openai';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { artifactVersionEmbeddings } from '../db/schema.js';
import { env } from '../config/env.js';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const MAX_CHARS = 8000;
const EMBEDDING_MODEL = 'text-embedding-3-small';

class EmbeddingService {
  /**
   * Generate an embedding for `text` and upsert it into
   * artifact_version_embeddings. Errors are logged but never thrown.
   */
  async generateAndStore(versionId: string, text: string): Promise<void> {
    try {
      const truncated = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: truncated,
      });

      const embedding = response.data[0].embedding;

      await db
        .insert(artifactVersionEmbeddings)
        .values({
          versionId,
          embedding: embedding as unknown as number[],
        })
        .onConflictDoUpdate({
          target: artifactVersionEmbeddings.versionId,
          set: { embedding: embedding as unknown as number[] },
        });
    } catch (err) {
      console.error(`[embedding] generateAndStore failed for version ${versionId}:`, err);
      // Do not rethrow — embedding failures must not block version creation
    }
  }

  /** Generate an embedding vector for a query string (throws on failure). */
  async generateForQuery(query: string): Promise<number[]> {
    const truncated = query.length > MAX_CHARS ? query.slice(0, MAX_CHARS) : query;
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncated,
    });
    return response.data[0].embedding;
  }
}

export const embeddingService = new EmbeddingService();
