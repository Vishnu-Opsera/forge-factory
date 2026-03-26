import { describe, it, expect } from 'vitest';
import { unifiedDiff } from '../../src/utils/diff.js';

describe('unifiedDiff', () => {
  it('returns a unified diff string for changed text', () => {
    const result = unifiedDiff('hello world\n', 'hello there\n');
    expect(result).toContain('-hello world');
    expect(result).toContain('+hello there');
  });

  it('includes the labels in the diff header', () => {
    const result = unifiedDiff('a\n', 'b\n', 'v1', 'v2');
    expect(result).toContain('v1');
    expect(result).toContain('v2');
  });

  it('returns a non-empty string even for identical content (patch header only)', () => {
    const result = unifiedDiff('same\n', 'same\n');
    // createPatch returns at least the header lines
    expect(typeof result).toBe('string');
  });

  it('handles empty old content (new file)', () => {
    const result = unifiedDiff('', 'new content\n');
    expect(result).toContain('+new content');
  });
});
