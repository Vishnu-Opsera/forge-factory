import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockRelease = vi.fn();

vi.mock('../../src/db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    then: vi.fn(),
  },
  pool: {
    connect: mockConnect,
  },
}));

vi.mock('../../src/storage/s3.js', () => ({
  uploadObject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/embedding.service.js', () => ({
  embeddingService: {
    generateAndStore: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    OPENAI_API_KEY: 'test',
    AWS_ACCESS_KEY_ID: 'test',
    AWS_SECRET_ACCESS_KEY: 'test',
    AWS_REGION: 'us-east-1',
    S3_BUCKET_NAME: 'test-bucket',
    S3_FORCE_PATH_STYLE: false,
    MAX_UPLOAD_BYTES: 10_485_760,
    PRESIGNED_URL_TTL_SECONDS: 900,
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('artifactService.createVersion (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const client = {
      query: mockQuery,
      release: mockRelease,
    };
    mockConnect.mockResolvedValue(client);
  });

  it('raises 409 when content is a duplicate', async () => {
    // Advisory lock, MAX(version), then duplicate hash found
    mockQuery
      .mockResolvedValueOnce({}) // pg_advisory_lock
      .mockResolvedValueOnce({ rows: [{ max: 1 }] }) // MAX(version)
      .mockResolvedValueOnce({ rows: [{ version: 1 }] }) // duplicate hash check → throws
      .mockResolvedValueOnce({}) // ROLLBACK (in catch)
      .mockResolvedValueOnce({}) // pg_advisory_unlock (in finally)
    ;

    const { artifactService } = await import('../../src/services/artifact.service.js');
    await expect(
      artifactService.createVersion({
        artifactId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        content: Buffer.from('same content'),
        contentType: 'text/markdown',
        createdBy: 'user:test',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('assigns version 1 when no previous versions exist', async () => {
    const fakeVersion = {
      id: 'new-version-id',
      version: 1,
      artifact_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      storage_key: 'artifacts/.../v1/hash.md',
      content_hash: 'abc',
      content_type: 'text/markdown',
      size_bytes: 7,
      created_by: 'user:test',
      created_at: new Date(),
    };

    mockQuery
      .mockResolvedValueOnce({}) // pg_advisory_lock
      .mockResolvedValueOnce({ rows: [{ max: null }] }) // MAX(version) = null → 0
      .mockResolvedValueOnce({ rows: [] }) // no duplicate
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [fakeVersion] }) // INSERT
      .mockResolvedValueOnce({}) // UPDATE artifacts
      .mockResolvedValueOnce({}) // COMMIT
      .mockResolvedValueOnce({}) // pg_advisory_unlock
    ;

    const { artifactService } = await import('../../src/services/artifact.service.js');
    const result = await artifactService.createVersion({
      artifactId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      content: Buffer.from('content'),
      contentType: 'text/markdown',
      createdBy: 'user:test',
    });

    expect(result.version).toBe(1);
  });
});
