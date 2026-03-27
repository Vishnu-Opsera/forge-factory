import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, FileText, Layers, CheckSquare, ChevronDown, ChevronUp,
  Plus, Minus, ArrowUpDown, Clock, Zap, Package, ExternalLink, Download,
} from 'lucide-react';
import LinkPanel from './LinkPanel.jsx';
import { getVersionWithDownloadUrl, uploadArtifactVersion } from '../../lib/versioningApi.js';

function BackendDownloadButton({ artifactId, versionNumber, label, localContent, contentType }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const versionData = await getVersionWithDownloadUrl(artifactId, versionNumber);
      // If stored as non-PDF and we have local content, re-upload as the correct type to get PDF
      if (versionData.contentType !== 'application/pdf' && localContent) {
        const content = typeof localContent === 'string'
          ? localContent
          : JSON.stringify(localContent, null, 2);
        await uploadArtifactVersion(artifactId, content, contentType || 'text/plain', {});
        // Fetch latest version (the new PDF)
        const updated = await getVersionWithDownloadUrl(artifactId, versionNumber + 1);
        window.open(updated.downloadUrl, '_blank');
      } else {
        window.open(versionData.downloadUrl, '_blank');
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  };
  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
    >
      {loading ? '…' : <><Download className="w-3 h-3" /> {label}</>}
    </button>
  );
}

const BUMP_COLORS = { major: '#8B5CF6', minor: '#C2B0F6', patch: '#F5A83E' };

function ChangeTag({ type, items }) {
  if (!items?.length) return null;
  const config = {
    added: { color: '#F5A83E', icon: Plus, label: '+' },
    removed: { color: '#EF4444', icon: Minus, label: '-' },
    enhanced: { color: '#8B5CF6', icon: ArrowUpDown, label: '~' },
  }[type];
  if (!config) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <span key={i} className="text-xs px-2 py-0.5 rounded-full border" style={{ color: config.color, borderColor: config.color + '30', background: config.color + '10' }}>
          {config.label} {item}
        </span>
      ))}
    </div>
  );
}

function VersionCard({ version, isSelected, onSelect, onViewArtifact, onUpdateLinks, onNavigateToStories }) {
  const [expanded, setExpanded] = useState(isSelected);
  const diff = version.diff_from_previous;
  const bumpColor = BUMP_COLORS[version.bump_type] || '#94A3B8';
  const statuses = Object.values(version.story_statuses || {});
  const completed = statuses.filter(s => s.status === 'completed').length;
  const completionPct = statuses.length > 0 ? Math.round((completed / statuses.length) * 100) : 0;

  const allNotes = [
    ...(version.changelog.summary ? [version.changelog.summary] : []),
    ...(version.changelog.auto_notes || []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`glass-card overflow-hidden transition-all duration-200 cursor-pointer ${isSelected ? 'border-forge-purple/40' : ''}`}
      onClick={() => { onSelect(); setExpanded(!expanded); }}
    >
      {/* Version header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: bumpColor + '20', border: `1px solid ${bumpColor}40`, color: bumpColor }}>
            v{version.semver}
          </div>
          <span className="text-xs text-slate-700 capitalize">{version.bump_type}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {allNotes.slice(0, 1).map((n, i) => (
              <span key={i} className="text-sm text-slate-300 font-medium truncate">{n}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(version.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
            </span>
            <span className="text-xs text-slate-600">{version.extracted?.story_count || 0} stories</span>
            <span className="text-xs text-slate-600">{version.extracted?.features?.length || 0} features</span>
          </div>
        </div>

        {/* Story completion ring */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative w-8 h-8">
            <svg viewBox="0 0 32 32" className="w-8 h-8 -rotate-90">
              <circle cx="16" cy="16" r="12" fill="none" stroke="#1e2a4a" strokeWidth="3" />
              <circle
                cx="16" cy="16" r="12" fill="none"
                stroke={completionPct > 50 ? '#F5A83E' : '#F59E0B'} strokeWidth="3"
                strokeDasharray={`${(completionPct / 100) * 75.4} 75.4`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: completionPct > 50 ? '#F5A83E' : '#F59E0B' }}>
              {completionPct}%
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-slate-800/60 pt-3" onClick={(e) => e.stopPropagation()}>
              {/* Changelog notes */}
              {allNotes.length > 0 && (
                <div className="space-y-1">
                  {allNotes.map((note, i) => (
                    <div key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-slate-600 mt-1.5 flex-shrink-0" />
                      {note}
                    </div>
                  ))}
                </div>
              )}

              {/* Diff tags */}
              {diff && (
                <div className="space-y-1.5">
                  <ChangeTag type="added" items={diff.features_added} />
                  <ChangeTag type="enhanced" items={diff.features_enhanced} />
                  <ChangeTag type="removed" items={diff.features_removed} />
                  {(diff.tech_added?.length > 0 || diff.tech_removed?.length > 0) && (
                    <div className="text-xs text-slate-600">
                      {diff.tech_added?.length > 0 && <span className="text-forge-whisper">+{diff.tech_added.join(', ')} </span>}
                      {diff.tech_removed?.length > 0 && <span className="text-red-600/60">-{diff.tech_removed.join(', ')}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Artifact buttons */}
              <div className="flex flex-wrap gap-2">
                {version.artifacts?.prd && (
                  <button onClick={() => onViewArtifact(version, 'prd')} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[#F5A83E]/10 border border-[#F5A83E]/20 text-[#F5A83E] hover:bg-[#F5A83E]/20 transition-colors">
                    <FileText className="w-3 h-3" /> PRD v{version.semver}
                  </button>
                )}
                {version.artifacts?.architecture && (
                  <button onClick={() => onViewArtifact(version, 'architecture')} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-forge-whisper/10 border border-forge-whisper/20 text-forge-whisper hover:bg-forge-whisper/20 transition-colors">
                    <Layers className="w-3 h-3" /> Architecture v{version.semver}
                  </button>
                )}
                {version.artifacts?.tasks && (
                  <button onClick={onNavigateToStories} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-forge-amber hover:bg-amber-500/20 transition-colors">
                    <CheckSquare className="w-3 h-3" /> Stories v{version.semver}
                  </button>
                )}
                {version._backend?.prd?.artifactId && (
                  <BackendDownloadButton
                    artifactId={version._backend.prd.artifactId}
                    versionNumber={version._backend.prd.versionNumber}
                    label="↓ PRD (PDF)"
                    localContent={version.artifacts?.prd}
                    contentType="text/markdown"
                  />
                )}
                {version._backend?.architecture?.artifactId && (
                  <BackendDownloadButton
                    artifactId={version._backend.architecture.artifactId}
                    versionNumber={version._backend.architecture.versionNumber}
                    label="↓ Arch (PDF)"
                    localContent={version.artifacts?.architecture}
                    contentType="text/plain"
                  />
                )}
              </div>

              {/* GitHub / CI links */}
              <LinkPanel
                links={version.links}
                versionId={version.id}
                onSave={onUpdateLinks ? (lnk) => onUpdateLinks(version.id, lnk) : null}
              />

              {/* Story progress bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Stories</span>
                  <span>{completed}/{statuses.length} done</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-forge-amber"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPct}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function VersionTimeline({ versions, selectedVersionId, onSelectVersion, onViewArtifact, onUpdateLinks, onNavigateToStories }) {
  return (
    <div className="space-y-3">
      {versions.length === 0 && (
        <div className="text-center py-8 text-slate-600 text-sm">No versions yet. Save your first Forge result.</div>
      )}
      {[...versions].reverse().map((ver) => (
        <VersionCard
          key={ver.id}
          version={ver}
          isSelected={ver.id === selectedVersionId}
          onSelect={() => onSelectVersion(ver.id)}
          onViewArtifact={onViewArtifact}
          onUpdateLinks={onUpdateLinks}
          onNavigateToStories={onNavigateToStories}
        />
      ))}
    </div>
  );
}
