-- Enable pgvector extension before any table creation
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- projects
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- artifacts
CREATE TABLE IF NOT EXISTS artifacts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  name               TEXT NOT NULL,
  type               TEXT NOT NULL,
  current_version_id UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);

-- artifact_versions
CREATE TABLE IF NOT EXISTS artifact_versions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id          UUID NOT NULL REFERENCES artifacts(id) ON DELETE RESTRICT,
  version              INTEGER NOT NULL,
  storage_key          TEXT NOT NULL,
  content_hash         TEXT NOT NULL,
  content_type         TEXT NOT NULL,
  size_bytes           INTEGER NOT NULL,
  parent_version_id    UUID,
  created_by           TEXT NOT NULL,
  change_summary       TEXT,
  generation_metadata  JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_artifact_version UNIQUE (artifact_id, version)
);

-- artifact_version_embeddings
CREATE TABLE IF NOT EXISTS artifact_version_embeddings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL UNIQUE REFERENCES artifact_versions(id) ON DELETE CASCADE,
  embedding  vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ave_embedding
  ON artifact_version_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- artifact_tags
CREATE TABLE IF NOT EXISTS artifact_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE RESTRICT,
  version_id  UUID NOT NULL REFERENCES artifact_versions(id) ON DELETE RESTRICT,
  tag         TEXT NOT NULL,
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_artifact_tag UNIQUE (artifact_id, tag)
);

-- Foreign key from artifacts back to artifact_versions (added after both tables exist)
ALTER TABLE artifacts
  ADD CONSTRAINT fk_artifacts_current_version
  FOREIGN KEY (current_version_id)
  REFERENCES artifact_versions(id)
  ON DELETE SET NULL;
