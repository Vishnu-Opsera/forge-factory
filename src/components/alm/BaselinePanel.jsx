import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, FileText, Layers, CheckSquare, GitBranch, ExternalLink,
  Zap, Copy, Check, ChevronRight, AlertCircle, BookOpen, Code2, RefreshCw,
} from 'lucide-react';
import { lookupByRef, getLatestVersion } from '../../store/almStore.js';
import { MermaidDiagram } from '../Results/ArchitectureTab.jsx';

// ── Artifact card with copy-ref ───────────────────────────────────────────────
function ArtifactRef({ refCode, type, label, color, icon: Icon, onView }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border transition-all group"
      style={{ borderColor: color + '30', background: color + '08' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '15', border: `1px solid ${color}30` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold" style={{ color }}>{label}</div>
        <div className="font-mono text-xs text-slate-400 mt-0.5">{refCode}</div>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={copy} className="p-1 text-slate-500 hover:text-white transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        {onView && (
          <button onClick={onView} className="p-1 text-slate-500 hover:text-white transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Preview modal for an artifact ────────────────────────────────────────────
function ArtifactPreview({ version, artifact, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-forge-bg/90 flex flex-col overflow-hidden"
      style={{ backdropFilter: 'blur(6px)' }}
    >
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800/60">
        <button onClick={onClose} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
          ← Close
        </button>
        <span className="font-semibold text-white capitalize">{artifact} — {version.ref} (v{version.semver})</span>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-5xl mx-auto w-full">
        {artifact === 'architecture' && version.artifacts?.architecture && (
          <div className="space-y-4">
            {version.artifacts.architecture.mermaid && (
              <div className="glass-card p-5">
                <div className="font-semibold text-white text-sm mb-3">System Diagram</div>
                <MermaidDiagram diagram={version.artifacts.architecture.mermaid} />
              </div>
            )}
            {version.artifacts.architecture.tech_stack && (
              <div className="glass-card p-5">
                <div className="font-semibold text-white text-sm mb-3">Tech Stack</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(version.artifacts.architecture.tech_stack).flatMap(([layer, techs]) =>
                    (Array.isArray(techs) ? techs : [techs]).map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">{t}</span>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {artifact === 'prd' && version.artifacts?.prd && (
          <div className="glass-card p-6">
            <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{version.artifacts.prd}</pre>
          </div>
        )}
        {artifact === 'tasks' && version.artifacts?.tasks && (
          <div className="space-y-3">
            {(version.artifacts.tasks?.epics || []).map(epic => (
              <div key={epic.id} className="glass-card p-4">
                <div className="font-bold text-white mb-2" style={{ color: epic.color }}>{epic.title}</div>
                <div className="space-y-1.5">
                  {(epic.stories || []).map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-sm text-slate-400">
                      <span className="font-mono text-xs text-slate-600">{s.id}</span>
                      <span>{s.title}</span>
                      <span className="ml-auto text-xs text-slate-600">{s.story_points}pts</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main BaselinePanel ────────────────────────────────────────────────────────
export default function BaselinePanel({ onStartFromBaseline }) {
  const [refInput, setRefInput] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [preview, setPreview] = useState(null); // { version, artifact }

  // Auto-load latest on mount
  const latest = getLatestVersion();

  const handleLookup = () => {
    if (!refInput.trim()) return;
    const result = lookupByRef(refInput.trim());
    if (result) {
      setLookupResult(result);
      setLookupError('');
    } else {
      setLookupResult(null);
      setLookupError(`No artifact found for "${refInput}"`);
    }
  };

  const buildBaselineContext = (version) => {
    const intent = version.artifacts?.intent;
    const arch = version.artifacts?.architecture;
    const tasks = version.artifacts?.tasks;
    const links = version.links;

    const lines = [
      `[BASELINE: ${version.ref} — v${version.semver}]`,
      '',
    ];

    if (intent?.concept) lines.push(`Product: ${intent.concept}`);
    if (intent?.core_features?.length) {
      lines.push(`\nExisting features:`);
      intent.core_features.slice(0, 8).forEach(f => lines.push(`  • ${typeof f === 'string' ? f : f.name}`));
    }
    if (arch?.style) lines.push(`\nArchitecture: ${arch.style}`);
    if (arch?.tech_stack) {
      const allTech = Object.values(arch.tech_stack).flat().join(', ');
      lines.push(`Tech stack: ${allTech}`);
    }
    if (tasks?.epics?.length) {
      lines.push(`\nExisting epics (${tasks.epics.length}):`);
      tasks.epics.forEach(e => lines.push(`  • ${e.title} (${e.stories?.length || 0} stories)`));
    }
    if (links?.pr_url) lines.push(`\nGitHub PR: ${links.pr_url}`);
    if (links?.commit_sha) lines.push(`Commit: ${links.commit_sha}`);
    if (links?.pipeline_url) lines.push(`Pipeline: ${links.pipeline_url}`);

    lines.push('\n---');
    lines.push('Describe what you want to change, add, or build next:');

    return lines.join('\n');
  };

  const activeResult = lookupResult || (latest ? { version: latest.version, project: latest.project } : null);

  return (
    <>
      <AnimatePresence>
        {preview && (
          <ArtifactPreview version={preview.version} artifact={preview.artifact} onClose={() => setPreview(null)} />
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {/* Reference lookup */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-forge-purple" />
            <span className="font-semibold text-white text-sm">Pull Artifact by Reference</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2.5 focus-within:border-forge-purple/50">
              <span className="text-slate-600 text-sm font-mono">#</span>
              <input
                type="text"
                value={refInput}
                onChange={e => setRefInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                placeholder="REF-001  or  001  or  1"
                className="flex-1 bg-transparent text-white placeholder-slate-600 outline-none text-sm font-mono"
              />
            </div>
            <button onClick={handleLookup} className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2">
              <Search className="w-4 h-4" /> Pull
            </button>
          </div>
          {lookupError && (
            <div className="flex items-center gap-2 text-xs text-red-400 mt-2">
              <AlertCircle className="w-3.5 h-3.5" />{lookupError}
            </div>
          )}
          <p className="text-xs text-slate-600 mt-2">
            Enter a reference number to load any version's artifacts as a starting baseline
          </p>
        </div>

        {/* Latest / looked-up version */}
        {activeResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 border-forge-purple/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono font-black text-forge-purple text-sm">{activeResult.version.ref}</span>
                  <span className="text-xs text-slate-500">v{activeResult.version.semver}</span>
                  {!lookupResult && <span className="text-xs text-slate-600 bg-slate-800/60 px-2 py-0.5 rounded-full">Latest</span>}
                </div>
                <div className="text-xs text-slate-500">{activeResult.project.name} · {new Date(activeResult.version.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
              <button
                onClick={() => onStartFromBaseline({ version: activeResult.version, project: activeResult.project, context: buildBaselineContext(activeResult.version) })}
                className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Fork & Build
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Artifact reference cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              <ArtifactRef
                refCode={`${activeResult.version.ref}-PRD`}
                type="prd"
                label="PRD Document"
                color="#10B981"
                icon={FileText}
                onView={activeResult.version.artifacts?.prd ? () => setPreview({ version: activeResult.version, artifact: 'prd' }) : null}
              />
              <ArtifactRef
                refCode={`${activeResult.version.ref}-ARCH`}
                type="architecture"
                label="Architecture"
                color="#06B6D4"
                icon={Layers}
                onView={activeResult.version.artifacts?.architecture ? () => setPreview({ version: activeResult.version, artifact: 'architecture' }) : null}
              />
              <ArtifactRef
                refCode={`${activeResult.version.ref}-TASKS`}
                type="tasks"
                label="Sprint Tasks"
                color="#F59E0B"
                icon={CheckSquare}
                onView={activeResult.version.artifacts?.tasks ? () => setPreview({ version: activeResult.version, artifact: 'tasks' }) : null}
              />
            </div>

            {/* GitHub links if present */}
            {(activeResult.version.links?.pr_url || activeResult.version.links?.commit_sha || activeResult.version.links?.pipeline_url) && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800/60">
                {activeResult.version.links.pr_url && (
                  <a href={activeResult.version.links.pr_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg text-forge-purple bg-forge-purple/10 border border-forge-purple/20 hover:bg-forge-purple/20 transition-colors">
                    <GitBranch className="w-3 h-3" /> PR <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {activeResult.version.links.commit_sha && (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg text-forge-cyan bg-forge-cyan/10 border border-forge-cyan/20 font-mono">
                    <Code2 className="w-3 h-3" />{activeResult.version.links.commit_sha.slice(0, 8)}
                  </span>
                )}
                {activeResult.version.links.pipeline_url && (
                  <a href={activeResult.version.links.pipeline_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg text-forge-amber bg-forge-amber/10 border border-forge-amber/20 hover:bg-forge-amber/20 transition-colors">
                    <Zap className="w-3 h-3" /> Pipeline <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            )}

            {/* Feature summary */}
            {activeResult.version.extracted?.features?.length > 0 && (
              <div className="pt-3 border-t border-slate-800/60 mt-3">
                <div className="text-xs text-slate-500 mb-1.5">{activeResult.version.extracted.features.length} features in this version</div>
                <div className="flex flex-wrap gap-1.5">
                  {activeResult.version.extracted.features.slice(0, 8).map(f => (
                    <span key={f.id} className="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">{f.name}</span>
                  ))}
                  {activeResult.version.extracted.features.length > 8 && (
                    <span className="text-xs text-slate-600">+{activeResult.version.extracted.features.length - 8} more</span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {!activeResult && (
          <div className="text-center py-8 text-slate-600 text-sm">
            No versions saved yet. Complete a Forge run to create your first baseline.
          </div>
        )}
      </div>
    </>
  );
}
