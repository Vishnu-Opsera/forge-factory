import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, ArrowUpDown, GitBranch, Layers, TrendingUp } from 'lucide-react';
import { computeDiff } from '../../store/almStore.js';

function FeatureCard({ feature, type }) {
  const config = {
    added: { color: '#F5A83E', bg: 'bg-[#F5A83E]/5', border: 'border-[#F5A83E]/20', icon: Plus, label: 'Added' },
    removed: { color: '#EF4444', bg: 'bg-red-500/5', border: 'border-red-500/20', icon: Minus, label: 'Removed' },
    enhanced: { color: '#8B5CF6', bg: 'bg-purple-500/5', border: 'border-purple-500/20', icon: ArrowUpDown, label: 'Enhanced' },
    unchanged: { color: '#475569', bg: 'bg-slate-800/30', border: 'border-slate-700/40', icon: null, label: '' },
  }[type] || { color: '#475569', bg: 'bg-slate-800/30', border: 'border-slate-700/40' };

  const Icon = config.icon;
  const name = typeof feature === 'string' ? feature : feature?.name;
  const desc = typeof feature === 'object' ? feature?.description : '';

  return (
    <div className={`p-2.5 rounded-xl ${config.bg} border ${config.border} group`}>
      <div className="flex items-start gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: config.color }} />}
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: type === 'unchanged' ? '#94A3B8' : '#e2e8f0' }}>{name}</div>
          {desc && <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{desc.slice(0, 100)}{desc.length > 100 ? '…' : ''}</div>}
        </div>
      </div>
    </div>
  );
}

export default function PRDDiff({ versions }) {
  const [vAIdx, setVAIdx] = useState(0);
  const [vBIdx, setVBIdx] = useState(Math.min(1, versions.length - 1));

  if (versions.length < 1) {
    return <div className="text-center py-10 text-slate-600">Need at least one version to see features.</div>;
  }

  const vA = versions[vAIdx];
  const vB = versions[vBIdx];
  const sameVersion = vAIdx === vBIdx || versions.length === 1;

  const diff = !sameVersion ? computeDiff(vA, vB) : null;
  const aFeatures = vA?.extracted?.features || [];
  const bFeatures = vB?.extracted?.features || [];

  // Build feature columns
  let addedFeatures = [], removedFeatures = [], enhancedFeatures = [], unchangedFeatures = [];
  if (diff) {
    const bMap = new Map((bFeatures).map(f => [f.id, f]));
    const aMap = new Map((aFeatures).map(f => [f.id, f]));
    addedFeatures = diff.features_added.map(name => bFeatures.find(f => f.name === name) || name);
    removedFeatures = diff.features_removed.map(name => aFeatures.find(f => f.name === name) || name);
    enhancedFeatures = diff.features_enhanced.map(name => bFeatures.find(f => f.name === name) || name);
    unchangedFeatures = bFeatures.filter(f => !diff.features_added.includes(f.name) && !diff.features_enhanced.includes(f.name));
  } else {
    unchangedFeatures = aFeatures;
  }

  const techAdded = diff?.tech_added || [];
  const techRemoved = diff?.tech_removed || [];

  return (
    <div className="space-y-5">
      {/* Version selectors */}
      {versions.length >= 2 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Compare from</label>
              <select value={vAIdx} onChange={e => setVAIdx(+e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                {versions.map((v, i) => <option key={v.id} value={i}>v{v.semver} — {new Date(v.created_at).toLocaleDateString()}</option>)}
              </select>
            </div>
            <GitBranch className="w-5 h-5 text-slate-600 flex-shrink-0 mt-4" />
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Compare to</label>
              <select value={vBIdx} onChange={e => setVBIdx(+e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                {versions.map((v, i) => <option key={v.id} value={i}>v{v.semver} — {new Date(v.created_at).toLocaleDateString()}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      {diff && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Added', value: addedFeatures.length, color: '#F5A83E' },
            { label: 'Removed', value: removedFeatures.length, color: '#EF4444' },
            { label: 'Enhanced', value: enhancedFeatures.length, color: '#8B5CF6' },
            { label: 'Unchanged', value: unchangedFeatures.length, color: '#475569' },
          ].map(s => (
            <div key={s.label} className="glass-card p-3 text-center">
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Feature columns */}
      <div className={`grid gap-4 ${diff ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
        {diff && (
          <>
            {/* Removed column */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Minus className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Removed ({removedFeatures.length})</span>
              </div>
              <div className="space-y-2">
                {removedFeatures.length === 0 && <div className="text-xs text-slate-700 py-2 text-center">None</div>}
                {removedFeatures.map((f, i) => <FeatureCard key={i} feature={f} type="removed" />)}
              </div>
            </div>

            {/* Added/Enhanced column */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Plus className="w-3.5 h-3.5 text-[#F5A83E]" />
                <span className="text-xs font-semibold text-[#F5A83E] uppercase tracking-wider">Added ({addedFeatures.length})</span>
              </div>
              <div className="space-y-2">
                {addedFeatures.length === 0 && enhancedFeatures.length === 0 && <div className="text-xs text-slate-700 py-2 text-center">None</div>}
                {addedFeatures.map((f, i) => <FeatureCard key={i} feature={f} type="added" />)}
                {enhancedFeatures.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 mt-3 mb-1">
                      <ArrowUpDown className="w-3.5 h-3.5 text-forge-purple" />
                      <span className="text-xs font-semibold text-forge-purple uppercase tracking-wider">Enhanced ({enhancedFeatures.length})</span>
                    </div>
                    {enhancedFeatures.map((f, i) => <FeatureCard key={i} feature={f} type="enhanced" />)}
                  </>
                )}
              </div>
            </div>

            {/* Unchanged column */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unchanged ({unchangedFeatures.length})</span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {unchangedFeatures.map((f, i) => <FeatureCard key={i} feature={f} type="unchanged" />)}
              </div>
            </div>
          </>
        )}

        {/* Single version — show all features */}
        {!diff && (
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">All Features — v{vA?.semver} ({unchangedFeatures.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {unchangedFeatures.map((f, i) => <FeatureCard key={i} feature={f} type="unchanged" />)}
            </div>
          </div>
        )}
      </div>

      {/* Tech stack diff */}
      {(techAdded.length > 0 || techRemoved.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-forge-whisper" />
            <span className="text-sm font-semibold text-white">Architecture Changes</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {techAdded.map(t => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full border text-[#F5A83E] border-[#F5A83E]/30 bg-[#F5A83E]/10">+ {t}</span>
            ))}
            {techRemoved.map(t => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full border text-red-400 border-red-400/30 bg-red-400/10">− {t}</span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
