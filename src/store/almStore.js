// ── Forge ALM Store ──────────────────────────────────────────────────────────
// Pure localStorage CRUD — no React dependency.

const KEY = 'forge_alm_projects';

// ── Utilities ────────────────────────────────────────────────────────────────
export function slugify(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function bumpVersion(current, type = 'minor') {
  if (!current) return '1.0.0';
  const [maj, min, pat] = current.split('.').map(Number);
  if (type === 'major') return `${maj + 1}.0.0`;
  if (type === 'minor') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

export function nextVersions(current) {
  return {
    patch: bumpVersion(current, 'patch'),
    minor: bumpVersion(current, 'minor'),
    major: bumpVersion(current, 'major'),
  };
}

// ── Feature extraction ────────────────────────────────────────────────────────
export function extractFeatures(data) {
  const seen = new Map();

  // Source 1: intent.core_features
  for (const f of (data?.intent?.core_features || [])) {
    const name = typeof f === 'string' ? f : f?.name;
    const desc = typeof f === 'object' ? (f?.description || '') : '';
    if (name) seen.set(slugify(name), { id: slugify(name), name, description: desc, source: 'intent', priority: f?.priority || 'medium' });
  }

  // Source 2: PRD ## / ### headings under features/requirements sections
  const prd = data?.prd || '';
  let inSection = false;
  for (const line of prd.split('\n')) {
    if (/^#{1,2}\s+(feature|requirement|user stori|epic|mvp)/i.test(line)) { inSection = true; continue; }
    if (/^#{1,2}\s+/.test(line) && inSection) inSection = false;
    if (inSection && /^###\s+/.test(line)) {
      const name = line.replace(/^###\s+/, '').replace(/\*\*/g, '').replace(/\|.*/g, '').trim();
      const id = slugify(name);
      if (name && !seen.has(id)) seen.set(id, { id, name, description: '', source: 'prd', priority: 'medium' });
    }
  }
  return Array.from(seen.values());
}

function flattenTechStack(architecture) {
  if (!architecture || typeof architecture === 'string') return [];
  return Object.values(architecture.tech_stack || {}).flat().filter(Boolean);
}

// ── Diff computation ──────────────────────────────────────────────────────────
export function computeDiff(prevVer, currVer) {
  if (!prevVer) return null;
  const prevMap = new Map((prevVer.extracted?.features || []).map(f => [f.id, f]));
  const currMap = new Map((currVer.extracted?.features || []).map(f => [f.id, f]));
  const prevTech = new Set(prevVer.extracted?.tech_stack_flat || []);
  const currTech = new Set(currVer.extracted?.tech_stack_flat || []);

  return {
    features_added: [...currMap.keys()].filter(id => !prevMap.has(id)).map(id => currMap.get(id).name),
    features_removed: [...prevMap.keys()].filter(id => !currMap.has(id)).map(id => prevMap.get(id).name),
    features_enhanced: [...currMap.keys()].filter(id => prevMap.has(id) && currMap.get(id).description.trim() !== prevMap.get(id).description.trim() && currMap.get(id).description).map(id => currMap.get(id).name),
    tech_added: [...currTech].filter(t => !prevTech.has(t)),
    tech_removed: [...prevTech].filter(t => !currTech.has(t)),
    story_delta: (currVer.extracted?.story_count || 0) - (prevVer.extracted?.story_count || 0),
    points_delta: (currVer.extracted?.total_points || 0) - (prevVer.extracted?.total_points || 0),
  };
}

// ── Story status initialization ───────────────────────────────────────────────
function initStoryStatuses(tasks) {
  const now = new Date().toISOString();
  const statuses = {};
  for (const epic of (tasks?.epics || []))
    for (const story of (epic.stories || []))
      statuses[story.id] = { status: 'not_developed', updated_at: now, notes: null };
  return statuses;
}

// ── Public CRUD ───────────────────────────────────────────────────────────────
export function loadProjects() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

function persist(projects) {
  localStorage.setItem(KEY, JSON.stringify(projects));
  fetch('/api/alm/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projects }) }).catch(() => {});
}

// Local-only persist — used by inbound server sync to avoid echo loop
function persistLocal(projects) { localStorage.setItem(KEY, JSON.stringify(projects)); }

export function updateStoryStatusLocal(projectId, versionId, storyId, status, notes) {
  const projects = loadProjects();
  const ver = projects.find(p => p.id === projectId)?.versions.find(v => v.id === versionId);
  if (!ver) return;
  ver.story_statuses[storyId] = { status, updated_at: new Date().toISOString(), notes: notes || null };
  persistLocal(projects);
}

export function getProject(id) { return loadProjects().find(p => p.id === id) || null; }

export function createProject(name, forgeData) {
  const projects = loadProjects();
  const project = {
    id: uid('proj'),
    name: name || forgeData?.intent?.concept?.slice(0, 60) || 'Untitled Project',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    versions: [],
  };
  projects.unshift(project);
  persist(projects);
  return project;
}

export function saveNewVersion(projectId, forgeData, bumpType, links, note) {
  const projects = loadProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

  const prev = project.versions[project.versions.length - 1] || null;
  const semver = bumpVersion(prev?.semver || null, bumpType || 'minor');
  const features = extractFeatures(forgeData);
  const tech_stack_flat = flattenTechStack(forgeData.architecture);
  const epics = forgeData.tasks?.epics || [];
  const storyCount = epics.reduce((s, e) => s + (e.stories?.length || 0), 0);
  const totalPoints = forgeData.tasks?.total_points || epics.reduce((s, e) => s + (e.stories || []).reduce((ss, st) => ss + (st.story_points || 0), 0), 0);

  // Reference number: REF-NNN (padded, 1-based, per project)
  const refNum = String(project.versions.length + 1).padStart(3, '0');
  const ref = `REF-${refNum}`;

  const ver = {
    id: uid('ver'),
    ref,                              // e.g. "REF-001"
    semver,
    bump_type: bumpType || 'minor',
    created_at: new Date().toISOString(),
    forge_mode: forgeData.mode || 'new_product',
    artifacts: { prd: forgeData.prd || null, architecture: forgeData.architecture || null, tasks: forgeData.tasks || null, intent: forgeData.intent || null },
    extracted: { features, tech_stack_flat, story_count: storyCount, epic_count: epics.length, total_points: totalPoints, complexity: forgeData.intent?.complexity || 'medium', estimated_timeline: forgeData.intent?.estimated_timeline || '' },
    links: { pr_url: links?.pr_url || null, commit_sha: links?.commit_sha || null, commit_url: links?.commit_url || null, pipeline_url: links?.pipeline_url || null, pipeline_status: links?.pipeline_status || null, pr_created_at: links?.pr_created_at || null, pr_merged_at: links?.pr_merged_at || null },
    changelog: { summary: note || '', auto_notes: [] },
    story_statuses: initStoryStatuses(forgeData.tasks),
    diff_from_previous: null,
  };

  ver.diff_from_previous = computeDiff(prev, ver);

  const d = ver.diff_from_previous;
  if (!d) {
    ver.changelog.auto_notes.push(`Initial release — ${features.length} features, ${storyCount} stories`);
  } else {
    if (d.features_added.length) ver.changelog.auto_notes.push(`+${d.features_added.length} feature${d.features_added.length > 1 ? 's' : ''}: ${d.features_added.slice(0, 2).join(', ')}${d.features_added.length > 2 ? '…' : ''}`);
    if (d.features_removed.length) ver.changelog.auto_notes.push(`-${d.features_removed.length} feature${d.features_removed.length > 1 ? 's' : ''}: ${d.features_removed.slice(0, 2).join(', ')}${d.features_removed.length > 2 ? '…' : ''}`);
    if (d.features_enhanced.length) ver.changelog.auto_notes.push(`~${d.features_enhanced.length} enhanced: ${d.features_enhanced.slice(0, 2).join(', ')}`);
    if (d.tech_added.length) ver.changelog.auto_notes.push(`Adopted: ${d.tech_added.slice(0, 3).join(', ')}`);
    if (d.tech_removed.length) ver.changelog.auto_notes.push(`Deprecated: ${d.tech_removed.slice(0, 3).join(', ')}`);
    if (d.story_delta !== 0) ver.changelog.auto_notes.push(`${d.story_delta > 0 ? '+' : ''}${d.story_delta} stories (${d.points_delta > 0 ? '+' : ''}${d.points_delta} pts)`);
  }

  project.versions.push(ver);
  project.updated_at = new Date().toISOString();
  persist(projects);
  return { project, version: ver };
}

export function updateStoryStatus(projectId, versionId, storyId, status, notes) {
  const projects = loadProjects();
  const ver = projects.find(p => p.id === projectId)?.versions.find(v => v.id === versionId);
  if (!ver) return;
  ver.story_statuses[storyId] = { status, updated_at: new Date().toISOString(), notes: notes || null };
  persist(projects);
}

export function updateVersionLinks(projectId, versionId, links) {
  const projects = loadProjects();
  const ver = projects.find(p => p.id === projectId)?.versions.find(v => v.id === versionId);
  if (!ver) return;
  ver.links = { ...ver.links, ...links };
  persist(projects);
}

export function updateProjectName(projectId, name) {
  const projects = loadProjects();
  const proj = projects.find(p => p.id === projectId);
  if (proj) { proj.name = name; persist(projects); }
}

export function deleteProject(projectId) {
  persist(loadProjects().filter(p => p.id !== projectId));
}

/** Look up a version by REF-NNN across all projects */
export function lookupByRef(refInput) {
  const normalized = refInput?.toString().trim().toUpperCase().replace(/^#/, '');
  const asRef = normalized.startsWith('REF-') ? normalized : `REF-${normalized.padStart(3, '0')}`;
  for (const project of loadProjects()) {
    for (const version of project.versions) {
      if (version.ref === asRef) return { project, version };
    }
  }
  return null;
}

/** Get the latest version of the most-recently-updated project */
export function getLatestVersion() {
  const projects = loadProjects();
  if (!projects.length) return null;
  const project = projects[0]; // projects are stored newest-first
  const version = project.versions[project.versions.length - 1];
  return version ? { project, version } : null;
}

// ── Insights ──────────────────────────────────────────────────────────────────
export function getInsights(project) {
  if (!project?.versions.length) return null;
  const vs = project.versions;

  const featureVelocity = vs.map(v => ({
    semver: v.semver,
    added: v.diff_from_previous?.features_added?.length ?? v.extracted?.features?.length ?? 0,
    removed: v.diff_from_previous?.features_removed?.length ?? 0,
    enhanced: v.diff_from_previous?.features_enhanced?.length ?? 0,
    total: v.extracted?.features?.length ?? 0,
  }));

  const storyCompletion = vs.map(v => {
    const all = Object.values(v.story_statuses || {});
    const removed = all.filter(s => s.status === 'removed').length;
    const completed = all.filter(s => s.status === 'completed').length;
    const effective = all.length - removed;
    return { semver: v.semver, total: all.length, completed, removed, rate: effective > 0 ? Math.round((completed / effective) * 100) : 0 };
  });

  const timeToPR = vs.filter(v => v.links?.pr_created_at).map(v => ({
    semver: v.semver,
    hours: ((new Date(v.links.pr_created_at) - new Date(v.created_at)) / 3600000).toFixed(1),
  }));
  const avgTimeToPR = timeToPR.length ? (timeToPR.reduce((a, b) => a + +b.hours, 0) / timeToPR.length).toFixed(1) : null;

  const archEvolution = vs.map(v => ({
    semver: v.semver,
    tech_added: v.diff_from_previous?.tech_added || [],
    tech_removed: v.diff_from_previous?.tech_removed || [],
  })).filter(v => v.tech_added.length || v.tech_removed.length);

  // Collect all stories across all versions
  const allStories = [];
  for (const v of vs) {
    for (const epic of (v.artifacts?.tasks?.epics || [])) {
      for (const story of (epic.stories || [])) {
        const st = v.story_statuses?.[story.id];
        allStories.push({ ...story, epic_title: epic.title, epic_color: epic.color, version_semver: v.semver, version_id: v.id, status: st?.status || 'not_developed', status_notes: st?.notes });
      }
    }
  }

  return {
    featureVelocity,
    storyCompletion,
    timeToPR,
    avgTimeToPR,
    archEvolution,
    totalVersions: vs.length,
    totalFeatures: vs[vs.length - 1]?.extracted?.features?.length || 0,
    totalStories: allStories.length,
    completedStories: allStories.filter(s => s.status === 'completed').length,
    inProgressStories: allStories.filter(s => s.status === 'in_progress').length,
    notDevelopedStories: allStories.filter(s => s.status === 'not_developed'),
    removedStories: allStories.filter(s => s.status === 'removed'),
    latestPoints: vs[vs.length - 1]?.extracted?.total_points || 0,
  };
}
