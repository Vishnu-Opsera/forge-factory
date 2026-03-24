import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, GitCommit, Zap, ExternalLink, Edit3, Check, X } from 'lucide-react';

const PIPELINE_COLORS = { passed: '#10B981', failed: '#EF4444', running: '#F59E0B', pending: '#94A3B8' };
const PIPELINE_LABELS = { passed: '✓ Passed', failed: '✗ Failed', running: '⟳ Running', pending: '○ Pending' };

export function LinkChip({ href, icon: Icon, label, color }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
      style={{ color, borderColor: color + '40', background: color + '10' }}
    >
      <Icon className="w-3 h-3" />
      {label}
      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
    </a>
  );
}

export function PipelineStatusBadge({ status }) {
  if (!status) return null;
  const color = PIPELINE_COLORS[status] || '#94A3B8';
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full border font-semibold"
      style={{ color, borderColor: color + '40', background: color + '10' }}
    >
      {PIPELINE_LABELS[status] || status}
    </span>
  );
}

export default function LinkPanel({ links, versionId, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    pr_url: links?.pr_url || '',
    commit_sha: links?.commit_sha || '',
    pipeline_url: links?.pipeline_url || '',
    pipeline_status: links?.pipeline_status || '',
    pr_created_at: links?.pr_created_at || '',
    pr_merged_at: links?.pr_merged_at || '',
  });

  const hasLinks = links?.pr_url || links?.commit_sha || links?.pipeline_url;

  const handleSave = () => {
    onSave?.(form);
    setEditing(false);
  };

  return (
    <div>
      {!editing && (
        <div className="flex flex-wrap items-center gap-2">
          <LinkChip href={links?.pr_url} icon={GitBranch} label={`PR${links?.pr_url?.match(/\/(\d+)$/)?.[1] ? ' #' + links.pr_url.match(/\/(\d+)$/)[1] : ''}`} color="#8B5CF6" />
          <LinkChip href={links?.commit_url || (links?.commit_sha ? `#${links.commit_sha}` : null)} icon={GitCommit} label={links?.commit_sha?.slice(0, 7) || null} color="#06B6D4" />
          <LinkChip href={links?.pipeline_url} icon={Zap} label="Pipeline" color="#F59E0B" />
          <PipelineStatusBadge status={links?.pipeline_status} />
          {onSave && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              {hasLinks ? 'Edit' : 'Add links'}
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {[
              { key: 'pr_url', icon: GitBranch, placeholder: 'GitHub PR URL' },
              { key: 'commit_sha', icon: GitCommit, placeholder: 'Commit SHA' },
              { key: 'pipeline_url', icon: Zap, placeholder: 'Pipeline URL' },
            ].map(({ key, icon: Icon, placeholder }) => (
              <div key={key} className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-700 outline-none focus:border-forge-purple/40"
                />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 w-3.5" />
              <select value={form.pipeline_status} onChange={(e) => setForm(f => ({ ...f, pipeline_status: e.target.value }))} className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-400 outline-none">
                <option value="">Pipeline status</option>
                <option value="passed">✓ Passed</option>
                <option value="failed">✗ Failed</option>
                <option value="running">⟳ Running</option>
                <option value="pending">○ Pending</option>
              </select>
              <button onClick={handleSave} className="ml-auto flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-slate-600 hover:text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
