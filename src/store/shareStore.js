// Share tokens and approval requests — localStorage backed

const SHARE_KEY = 'forge_share_tokens';
const APPROVAL_KEY = 'forge_approvals';
const SETTINGS_KEY = 'forge_settings';

// ── Utilities ────────────────────────────────────────────────────────────────
function uid(prefix = 'tok') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Settings ─────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  appName: 'Forge Platform',
  allowedEmails: [],
  sharePin: '',
  requirePin: false,
  organizationName: '',
};

export function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch { return DEFAULT_SETTINGS; }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(), ...settings }));
}

// ── Share tokens ──────────────────────────────────────────────────────────────
function loadTokens() {
  try { return JSON.parse(localStorage.getItem(SHARE_KEY) || '[]'); }
  catch { return []; }
}

function persistTokens(tokens) { localStorage.setItem(SHARE_KEY, JSON.stringify(tokens)); }

export function createShareToken(projectId, label) {
  const tokens = loadTokens();
  const token = {
    id: uid('shr'),
    projectId,
    label: label || 'Shared link',
    created_at: new Date().toISOString(),
    views: 0,
  };
  tokens.unshift(token);
  persistTokens(tokens);
  return token;
}

export function getShareToken(tokenId) {
  return loadTokens().find(t => t.id === tokenId) || null;
}

export function incrementShareViews(tokenId) {
  const tokens = loadTokens();
  const t = tokens.find(t => t.id === tokenId);
  if (t) { t.views++; persistTokens(tokens); }
}

export function deleteShareToken(tokenId) {
  persistTokens(loadTokens().filter(t => t.id !== tokenId));
}

export function getSharesForProject(projectId) {
  return loadTokens().filter(t => t.projectId === projectId);
}

// ── Approval requests ─────────────────────────────────────────────────────────
function loadApprovals() {
  try { return JSON.parse(localStorage.getItem(APPROVAL_KEY) || '[]'); }
  catch { return []; }
}

function persistApprovals(approvals) { localStorage.setItem(APPROVAL_KEY, JSON.stringify(approvals)); }

export function createApprovalRequest({ projectId, versionId, versionRef, versionSemver, projectName, requesterNote, reviewerEmail, artifactType }) {
  const approvals = loadApprovals();
  const approval = {
    id: uid('apr'),
    projectId,
    versionId,
    versionRef,
    versionSemver,
    projectName,
    requesterNote: requesterNote || '',
    reviewerEmail,
    artifactType: artifactType || 'prd', // prd | architecture | tasks | all
    status: 'pending', // pending | approved | rejected | changes_requested
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reviewerComment: null,
    modifiedPrompt: null,
  };
  approvals.unshift(approval);
  persistApprovals(approvals);
  return approval;
}

export function loadApprovals_all() { return loadApprovals(); }

export function getApproval(approvalId) {
  return loadApprovals().find(a => a.id === approvalId) || null;
}

export function updateApproval(approvalId, update) {
  const approvals = loadApprovals();
  const idx = approvals.findIndex(a => a.id === approvalId);
  if (idx === -1) return null;
  approvals[idx] = { ...approvals[idx], ...update, updated_at: new Date().toISOString() };
  persistApprovals(approvals);
  return approvals[idx];
}

export function getApprovalsForProject(projectId) {
  return loadApprovals().filter(a => a.projectId === projectId);
}

export function deleteApproval(approvalId) {
  persistApprovals(loadApprovals().filter(a => a.id !== approvalId));
}
