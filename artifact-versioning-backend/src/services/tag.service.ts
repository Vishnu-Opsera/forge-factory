import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { artifactTags, artifactVersions, type ArtifactTag } from '../db/schema.js';

class TagService {
  async listTags(artifactId: string): Promise<ArtifactTag[]> {
    return db
      .select()
      .from(artifactTags)
      .where(eq(artifactTags.artifactId, artifactId));
  }

  /** Create a tag or move it to a new version (upsert on unique(artifact_id, tag)). */
  async upsertTag(input: {
    artifactId: string;
    versionId: string;
    tag: string;
    createdBy: string;
  }): Promise<ArtifactTag> {
    // Verify versionId belongs to artifactId
    const [version] = await db
      .select()
      .from(artifactVersions)
      .where(
        and(
          eq(artifactVersions.id, input.versionId),
          eq(artifactVersions.artifactId, input.artifactId),
        ),
      );
    if (!version) {
      throw Object.assign(new Error('Version not found for this artifact'), { status: 404 });
    }

    const [tag] = await db
      .insert(artifactTags)
      .values(input)
      .onConflictDoUpdate({
        target: [artifactTags.artifactId, artifactTags.tag],
        set: { versionId: input.versionId, createdBy: input.createdBy },
      })
      .returning();
    return tag;
  }

  async deleteTag(artifactId: string, tag: string): Promise<void> {
    const result = await db
      .delete(artifactTags)
      .where(and(eq(artifactTags.artifactId, artifactId), eq(artifactTags.tag, tag)))
      .returning({ id: artifactTags.id });
    if (!result.length) throw Object.assign(new Error('Tag not found'), { status: 404 });
  }

  async resolveTag(artifactId: string, tag: string): Promise<ArtifactTag & { version: typeof artifactVersions.$inferSelect }> {
    const [row] = await db
      .select({
        tag: artifactTags,
        version: artifactVersions,
      })
      .from(artifactTags)
      .innerJoin(artifactVersions, eq(artifactTags.versionId, artifactVersions.id))
      .where(and(eq(artifactTags.artifactId, artifactId), eq(artifactTags.tag, tag)));

    if (!row) throw Object.assign(new Error('Tag not found'), { status: 404 });
    return { ...row.tag, version: row.version };
  }
}

export const tagService = new TagService();
