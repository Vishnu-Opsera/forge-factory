/**
 * Syncs a locally-saved version to the artifact versioning backend.
 * Always fire-and-forget — never throws to callers.
 */
import * as api from './versioningApi.js';
import { getProject, patchBackendIds } from '../store/almStore.js';

export async function syncVersionToBackend(projectId, versionId, forgeData) {
  // Re-read fresh from storage so we see any previous patchBackendIds writes
  const project = getProject(projectId);
  const version = project?.versions.find(v => v.id === versionId);
  if (!project || !version) return;

  // 1. Ensure backend project exists
  let backendProjectId = project._backend?.projectId;
  if (!backendProjectId) {
    const bp = await api.createBackendProject(project.name, '');
    backendProjectId = bp.id;
    patchBackendIds(projectId, null, { projectId: backendProjectId });
  }

  const changeSummary = [version.changelog?.summary, ...(version.changelog?.auto_notes ?? [])]
    .filter(Boolean).join(' | ');
  const genMeta = { semver: version.semver, bump_type: version.bump_type, ref: version.ref };
  const artifactResults = {};

  // Artifact type mapping:
  //   prd          → 'requirement'
  //   architecture → 'architecture'
  //   tasks        → 'other'

  // 2. PRD
  if (forgeData.prd) {
    const existingArtifactId = version._backend?.prd?.artifactId;
    const artifactId = existingArtifactId
      ?? (await api.createBackendArtifact(backendProjectId, `${project.name} — PRD`, 'requirement')).id;
    const v = await api.uploadArtifactVersion(artifactId, forgeData.prd, 'text/markdown',
      { changeSummary, generationMetadata: genMeta });
    artifactResults.prd = {
      artifactId,
      versionId:     v.duplicate ? version._backend?.prd?.versionId     : v.id,
      versionNumber: v.duplicate ? version._backend?.prd?.versionNumber  : v.version,
    };
  }

  // 3. Architecture
  if (forgeData.architecture) {
    const existingArtifactId = version._backend?.architecture?.artifactId;
    const artifactId = existingArtifactId
      ?? (await api.createBackendArtifact(backendProjectId, `${project.name} — Architecture`, 'architecture')).id;
    const v = await api.uploadArtifactVersion(artifactId,
      JSON.stringify(forgeData.architecture, null, 2), 'text/plain',
      { changeSummary, generationMetadata: genMeta });
    artifactResults.architecture = {
      artifactId,
      versionId:     v.duplicate ? version._backend?.architecture?.versionId     : v.id,
      versionNumber: v.duplicate ? version._backend?.architecture?.versionNumber  : v.version,
    };
  }

  // 4. Tasks
  if (forgeData.tasks) {
    const existingArtifactId = version._backend?.tasks?.artifactId;
    const artifactId = existingArtifactId
      ?? (await api.createBackendArtifact(backendProjectId, `${project.name} — Tasks`, 'other')).id;
    const v = await api.uploadArtifactVersion(artifactId,
      JSON.stringify(forgeData.tasks, null, 2), 'text/plain',
      { changeSummary, generationMetadata: genMeta });
    artifactResults.tasks = {
      artifactId,
      versionId:     v.duplicate ? version._backend?.tasks?.versionId     : v.id,
      versionNumber: v.duplicate ? version._backend?.tasks?.versionNumber  : v.version,
    };
  }

  // 5. Write backend IDs back to localStorage
  patchBackendIds(projectId, versionId, { projectId: backendProjectId, artifacts: artifactResults });
}
