import { useState, useCallback } from 'react';
import * as store from '../store/almStore.js';

export function useALM() {
  const [projects, setProjects] = useState(() => store.loadProjects());
  const [activeProjectId, setActiveProjectId] = useState(() => store.loadProjects()[0]?.id || null);

  const refresh = useCallback(() => setProjects(store.loadProjects()), []);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || null;
  const versions = activeProject?.versions || [];
  const insights = activeProject ? store.getInsights(activeProject) : null;

  const saveToALM = useCallback((forgeData, forgeMode, bumpType, links, note, newProjectName) => {
    let proj = projects[0];
    if (newProjectName || !proj) {
      proj = store.createProject(newProjectName || null, forgeData);
    }
    const result = store.saveNewVersion(proj.id, { ...forgeData, mode: forgeMode }, bumpType, links, note);
    refresh();
    setActiveProjectId(proj.id);
    return result;
  }, [projects, refresh]);

  const saveToProject = useCallback((projectId, forgeData, forgeMode, bumpType, links, note) => {
    const result = store.saveNewVersion(projectId, { ...forgeData, mode: forgeMode }, bumpType, links, note);
    refresh();
    setActiveProjectId(projectId);
    return result;
  }, [refresh]);

  const updateStory = useCallback((versionId, storyId, status, notes) => {
    if (!activeProject) return;
    store.updateStoryStatus(activeProject.id, versionId, storyId, status, notes);
    refresh();
  }, [activeProject, refresh]);

  const updateLinks = useCallback((versionId, links) => {
    if (!activeProject) return;
    store.updateVersionLinks(activeProject.id, versionId, links);
    refresh();
  }, [activeProject, refresh]);

  const renameProject = useCallback((projectId, name) => {
    store.updateProjectName(projectId, name);
    refresh();
  }, [refresh]);

  const removeProject = useCallback((projectId) => {
    store.deleteProject(projectId);
    const remaining = store.loadProjects();
    setActiveProjectId(remaining[0]?.id || null);
    refresh();
  }, [refresh]);

  return {
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    versions,
    insights,
    saveToALM,
    saveToProject,
    updateStory,
    updateLinks,
    renameProject,
    removeProject,
    refresh,
    // re-export pure helpers for convenience
    nextVersions: (current) => store.nextVersions(current),
    computeDiff: store.computeDiff,
  };
}
