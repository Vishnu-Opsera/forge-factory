import { eq, and, desc, asc } from 'drizzle-orm';
import { db, pool } from '../db/index.js';
import { artifactVersions, type ArtifactVersion } from '../db/schema.js';

export interface LineageNode {
  id: string;
  version: number;
  parentVersionId: string | null;
  createdAt: Date;
  changeSummary: string | null;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: Array<{ from: string; to: string }>;
}

class VersionService {
  async listVersions(artifactId: string): Promise<ArtifactVersion[]> {
    return db
      .select()
      .from(artifactVersions)
      .where(eq(artifactVersions.artifactId, artifactId))
      .orderBy(desc(artifactVersions.version));
  }

  async getVersion(artifactId: string, versionNumber: number): Promise<ArtifactVersion> {
    const [v] = await db
      .select()
      .from(artifactVersions)
      .where(
        and(
          eq(artifactVersions.artifactId, artifactId),
          eq(artifactVersions.version, versionNumber),
        ),
      );
    if (!v) throw Object.assign(new Error('Version not found'), { status: 404 });
    return v;
  }

  async getLatestVersion(artifactId: string): Promise<ArtifactVersion> {
    const [v] = await db
      .select()
      .from(artifactVersions)
      .where(eq(artifactVersions.artifactId, artifactId))
      .orderBy(desc(artifactVersions.version))
      .limit(1);
    if (!v) throw Object.assign(new Error('No versions found for artifact'), { status: 404 });
    return v;
  }

  async getVersionById(versionId: string): Promise<ArtifactVersion> {
    const [v] = await db
      .select()
      .from(artifactVersions)
      .where(eq(artifactVersions.id, versionId));
    if (!v) throw Object.assign(new Error('Version not found'), { status: 404 });
    return v;
  }

  async getPreviousVersion(
    artifactId: string,
    currentVersionNumber: number,
  ): Promise<ArtifactVersion | null> {
    const [v] = await db
      .select()
      .from(artifactVersions)
      .where(
        and(
          eq(artifactVersions.artifactId, artifactId),
          eq(artifactVersions.version, currentVersionNumber - 1),
        ),
      );
    return v ?? null;
  }

  /**
   * Traverse parent_version_id links with a recursive CTE to return the full
   * version DAG for a given artifact.
   */
  async getLineage(artifactId: string): Promise<LineageGraph> {
    const result = await pool.query<LineageNode>(
      `WITH RECURSIVE lineage AS (
         SELECT id, version, parent_version_id, created_at, change_summary
         FROM artifact_versions
         WHERE artifact_id = $1 AND parent_version_id IS NULL
       UNION ALL
         SELECT av.id, av.version, av.parent_version_id, av.created_at, av.change_summary
         FROM artifact_versions av
         JOIN lineage l ON av.parent_version_id = l.id
         WHERE av.artifact_id = $1
       )
       SELECT * FROM lineage ORDER BY version ASC`,
      [artifactId],
    );

    const nodes = result.rows;
    const edges = nodes
      .filter((n) => n.parentVersionId !== null)
      .map((n) => ({ from: n.parentVersionId as string, to: n.id }));

    return { nodes, edges };
  }
}

export const versionService = new VersionService();
