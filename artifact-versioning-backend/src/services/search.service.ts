import { pool } from '../db/index.js';
import { embeddingService } from './embedding.service.js';

export interface SemanticSearchInput {
  query: string;
  limit?: number;
  projectId?: string;
  type?: string;
}

export interface SemanticSearchResult {
  artifact: {
    id: string;
    name: string;
    type: string;
    projectId: string;
  };
  version: {
    id: string;
    version: number;
    contentType: string;
    createdAt: Date;
    changeSummary: string | null;
  };
  similarityScore: number;
}

export interface TextSearchResult {
  artifact: {
    id: string;
    name: string;
    type: string;
    projectId: string;
  };
  matchedOn: 'name' | 'change_summary';
}

class SearchService {
  async semanticSearch(input: SemanticSearchInput): Promise<SemanticSearchResult[]> {
    const limit = Math.min(input.limit ?? 10, 50);
    const embedding = await embeddingService.generateForQuery(input.query);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const params: unknown[] = [vectorLiteral, limit];
    const conditions: string[] = [
      'a.deleted_at IS NULL',
      'av.artifact_id = a.id',
      'e.version_id = av.id',
    ];

    if (input.projectId) {
      params.push(input.projectId);
      conditions.push(`a.project_id = $${params.length}`);
    }
    if (input.type) {
      params.push(input.type);
      conditions.push(`a.type = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query<{
      artifact_id: string;
      artifact_name: string;
      artifact_type: string;
      project_id: string;
      version_id: string;
      version: number;
      content_type: string;
      created_at: Date;
      change_summary: string | null;
      similarity: number;
    }>(
      `SELECT
         a.id           AS artifact_id,
         a.name         AS artifact_name,
         a.type         AS artifact_type,
         a.project_id,
         av.id          AS version_id,
         av.version,
         av.content_type,
         av.created_at,
         av.change_summary,
         1 - (e.embedding <=> $1::vector) AS similarity
       FROM artifact_version_embeddings e, artifact_versions av, artifacts a
       WHERE ${whereClause}
       ORDER BY e.embedding <=> $1::vector
       LIMIT $2`,
      params,
    );

    return result.rows.map((row) => ({
      artifact: {
        id: row.artifact_id,
        name: row.artifact_name,
        type: row.artifact_type,
        projectId: row.project_id,
      },
      version: {
        id: row.version_id,
        version: row.version,
        contentType: row.content_type,
        createdAt: row.created_at,
        changeSummary: row.change_summary,
      },
      similarityScore: row.similarity,
    }));
  }

  async textSearch(params: {
    q: string;
    projectId?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(params.limit ?? 20, 100);
    const offset = params.offset ?? 0;
    const queryParams: unknown[] = [`%${params.q}%`, limit, offset];
    const conditions = ['a.deleted_at IS NULL'];

    if (params.projectId) {
      queryParams.push(params.projectId);
      conditions.push(`a.project_id = $${queryParams.length}`);
    }
    if (params.type) {
      queryParams.push(params.type);
      conditions.push(`a.type = $${queryParams.length}`);
    }

    const whereClause = conditions.join(' AND ');

    // Search across artifact names and the latest version's change_summary
    const result = await pool.query(
      `SELECT DISTINCT ON (a.id)
         a.id, a.name, a.type, a.project_id
       FROM artifacts a
       LEFT JOIN artifact_versions av ON av.artifact_id = a.id
       WHERE ${whereClause}
         AND (a.name ILIKE $1 OR av.change_summary ILIKE $1)
       ORDER BY a.id, a.created_at DESC
       LIMIT $2 OFFSET $3`,
      queryParams,
    );

    return result.rows;
  }
}

export const searchService = new SearchService();
