import { describe, it, expect } from 'vitest';
import { sha256 } from '../../src/utils/hash.js';

describe('sha256', () => {
  it('produces known SHA-256 for empty buffer', () => {
    expect(sha256(Buffer.from(''))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('produces known SHA-256 for "hello"', () => {
    expect(sha256(Buffer.from('hello'))).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('returns a 64-character hex string', () => {
    const result = sha256(Buffer.from('artifact content'));
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different content', () => {
    expect(sha256(Buffer.from('v1'))).not.toBe(sha256(Buffer.from('v2')));
  });
});
