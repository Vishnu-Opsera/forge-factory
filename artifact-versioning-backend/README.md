# Artifact Versioning Backend

Node.js · TypeScript · PostgreSQL + pgvector · AWS S3

## Quick Start (Docker)

```bash
cp .env.example .env
# Fill in OPENAI_API_KEY and any AWS overrides — S3 uses LocalStack by default in docker-compose

docker-compose up -d
docker-compose exec api npm run db:migrate
```

The API is available at `http://localhost:3000/api/v1`.

## Local Dev (without Docker)

```bash
# 1. Install deps
npm install

# 2. Copy and fill env
cp .env.example .env

# 3. Start Postgres + LocalStack via docker-compose (services only)
docker-compose up -d postgres localstack

# 4. Run migrations
npm run db:migrate

# 5. Start the server with hot-reload
npm run dev
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `AWS_ACCESS_KEY_ID` | ✅ | — | IAM key with S3 read/write |
| `AWS_SECRET_ACCESS_KEY` | ✅ | — | Corresponding secret |
| `AWS_REGION` | ✅ | — | AWS region (e.g. `us-east-1`) |
| `S3_BUCKET_NAME` | ✅ | — | Target bucket |
| `OPENAI_API_KEY` | ✅ | — | For `text-embedding-3-small` |
| `S3_ENDPOINT` | — | — | LocalStack override: `http://localhost:4566` |
| `S3_FORCE_PATH_STYLE` | — | `false` | Set `true` for LocalStack |
| `PORT` | — | `3000` | HTTP port |
| `NODE_ENV` | — | `development` | `development \| test \| production` |
| `MAX_UPLOAD_BYTES` | — | `10485760` | Max upload size (10 MB) |
| `PRESIGNED_URL_TTL_SECONDS` | — | `900` | S3 presigned URL TTL |

## API Reference

Base path: `/api/v1`

### Projects
```
GET    /projects
POST   /projects           { name, description?, metadata? }
GET    /projects/:id
PATCH  /projects/:id       { name?, description? }
DELETE /projects/:id
```

### Artifacts
```
GET    /artifacts           ?project_id=&type=&name=&limit=&offset=
POST   /artifacts           { projectId, name, type }
GET    /artifacts/:id
PATCH  /artifacts/:id       { name?, type? }
DELETE /artifacts/:id
```

### Versions
```
GET    /artifacts/:id/versions
POST   /artifacts/:id/versions    raw body + ?created_by=&change_summary=
GET    /artifacts/:id/versions/latest
GET    /artifacts/:id/versions/:vnum
GET    /artifacts/:id/versions/:vnum/content    ?inline=true for <1MB
GET    /artifacts/:id/versions/:vnum/diff
GET    /artifacts/:id/lineage
```

### Tags
```
GET    /artifacts/:id/tags
POST   /artifacts/:id/tags         { tag, version_id, created_by }
DELETE /artifacts/:id/tags/:tag
GET    /artifacts/:id/tags/:tag/version
```

### Search
```
POST   /search/semantic     { query, limit?, project_id?, type? }
GET    /search/text         ?q=&project_id=&type=&limit=&offset=
```

### Health
```
GET    /health
```

## Example Requests

```bash
# Create project
curl -X POST http://localhost:3000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Project"}'

# Create artifact
curl -X POST http://localhost:3000/api/v1/artifacts \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"<id>","name":"Auth Requirements","type":"requirement"}'

# Upload a version
curl -X POST "http://localhost:3000/api/v1/artifacts/<id>/versions?created_by=user:alice&change_summary=Initial" \
  -H 'Content-Type: text/markdown' \
  --data-binary @requirements.md

# Semantic search
curl -X POST http://localhost:3000/api/v1/search/semantic \
  -H 'Content-Type: application/json' \
  -d '{"query":"authentication flow","limit":5}'
```

## Testing

```bash
# Unit tests (no external deps)
npm test

# Integration tests (requires Postgres + LocalStack)
docker-compose up -d postgres localstack
npm run test:integration
```

## Database Migrations

Migrations live in `src/db/migrations/`. The bootstrap migration (`0000_bootstrap.sql`) enables the `pgvector` extension and creates all tables.

```bash
npm run db:migrate      # apply migrations
npm run db:generate     # generate new migration from schema changes
npm run db:studio       # open Drizzle Studio
```

## Project Structure

```
src/
  config/        env.ts — Zod-validated env vars
  db/            schema.ts, migrations/, index.ts
  storage/       s3.ts, keys.ts
  services/      artifact, version, embedding, search, project, tag
  routes/        projects, artifacts, versions (+ tags + lineage), search
  middleware/    auth.stub, error, validate
  utils/         hash.ts, diff.ts
  app.ts         Express app
  server.ts      HTTP entry point
tests/
  unit/          hash, keys, diff, embedding.service, artifact.service
  integration/   full lifecycle with real DB + S3
```
