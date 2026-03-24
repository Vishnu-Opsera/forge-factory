import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, MessageSquare, Zap, FileText, Layers,
  CheckSquare, AlertCircle, RefreshCw, ArrowLeft, Send,
} from 'lucide-react';
import { getApproval, updateApproval } from '../store/shareStore.js';
import { getProject } from '../store/almStore.js';
import { loadSettings } from '../store/shareStore.js';

const PRDTab = lazy(() => import('./Results/PRDTab.jsx'));
const ArchitectureTab = lazy(() => import('./Results/ArchitectureTab.jsx'));
const TasksTab = lazy(() => import('./Results/TasksTab.jsx'));

const STATUS_CONFIG = {
  pending:           { label: 'Pending Review',     color: '#F59E0B' },
  approved:          { label: 'Approved',            color: '#10B981' },
  rejected:          { label: 'Rejected',            color: '#EF4444' },
  changes_requested: { label: 'Changes Requested',  color: '#06B6D4' },
};

export default function ApprovalReview({ approvalId, onBack }) {
  const [approval, setApproval] = useState(null);
  const [project, setProject] = useState(null);
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [modifiedPrompt, setModifiedPrompt] = useState('');
  const [action, setAction] = useState(null); // 'approve' | 'reject' | 'changes'
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const settings = loadSettings();

  useEffect(() => {
    const a = getApproval(approvalId);
    if (!a) { setError('Approval request not found or has been deleted.'); setLoading(false); return; }
    const p = getProject(a.projectId);
    if (!p) { setError('Project not found.'); setLoading(false); return; }
    const v = p.versions.find(ver => ver.id === a.versionId);
    if (!v) { setError('Version not found.'); setLoading(false); return; }
    setApproval(a);
    setProject(p);
    setVersion(v);
    if (a.reviewerComment) setComment(a.reviewerComment);
    if (a.modifiedPrompt) setModifiedPrompt(a.modifiedPrompt);
    if (a.status !== 'pending') setDone(true);
    setLoading(false);
  }, [approvalId]);

  const submit = () => {
    if (!action) return;
    setSubmitting(true);
    const statusMap = { approve: 'approved', reject: 'rejected', changes: 'changes_requested' };
    updateApproval(approvalId, {
      status: statusMap[action],
      reviewerComment: comment || null,
      modifiedPrompt: modifiedPrompt || null,
    });
    setTimeout(() => { setSubmitting(false); setDone(true); setApproval(getApproval(approvalId)); }, 600);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-forge-purple animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <div className="text-white font-bold text-xl">Request Not Found</div>
        <div className="text-slate-500 text-sm max-w-sm">{error}</div>
        <button onClick={onBack} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Forge
        </button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[approval.status] || STATUS_CONFIG.pending;

  const artifactTabs = [];
  if (approval.artifactType === 'all' || approval.artifactType === 'prd') artifactTabs.push({ id: 'prd', label: 'PRD', icon: FileText });
  if (approval.artifactType === 'all' || approval.artifactType === 'architecture') artifactTabs.push({ id: 'architecture', label: 'Architecture', icon: Layers });
  if (approval.artifactType === 'all' || approval.artifactType === 'tasks') artifactTabs.push({ id: 'tasks', label: 'Tasks', icon: CheckSquare });

  const [activeTab, setActiveTab] = useState(artifactTabs[0]?.id || 'prd');

  return (
    <div className="min-h-screen bg-forge-bg noise-bg">
      <div className="orb orb-1" /><div className="orb orb-2" />

      {/* Header */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-800/50">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-forge-purple to-forge-cyan flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold tracking-tight">{settings.appName}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-mono border" style={{ color: cfg.color, background: cfg.color + '15', borderColor: cfg.color + '30' }}>
            {cfg.label}
          </span>
        </div>
        <div className="w-20" />
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Request info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <span className="font-mono font-black text-forge-purple">{approval.versionRef}</span>
                <span className="text-slate-500 text-sm">v{approval.versionSemver}</span>
                <span className="text-slate-400 text-sm font-medium">{approval.projectName}</span>
              </div>
              <div className="text-xs text-slate-500">
                Review request sent to <span className="text-slate-300">{approval.reviewerEmail}</span>
                {' · '}{new Date(approval.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              {approval.requesterNote && (
                <div className="mt-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
                  <div className="text-xs text-slate-500 mb-1">Note from requester</div>
                  <div className="text-sm text-slate-300 leading-relaxed">{approval.requesterNote}</div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Artifact viewer */}
        {artifactTabs.length > 1 && (
          <div className="flex gap-1">
            {artifactTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  activeTab === t.id ? 'tab-active' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Suspense fallback={<div className="text-slate-600 text-sm p-6">Loading artifact…</div>}>
            {activeTab === 'prd' && <PRDTab prd={version.artifacts?.prd} />}
            {activeTab === 'architecture' && <ArchitectureTab data={version.artifacts?.architecture} />}
            {activeTab === 'tasks' && <TasksTab data={version.artifacts?.tasks} />}
          </Suspense>
        </motion.div>

        {/* Review actions */}
        {!done ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
            <div className="font-semibold text-white text-sm">Your Review</div>

            {/* Action selection */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'approve', label: 'Approve', icon: CheckCircle2, color: '#10B981' },
                { id: 'reject', label: 'Reject', icon: XCircle, color: '#EF4444' },
                { id: 'changes', label: 'Request Changes', icon: MessageSquare, color: '#06B6D4' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAction(opt.id)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all"
                  style={{
                    borderColor: action === opt.id ? opt.color + '60' : 'rgba(148,163,184,0.1)',
                    background: action === opt.id ? opt.color + '15' : 'transparent',
                    color: action === opt.id ? opt.color : '#64748b',
                  }}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Comment */}
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Comment (optional)</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add context, concerns, or specific feedback..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-forge-purple/50 placeholder-slate-600 resize-none"
              />
            </div>

            {/* Modified prompt — shown when requesting changes */}
            {action === 'changes' && (
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Modified / Corrected Requirements</label>
                <textarea
                  value={modifiedPrompt}
                  onChange={e => setModifiedPrompt(e.target.value)}
                  placeholder="Paste or write your modified requirements here. The engineering team can use this as a new Forge prompt..."
                  rows={6}
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-forge-cyan/50 placeholder-slate-600 resize-none font-mono leading-relaxed"
                />
                <p className="text-xs text-slate-600 mt-1.5">This will be sent back to the engineering team to re-forge with your modifications.</p>
              </div>
            )}

            <button
              onClick={submit}
              disabled={!action || submitting}
              className="btn-primary py-3 px-6 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: cfg.color + '20', border: `1px solid ${cfg.color}40` }}>
              {approval.status === 'approved' && <CheckCircle2 className="w-6 h-6" style={{ color: cfg.color }} />}
              {approval.status === 'rejected' && <XCircle className="w-6 h-6" style={{ color: cfg.color }} />}
              {approval.status === 'changes_requested' && <MessageSquare className="w-6 h-6" style={{ color: cfg.color }} />}
            </div>
            <div className="font-bold text-white mb-1">{cfg.label}</div>
            <div className="text-xs text-slate-500">Review submitted on {new Date(approval.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            {approval.reviewerComment && (
              <div className="mt-3 text-sm text-slate-400 bg-slate-900/60 rounded-xl p-3 text-left">{approval.reviewerComment}</div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
