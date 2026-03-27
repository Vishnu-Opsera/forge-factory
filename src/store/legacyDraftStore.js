/**
 * Persists legacy analysis drafts to localStorage.
 * Stores only file metadata + server analysis result — never file contents.
 */

const KEY = 'forge_legacy_drafts';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function persist(drafts) {
  try { localStorage.setItem(KEY, JSON.stringify(drafts)); } catch { /* storage full */ }
}

function uid() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * Save a new draft immediately when upload starts.
 * @param {{ method: string, source: string, fileNames: string[], fileCount: number }} opts
 * @returns {string} draft id
 */
export function saveDraft({ method, source, fileNames = [], fileCount = 0 }) {
  const drafts = load();
  const draft = {
    id: uid(),
    createdAt: new Date().toISOString(),
    method,       // 'folder' | 'zip' | 'github'
    source,       // folder name, zip filename, or github URL
    fileNames,    // file name strings only — no content
    fileCount,
    status: 'analyzing',
    analysisData: null,
  };
  drafts.unshift(draft);
  persist(drafts.slice(0, 10)); // keep at most 10 drafts
  return draft.id;
}

/**
 * Update a draft after analysis completes (or mark failed).
 */
export function updateDraft(id, updates) {
  const drafts = load();
  const i = drafts.findIndex(d => d.id === id);
  if (i === -1) return;
  drafts[i] = { ...drafts[i], ...updates };
  persist(drafts);
}

/** Returns all saved drafts, newest first. */
export function loadDrafts() {
  return load();
}

/** Remove a draft by id. */
export function deleteDraft(id) {
  persist(load().filter(d => d.id !== id));
}
