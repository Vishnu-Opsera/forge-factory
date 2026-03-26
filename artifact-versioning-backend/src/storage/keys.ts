import path from 'path';

const MIME_TO_EXT: Record<string, string> = {
  'text/markdown': 'md',
  'text/plain': 'txt',
  'image/svg+xml': 'svg',
  'application/json': 'json',
  'text/html': 'html',
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

export function extForMime(contentType: string): string {
  const base = contentType.split(';')[0].trim().toLowerCase();
  return MIME_TO_EXT[base] ?? 'bin';
}

/**
 * artifacts/{artifact_id}/v{version}/{content_hash}.{ext}
 */
export function buildStorageKey(
  artifactId: string,
  version: number,
  contentHash: string,
  contentType: string,
): string {
  const ext = extForMime(contentType);
  return `artifacts/${artifactId}/v${version}/${contentHash}.${ext}`;
}

export function artifactPrefix(artifactId: string): string {
  return `artifacts/${artifactId}/`;
}
