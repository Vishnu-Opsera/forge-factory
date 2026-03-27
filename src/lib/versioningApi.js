/**
 * Thin fetch wrapper for the artifact-versioning-backend (/api/v1).
 * All functions throw on network or HTTP errors — callers wrap in try/catch.
 */
import { getSession } from '../store/authStore.js';

const BASE = '/api/v1';

function authHeaders() {
  const session = getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.userId ? { 'X-Forge-User-Id': session.userId } : {}),
  };
}

async function parseResponse(res) {
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok) {
    throw Object.assign(
      new Error(json?.detail ?? json?.title ?? text ?? 'Request failed'),
      { status: res.status, body: json },
    );
  }
  return json ?? text;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function createBackendProject(name, description = '') {
  const res = await fetch(`${BASE}/projects`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, description }),
  });
  return parseResponse(res);
}

export async function getBackendProject(backendProjectId) {
  const res = await fetch(`${BASE}/projects/${backendProjectId}`, {
    headers: authHeaders(),
  });
  return parseResponse(res);
}

// ── Artifacts ─────────────────────────────────────────────────────────────────

export async function createBackendArtifact(backendProjectId, name, type) {
  const res = await fetch(`${BASE}/artifacts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ projectId: backendProjectId, name, type }),
  });
  return parseResponse(res);
}

// ── Versions ──────────────────────────────────────────────────────────────────

/**
 * Upload a new artifact version.
 * content: string or ArrayBuffer
 * contentType: MIME string e.g. 'text/markdown', 'application/json'
 * Returns { duplicate: true } on 409 — never throws for duplicates.
 */
export async function uploadArtifactVersion(artifactId, content, contentType, options = {}) {
  const { changeSummary, generationMetadata } = options;
  const session = getSession();

  const params = new URLSearchParams({
    created_by: session?.userId ?? 'anonymous',
  });
  if (changeSummary) params.set('change_summary', changeSummary);
  if (generationMetadata) params.set('generation_metadata', JSON.stringify(generationMetadata));

  const body = typeof content === 'string'
    ? new TextEncoder().encode(content)
    : content;

  const res = await fetch(`${BASE}/artifacts/${artifactId}/versions?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      ...(session?.userId ? { 'X-Forge-User-Id': session.userId } : {}),
    },
    body,
  });

  if (res.status === 409) {
    const body = await res.json().catch(() => ({}));
    return { duplicate: true, detail: body.detail };
  }

  return parseResponse(res);
}

export async function getVersionWithDownloadUrl(artifactId, versionNumber) {
  const res = await fetch(`${BASE}/artifacts/${artifactId}/versions/${versionNumber}`, {
    headers: authHeaders(),
  });
  return parseResponse(res);
}

export async function fetchTextDiff(artifactId, versionNumber) {
  const session = getSession();
  const res = await fetch(
    `${BASE}/artifacts/${artifactId}/versions/${versionNumber}/diff`,
    {
      headers: {
        Accept: 'text/plain',
        ...(session?.userId ? { 'X-Forge-User-Id': session.userId } : {}),
      },
    },
  );
  if (!res.ok) throw Object.assign(new Error('Diff unavailable'), { status: res.status });
  return res.text();
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function textSearch(query, options = {}) {
  const { projectId, type, limit = 20 } = options;
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (projectId) params.set('project_id', projectId);
  if (type) params.set('type', type);
  const res = await fetch(`${BASE}/search/text?${params}`, { headers: authHeaders() });
  return parseResponse(res);
}

export async function semanticSearch(query, options = {}) {
  const { projectId, type, limit = 10 } = options;
  const body = { query, limit };
  if (projectId) body.project_id = projectId;
  if (type) body.type = type;
  const res = await fetch(`${BASE}/search/semantic`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function checkBackendHealth() {
  try {
    const res = await fetch('/health', { signal: AbortSignal.timeout(3000) });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}
