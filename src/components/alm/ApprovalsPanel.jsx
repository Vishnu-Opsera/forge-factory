import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Clock, CheckCircle2, XCircle, MessageSquare, Copy, Check,
  ChevronDown, ChevronUp, Trash2, AlertCircle, Mail, Link2, RefreshCw,
} from 'lucide-react';
import {
  createApprovalRequest, loadApprovals_all, updateApproval, deleteApproval,
  getApprovalsForProject,
} from '../../store/shareStore.js';
import { getProject } from '../../store/almStore.js';

const STATUS_CONFIG = {
  pending:           { label: 'Pending',            color: '#F59E0B', icon: Clock },
  approved:          { label: 'Approved',            color: '#F5A83E', icon: CheckCircle2 },
  rejected:          { label: 'Rejected',            color: '#EF4444', icon: XCircle },
  changes_requested: { label: 'Changes Requested',  color: '#C2B0F6', icon: MessageSquare },
};

function ApprovalCard({ approval, onDelete, baseUrl }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const approvalUrl = `${baseUrl}?approve=${approval.id}`;
  const cfg = STATUS_CONFIG[approval.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  const copy = () => {
    navigator.clipboard.writeText(approvalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.color + '15', border: `1px solid ${cfg.color}30` }}>
          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-mono text-sm font-bold text-white">{approval.versionRef}</span>
            <span className="text-xs text-slate-500">v{approval.versionSemver}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: cfg.color, background: cfg.color + '15', border: `1px solid ${cfg.color}30` }}>
              {cfg.label}
            </span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
            <Mail className="w-3 h-3" />
            {approval.reviewerEmail}
            <span className="text-slate-700">·</span>
            {new Date(approval.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={copy} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
            {copied ? <Check className="w-3.5 h-3.5 text-[#F5A83E]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onDelete(approval.id)} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-3">
            {/* Share link */}
            <div>
              <div className="text-xs text-slate-500 mb-1.5 flex items-center gap-1.5"><Link2 className="w-3 h-3" />Approval Link</div>
              <div className="flex items-center gap-2 bg-slate-900 rounded-xl px-3 py-2 border border-slate-700/60">
                <span className="text-xs font-mono text-slate-400 truncate flex-1">{approvalUrl}</span>
                <button onClick={copy} className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5 text-[#F5A83E]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {approval.requesterNote && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Request Note</div>
                <div className="text-xs text-slate-400 bg-slate-900/60 rounded-xl p-3">{approval.requesterNote}</div>
              </div>
            )}
            {approval.reviewerComment && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Reviewer Comment</div>
                <div className="text-xs bg-slate-900/60 rounded-xl p-3" style={{ color: STATUS_CONFIG[approval.status]?.color || '#94a3b8' }}>{approval.reviewerComment}</div>
              </div>
            )}
            {approval.modifiedPrompt && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Modified Requirements from Reviewer</div>
                <pre className="text-xs text-slate-300 bg-slate-900/60 rounded-xl p-3 whitespace-pre-wrap font-sans leading-relaxed">{approval.modifiedPrompt}</pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ApprovalsPanel({ versions, projectId, projectName }) {
  const [approvals, setApprovals] = useState(() => getApprovalsForProject(projectId));
  const [form, setForm] = useState({ email: '', versionId: '', note: '', artifactType: 'prd' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const baseUrl = window.location.origin + window.location.pathname;
  const latestVersion = versions[versions.length - 1];

  const refreshApprovals = () => setApprovals(getApprovalsForProject(projectId));

  const handleSend = () => {
    if (!form.email.trim() || !form.versionId) { setError('Please enter an email and select a version.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) { setError('Please enter a valid email address.'); return; }
    setError('');
    setSending(true);
    const ver = versions.find(v => v.id === form.versionId);
    createApprovalRequest({
      projectId,
      versionId: form.versionId,
      versionRef: ver?.ref || 'REF-???',
      versionSemver: ver?.semver || '?',
      projectName,
      requesterNote: form.note,
      reviewerEmail: form.email.trim(),
      artifactType: form.artifactType,
    });
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setForm({ email: '', versionId: '', note: '', artifactType: 'prd' });
      refreshApprovals();
      setTimeout(() => setSent(false), 3000);
    }, 600);
  };

  const handleDelete = (id) => {
    deleteApproval(id);
    refreshApprovals();
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Send approval request */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4 text-forge-purple" />
          <span className="font-semibold text-white text-sm">Request Approval</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Reviewer Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="stakeholder@company.com"
              className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-forge-purple/50 placeholder-slate-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Version to Review</label>
              <select
                value={form.versionId}
                onChange={e => setForm(f => ({ ...f, versionId: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-forge-purple/50"
              >
                <option value="">Select version</option>
                {[...versions].reverse().map(v => (
                  <option key={v.id} value={v.id}>{v.ref} — v{v.semver}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Artifact Type</label>
              <select
                value={form.artifactType}
                onChange={e => setForm(f => ({ ...f, artifactType: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-forge-purple/50"
              >
                <option value="prd">PRD Document</option>
                <option value="architecture">Architecture</option>
                <option value="tasks">Sprint Tasks</option>
                <option value="all">All Artifacts</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Note to Reviewer (optional)</label>
            <textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Please review the PRD for the new authentication module..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-forge-purple/50 placeholder-slate-600 resize-none"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />{error}
            </div>
          )}
          <button
            onClick={handleSend}
            disabled={sending || !form.email || !form.versionId}
            className="btn-primary text-sm py-2.5 px-5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {sending ? 'Generating link…' : sent ? 'Link Created!' : 'Generate Approval Link'}
          </button>
          <p className="text-xs text-slate-600">
            An approval link will be generated. Share it with the reviewer — they can approve, reject, or suggest modifications without needing to log in.
          </p>
        </div>
      </div>

      {/* Existing approvals */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Approval Requests ({approvals.length})</span>
        <button onClick={refreshApprovals} className="text-slate-500 hover:text-white transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {approvals.length === 0 ? (
        <div className="text-center py-8 text-slate-600 text-sm">No approval requests yet.</div>
      ) : (
        <div className="space-y-3">
          {approvals.map(a => (
            <ApprovalCard key={a.id} approval={a} onDelete={handleDelete} baseUrl={baseUrl} />
          ))}
        </div>
      )}
    </div>
  );
}
