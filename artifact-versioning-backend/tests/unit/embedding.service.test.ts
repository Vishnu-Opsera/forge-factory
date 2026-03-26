import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock OpenAI before importing the service
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: new Array(1536).fill(0.1) }],
        }),
      },
    })),
  };
});

// Mock the DB to avoid real connections
vi.mock('../../src/db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

// Mock env
vi.mock('../../src/config/env.js', () => ({
  env: { OPENAI_API_KEY: 'test-key', NODE_ENV: 'test' },
}));

import { embeddingService } from '../../src/services/embedding.service.js';

describe('embeddingService', () => {
  describe('generateAndStore', () => {
    it('does not throw on success', async () => {
      await expect(
        embeddingService.generateAndStore('version-uuid', 'Some artifact content'),
      ).resolves.toBeUndefined();
    });

    it('swallows errors and does not throw', async () => {
      const { default: OpenAI } = await import('openai');
      const instance = (OpenAI as ReturnType<typeof vi.fn>).mock.results[0].value;
      instance.embeddings.create.mockRejectedValueOnce(new Error('OpenAI down'));

      await expect(
        embeddingService.generateAndStore('version-uuid', 'content'),
      ).resolves.toBeUndefined();
    });

    it('truncates content longer than 8000 characters', async () => {
      const { default: OpenAI } = await import('openai');
      const instance = (OpenAI as ReturnType<typeof vi.fn>).mock.results[0].value;
      const longText = 'x'.repeat(10_000);

      await embeddingService.generateAndStore('v1', longText);

      const call = instance.embeddings.create.mock.calls.at(-1)[0];
      expect(call.input.length).toBeLessThanOrEqual(8000);
    });
  });
});
