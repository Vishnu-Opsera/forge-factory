import { describe, it, expect } from 'vitest';
import { buildStorageKey, extForMime } from '../../src/storage/keys.js';

describe('extForMime', () => {
  it('maps text/markdown to md', () => expect(extForMime('text/markdown')).toBe('md'));
  it('maps image/svg+xml to svg', () => expect(extForMime('image/svg+xml')).toBe('svg'));
  it('maps application/json to json', () => expect(extForMime('application/json')).toBe('json'));
  it('falls back to bin for unknown types', () => expect(extForMime('application/x-custom')).toBe('bin'));
  it('handles charset suffix correctly', () => expect(extForMime('text/plain; charset=utf-8')).toBe('txt'));
});

describe('buildStorageKey', () => {
  const artifactId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  it('matches the documented key format', () => {
    const key = buildStorageKey(artifactId, 3, 'a3f1d2e4abcdef01', 'text/markdown');
    expect(key).toBe(`artifacts/${artifactId}/v3/a3f1d2e4abcdef01.md`);
  });

  it('uses svg extension for SVG content', () => {
    const key = buildStorageKey(artifactId, 4, '9b2c3a1f', 'image/svg+xml');
    expect(key).toBe(`artifacts/${artifactId}/v4/9b2c3a1f.svg`);
  });

  it('version number is reflected in the path', () => {
    const key = buildStorageKey(artifactId, 10, 'abc', 'text/plain');
    expect(key).toContain('/v10/');
  });

  it('artifact id is reflected in the path', () => {
    const key = buildStorageKey(artifactId, 1, 'hash', 'application/json');
    expect(key).toContain(artifactId);
  });
});
