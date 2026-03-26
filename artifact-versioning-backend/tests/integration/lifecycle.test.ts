/**
 * Integration tests — require a real PostgreSQL (with pgvector) and LocalStack S3.
 * Run via: docker-compose up -d postgres localstack && npm run test:integration
 *
 * Set env vars DATABASE_URL, S3_BUCKET_NAME, S3_ENDPOINT, etc. before running.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/db/index.js';

let projectId: string;
let artifactId: string;
let versionId: string;

beforeAll(async () => {
  // Run migrations
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const { db } = await import('../../src/db/index.js');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
});

afterAll(async () => {
  await pool.end();
});

describe('Project lifecycle', () => {
  it('POST /api/v1/projects — creates a project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .send({ name: 'Test Project', description: 'Integration test' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    projectId = res.body.id;
  });

  it('GET /api/v1/projects — lists projects', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('Artifact + Version lifecycle', () => {
  it('POST /api/v1/artifacts — creates an artifact', async () => {
    const res = await request(app).post('/api/v1/artifacts').send({
      projectId,
      name: 'Auth Module Requirements',
      type: 'requirement',
    });

    expect(res.status).toBe(201);
    artifactId = res.body.id;
  });

  it('POST /api/v1/artifacts/:id/versions — uploads version 1', async () => {
    const content = '# Requirements\n\nThis is version 1.';
    const res = await request(app)
      .post(`/api/v1/artifacts/${artifactId}/versions`)
      .query({ created_by: 'user:test', change_summary: 'Initial version' })
      .set('Content-Type', 'text/markdown')
      .send(Buffer.from(content));

    expect(res.status).toBe(201);
    expect(res.body.version).toBe(1);
    versionId = res.body.id;
  });

  it('POST — uploading identical content returns 409', async () => {
    const content = '# Requirements\n\nThis is version 1.';
    const res = await request(app)
      .post(`/api/v1/artifacts/${artifactId}/versions`)
      .query({ created_by: 'user:test' })
      .set('Content-Type', 'text/markdown')
      .send(Buffer.from(content));

    expect(res.status).toBe(409);
  });

  it('POST — uploading different content creates version 2', async () => {
    const content = '# Requirements\n\nThis is version 2 with updates.';
    const res = await request(app)
      .post(`/api/v1/artifacts/${artifactId}/versions`)
      .query({ created_by: 'user:test', change_summary: 'Updated requirements' })
      .set('Content-Type', 'text/markdown')
      .send(Buffer.from(content));

    expect(res.status).toBe(201);
    expect(res.body.version).toBe(2);
  });

  it('GET /api/v1/artifacts/:id/versions — lists versions newest first', async () => {
    const res = await request(app).get(`/api/v1/artifacts/${artifactId}/versions`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].version).toBe(2);
    expect(res.body.data[1].version).toBe(1);
  });

  it('GET /api/v1/artifacts/:id/versions/latest — returns version 2', async () => {
    const res = await request(app).get(`/api/v1/artifacts/${artifactId}/versions/latest`);
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(2);
    expect(res.body.downloadUrl).toMatch(/^http/);
  });

  it('GET /api/v1/artifacts/:id/versions/:vnum — returns version metadata + URL', async () => {
    const res = await request(app).get(`/api/v1/artifacts/${artifactId}/versions/1`);
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(1);
    expect(res.body.downloadUrl).toBeDefined();
  });

  it('GET /api/v1/artifacts/:id/versions/:vnum/diff — returns unified diff', async () => {
    const res = await request(app).get(`/api/v1/artifacts/${artifactId}/versions/2/diff`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('-');
    expect(res.text).toContain('+');
  });
});

describe('Tag lifecycle', () => {
  it('POST /api/v1/artifacts/:id/tags — creates a tag', async () => {
    const res = await request(app)
      .post(`/api/v1/artifacts/${artifactId}/tags`)
      .send({ tag: 'approved', version_id: versionId, created_by: 'user:test' });

    expect(res.status).toBe(201);
    expect(res.body.tag).toBe('approved');
  });

  it('GET /api/v1/artifacts/:id/tags/:tag/version — resolves tag', async () => {
    const res = await request(app).get(`/api/v1/artifacts/${artifactId}/tags/approved/version`);
    expect(res.status).toBe(200);
    expect(res.body.version).toBeDefined();
  });

  it('DELETE /api/v1/artifacts/:id/tags/:tag — removes the tag', async () => {
    const res = await request(app).delete(`/api/v1/artifacts/${artifactId}/tags/approved`);
    expect(res.status).toBe(204);
  });
});

describe('Concurrent version uploads', () => {
  let concArtifactId: string;

  it('creates artifact for concurrency test', async () => {
    const res = await request(app).post('/api/v1/artifacts').send({
      projectId,
      name: 'Concurrent Test Artifact',
      type: 'other',
    });
    expect(res.status).toBe(201);
    concArtifactId = res.body.id;
  });

  it('10 parallel uploads produce sequential unique version numbers', async () => {
    const uploads = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .post(`/api/v1/artifacts/${concArtifactId}/versions`)
        .query({ created_by: 'user:test' })
        .set('Content-Type', 'text/plain')
        .send(Buffer.from(`Concurrent content ${i} — ${Math.random()}`)),
    );

    const results = await Promise.all(uploads);
    const versions = results.map((r) => r.body.version).sort((a, b) => a - b);
    // All should succeed and have versions 1..10
    const successCount = results.filter((r) => r.status === 201).length;
    expect(successCount).toBe(10);
    expect(versions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('Health endpoint', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
