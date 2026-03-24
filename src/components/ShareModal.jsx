import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Link2, Copy, Check, Plus, Trash2, Eye } from 'lucide-react';
import { createShareToken, getSharesForProject, deleteShareToken } from '../store/shareStore.js';

export default function ShareModal({ projectId, projectName, onClose }) {
  const [shares, setShares] = useState(() => getSharesForProject(projectId));
  const [label, setLabel] = useState('');
  const [copied, setCopied] = useState(null);
  const baseUrl = window.location.origin + window.location.pathname;

  const refresh = () => setShares(getSharesForProject(projectId));

  const generate = () => {
    createShareToken(projectId, label.trim() || `Shared ${new Date().toLocaleDateString()}`);
    setLabel('');
    refresh();
  };

  const copy = (tokenId) => {
    const url = `${baseUrl}?share=${tokenId}`;
    navigator.clipboard.writeText(url);
    setCopied(tokenId);
    setTimeout(() => setCopied(null), 1500);
  };

  const remove = (tokenId) => {
    deleteShareToken(tokenId);
    refresh();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-forge-bg border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-forge-cyan" />
            <span className="font-semibold text-white text-sm">Share "{projectName}"</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500">
            Generate a read-only link for this project. Anyone with the link can view the ALM dashboard for this project without needing to log in.
          </p>

          {/* Generate */}
          <div className="flex gap-2">
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder="Label (e.g. Client Review, Sprint Demo)"
              className="flex-1 bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-forge-cyan/50 placeholder-slate-600"
            />
            <button onClick={generate} className="btn-primary text-sm px-4 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Create
            </button>
          </div>

          {/* Existing share links */}
          {shares.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Links</div>
              {shares.map(s => {
                const url = `${baseUrl}?share=${s.id}`;
                return (
                  <div key={s.id} className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{s.label}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-slate-500 truncate">{url}</span>
                        {s.views > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-600 flex-shrink-0">
                            <Eye className="w-3 h-3" />{s.views}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => copy(s.id)} className="p-1.5 text-slate-500 hover:text-white transition-colors flex-shrink-0">
                      {copied === s.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => remove(s.id)} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-slate-600">No active share links. Create one above.</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
