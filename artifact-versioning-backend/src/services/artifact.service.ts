import { eq, and, isNull, ilike, sql, desc } from 'drizzle-orm';
import { db, pool } from '../db/index.js';
import {
  artifacts,
  artifactVersions,
  projects,
  type Artifact,
  type ArtifactVersion,
  type NewArtifact,
} from '../db/schema.js';
import { sha256 } from '../utils/hash.js';
import { buildStorageKey } from '../storage/keys.js';
import { uploadObject } from '../storage/s3.js';
import { embeddingService } from './embedding.service.js';

export interface CreateArtifactInput {
  projectId: string;
  name: string;
  type: string;
}

export interface CreateVersionInput {
  artifactId: string;
  content: Buffer;
  contentType: string;
  createdBy: string;
  changeSummary?: string;
  generationMetadata?: Record<string, unknown>;
  parentVersionId?: string;
}

export interface ListArtifactsFilter {
  projectId?: string;
  type?: string;
  name?: string;
  limit?: number;
  offset?: number;
}

class ArtifactService {
  async createArtifact(input: CreateArtifactInput): Promise<Artifact> {
    // Verify project exists and is not soft-deleted
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, input.projectId), isNull(projects.deletedAt)));
    if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });

    const [artifact] = await db.insert(artifacts).values(input).returning();
    return artifact;
  }

  async listArtifacts(filter: ListArtifactsFilter) {
    const conditions = [isNull(artifacts.deletedAt)];
    if (filter.projectId) conditions.push(eq(artifacts.projectId, filter.projectId));
    if (filter.type) conditions.push(eq(artifacts.type, filter.type));
    if (filter.name) conditions.push(ilike(artifacts.name, `%${filter.name}%`));

    const limit = Math.min(filter.limit ?? 20, 100);
    const offset = filter.offset ?? 0;

    return db
      .select()
      .from(artifacts)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(artifacts.createdAt));
  }

  async getArtifact(id: string): Promise<Artifact> {
    const [artifact] = await db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.id, id), isNull(artifacts.deletedAt)));
    if (!artifact) throw Object.assign(new Error('Artifact not found'), { status: 404 });
    return artifact;
  }

  async updateArtifact(
    id: string,
    patch: Partial<Pick<Artifact, 'name' | 'type'>>,
  ): Promise<Artifact> {
    const [updated] = await db
      .update(artifacts)
      .set(patch)
      .where(and(eq(artifacts.id, id), isNull(artifacts.deletedAt)))
      .returning();
    if (!updated) throw Object.assign(new Error('Artifact not found'), { status: 404 });
    return updated;
  }

  async softDeleteArtifact(id: string): Promise<void> {
    const result = await db
      .update(artifacts)
      .set({ deletedAt: new Date() })
      .where(and(eq(artifacts.id, id), isNull(artifacts.deletedAt)))
      .returning({ id: artifacts.id });
    if (!result.length) throw Object.assign(new Error('Artifact not found'), { status: 404 });
  }

  /**
   * Core version creation. Uses a PostgreSQL advisory lock on the artifact's
   * integer hash to serialize concurrent uploads for the same artifact.
   */
  async createVersion(input: CreateVersionInput): Promise<ArtifactVersion> {
    const { artifactId, content, contentType, createdBy, changeSummary, generationMetadata, parentVersionId } = input;

    // Acquire advisory lock — lock key is the lower 32 bits of the artifact UUID hash
    const lockKey = this.advisoryLockKey(artifactId);

    const client = await pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock($1)', [lockKey]);

      // Determine next version number inside the lock
      const versionResult = await client.query<{ max: number | null }>(
        'SELECT MAX(version) AS max FROM artifact_versions WHERE artifact_id = $1',
        [artifactId],
      );
      const nextVersion = (versionResult.rows[0].max ?? 0) + 1;

      // Hash the content INSIDE the lock (required by design constraint §13)
      const contentHash = sha256(content);

      // Duplicate content check
      const dupResult = await client.query<{ version: number }>(
        'SELECT version FROM artifact_versions WHERE artifact_id = $1 AND content_hash = $2 LIMIT 1',
        [artifactId, contentHash],
      );
      if (dupResult.rows.length > 0) {
        const dupVersion = dupResult.rows[0].version;
        const err = Object.assign(
          new Error(`Content is identical to version ${dupVersion}`),
          { status: 409 },
        );
        throw err;
      }

      // Upload to S3 first — transaction only commits if upload succeeds
      const storageKey = buildStorageKey(artifactId, nextVersion, contentHash, contentType);
      await uploadObject(storageKey, content, contentType, artifactId, nextVersion);

      // Insert version row + update artifact.current_version_id atomically
      await client.query('BEGIN');
      const insertResult = await client.query<ArtifactVersion>(
        `INSERT INTO artifact_versions
           (artifact_id, version, storage_key, content_hash, content_type,
            size_bytes, parent_version_id, created_by, change_summary, generation_metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          artifactId,
          nextVersion,
          storageKey,
          contentHash,
          contentType,
          content.length,
          parentVersionId ?? null,
          createdBy,
          changeSummary ?? null,
          JSON.stringify(generationMetadata ?? {}),
        ],
      );
      const newVersion = insertResult.rows[0];

      await client.query(
        'UPDATE artifacts SET current_version_id = $1 WHERE id = $2',
        [newVersion.id, artifactId],
      );
      await client.query('COMMIT');

      // Non-blocking embedding generation
      this.generateEmbeddingAsync(newVersion.id, content, contentType);

      return newVersion;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [lockKey]).catch(() => {});
      client.release();
    }
  }

  private advisoryLockKey(artifactId: string): number {
    // Convert first 8 hex chars of UUID to a 32-bit integer
    const hex = artifactId.replace(/-/g, '').slice(0, 8);
    return parseInt(hex, 16) >>> 0; // unsigned 32-bit
  }

  private generateEmbeddingAsync(
    versionId: string,
    content: Buffer,
    contentType: string,
  ): void {
    // Only attempt embeddings for text content
    if (!contentType.startsWith('text/')) return;
    const text = content.toString('utf8');
    embeddingService.generateAndStore(versionId, text).catch((err) => {
      console.error(`[embedding] Failed for version ${versionId}:`, err);
    });
  }
}

export const artifactService = new ArtifactService();
