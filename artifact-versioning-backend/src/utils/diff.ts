import { createPatch } from 'diff';

/**
 * Return a unified diff string between two text contents.
 * Returns empty string if inputs are identical.
 */
export function unifiedDiff(
  oldContent: string,
  newContent: string,
  oldLabel = 'previous',
  newLabel = 'current',
): string {
  return createPatch(oldLabel, oldContent, newContent, oldLabel, newLabel);
}
