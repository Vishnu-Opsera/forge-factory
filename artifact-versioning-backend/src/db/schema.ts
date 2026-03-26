import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  unique,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// pgvector custom type
const vector = customType<{ data: number[]; driverData: string }>({
  dataType(config?: Record<string, unknown>) {
    const dim = config?.['dimensions'] ?? 1536;
    return `vector(${dim})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(Number);
  },
});

// ─── projects ────────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

// ─── artifacts ───────────────────────────────────────────────────────────────

export const artifacts = pgTable('artifacts', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // requirement | architecture | diagram | other
  currentVersionId: uuid('current_version_id'), // FK set after insert; nullable
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Artifact = typeof artifacts.$inferSelect;
export type NewArtifact = typeof artifacts.$inferInsert;

// ─── artifact_versions ───────────────────────────────────────────────────────

export const artifactVersions = pgTable(
  'artifact_versions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    artifactId: uuid('artifact_id')
      .notNull()
      .references(() => artifacts.id, { onDelete: 'restrict' }),
    version: integer('version').notNull(),
    storageKey: text('storage_key').notNull(),
    contentHash: text('content_hash').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    parentVersionId: uuid('parent_version_id'), // self-ref, no FK constraint to avoid circular
    createdBy: text('created_by').notNull(),
    changeSummary: text('change_summary'),
    generationMetadata: jsonb('generation_metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uniqArtifactVersion: unique('uq_artifact_version').on(t.artifactId, t.version),
  }),
);

export type ArtifactVersion = typeof artifactVersions.$inferSelect;
export type NewArtifactVersion = typeof artifactVersions.$inferInsert;

// ─── artifact_version_embeddings ─────────────────────────────────────────────

export const artifactVersionEmbeddings = pgTable('artifact_version_embeddings', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  versionId: uuid('version_id')
    .notNull()
    .unique()
    .references(() => artifactVersions.id, { onDelete: 'cascade' }),
  embedding: vector('embedding', { dimensions: 1536 } as Record<string, unknown>).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type ArtifactVersionEmbedding = typeof artifactVersionEmbeddings.$inferSelect;

// ─── artifact_tags ────────────────────────────────────────────────────────────

export const artifactTags = pgTable(
  'artifact_tags',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    artifactId: uuid('artifact_id')
      .notNull()
      .references(() => artifacts.id, { onDelete: 'restrict' }),
    versionId: uuid('version_id')
      .notNull()
      .references(() => artifactVersions.id, { onDelete: 'restrict' }),
    tag: text('tag').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uniqArtifactTag: unique('uq_artifact_tag').on(t.artifactId, t.tag),
  }),
);

export type ArtifactTag = typeof artifactTags.$inferSelect;
export type NewArtifactTag = typeof artifactTags.$inferInsert;
