import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Database, GitBranch, GitCommit, Zap, ChevronRight, ExternalLink, Plus, CheckCircle2 } from 'lucide-react';
import { nextVersions } from '../../store/almStore.js';

const BUMP_OPTIONS = [
  { type: 'patch', label: 'Patch', desc: 'Bug fixes, minor tweaks', color: '#10B981' },
  { type: 'minor', label: 'Minor', desc: 'New features, non-breaking', color: '#06B6D4' },
  { type: 'major', label: 'Major', desc: 'Breaking changes, redesign', color: '#8B5CF6' },
];

export default function SaveToALMModal({ data, currentVersion, projects, onSave, onClose }) {
  const existing = projects || [];
  const latestVer = existing[0]?.versions?.slice(-1)[0]?.semver || null;
  const versions = nextVersions(latestVer);

  const [bumpType, setBumpType] = useState('minor');
  const [mode, setMode] = useState(existing.length > 0 ? 'existing' : 'new');
  const [selectedProjectId, setSelectedProjectId] = useState(existing[0]?.id || '');
  const [newProjectName, setNewProjectName] = useState(
    data?.intent?.concept ? data.intent.concept.slice(0, 60) : ''
  );
  const [note, setNote] = useState('');
  const [prUrl, setPrUrl] = useState('');
  const [commitSha, setCommitSha] = useState('');
  const [pipelineUrl, setPipelineUrl] = useState('');
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const links = {
      pr_url: prUrl || null,
      commit_sha: commitSha || null,
      pipeline_url: pipelineUrl || null,
      pipeline_status: pipelineStatus || null,
    };
    onSave({
      bumpType,
      links,
      note,
      mode,
      projectId: mode === 'existing' ? selectedProjectId : null,
      newProjectName: mode === 'new' ? newProjectName : null,
    });
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card w-full max-w-lg overflow-hidden"
      >
        {saved ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <div className="text-lg font-bold text-white">Saved to ALM</div>
            <div className="text-sm text-slate-400 mt-1">Version {versions[bumpType]} created</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-forge-purple" />
                <span className="font-bold text-white">Save to ALM</span>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Project target */}
              {existing.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Project</label>
                  <div className="flex gap-2 mb-3">
                    {['existing', 'new'].map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                          mode === m ? 'border-forge-purple/50 bg-forge-purple/10 text-white' : 'border-slate-700 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {m === 'existing' ? 'Add version to existing' : 'Create new project'}
                      </button>
                    ))}
                  </div>
                  {mode === 'existing' ? (
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-forge-purple/50"
                    >
                      {existing.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.versions.length} version{p.versions.length !== 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Project name"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-forge-purple/50"
                    />
                  )}
                </div>
              )}

              {existing.length === 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Project Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Customer Portal v2"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-forge-purple/50"
                  />
                </div>
              )}

              {/* Version bump */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Version</label>
                <div className="grid grid-cols-3 gap-2">
                  {BUMP_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setBumpType(opt.type)}
                      className={`py-3 px-3 rounded-xl border text-center transition-all ${
                        bumpType === opt.type ? 'border-opacity-60 text-white' : 'border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                      style={bumpType === opt.type ? { borderColor: opt.color + '80', background: opt.color + '12' } : {}}
                    >
                      <div className="text-lg font-black font-mono" style={bumpType === opt.type ? { color: opt.color } : {}}>
                        {versions[opt.type]}
                      </div>
                      <div className="text-xs font-semibold mt-0.5">{opt.label}</div>
                      <div className="text-xs opacity-60 mt-0.5 leading-tight">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Changelog note */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Changelog Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What changed in this version?"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-forge-cyan/50"
                />
              </div>

              {/* GitHub / CI links */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <GitBranch className="w-3 h-3" />
                  Link Artifacts (optional)
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                    <input type="text" value={prUrl} onChange={(e) => setPrUrl(e.target.value)} placeholder="GitHub PR URL" className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-700 outline-none focus:border-forge-purple/40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                    <input type="text" value={commitSha} onChange={(e) => setCommitSha(e.target.value)} placeholder="Commit SHA" className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-700 outline-none focus:border-forge-purple/40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                    <input type="text" value={pipelineUrl} onChange={(e) => setPipelineUrl(e.target.value)} placeholder="CI/CD Pipeline URL" className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-700 outline-none focus:border-forge-purple/40" />
                    <select value={pipelineStatus} onChange={(e) => setPipelineStatus(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-400 outline-none">
                      <option value="">Status</option>
                      <option value="passed">✓ Passed</option>
                      <option value="failed">✗ Failed</option>
                      <option value="running">⟳ Running</option>
                      <option value="pending">○ Pending</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800/60 flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
              <button
                onClick={handleSave}
                className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <Database className="w-4 h-4" />
                Save {versions[bumpType]}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
