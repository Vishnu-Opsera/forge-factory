import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowLeft, AlertCircle, Clock, GitBranch, BarChart3, CheckSquare, Layers, RefreshCw, Eye, Lock } from 'lucide-react';
import { getShareToken } from '../store/shareStore.js';
import { getProject } from '../store/almStore.js';
import { loadSettings } from '../store/shareStore.js';
import { getInsights } from '../store/almStore.js';

const VersionTimeline = lazy(() => import('./alm/VersionTimeline.jsx'));
const PRDDiff = lazy(() => import('./alm/PRDDiff.jsx'));
const StoryTracker = lazy(() => import('./alm/StoryTracker.jsx'));
const InsightsDashboard = lazy(() => import('./alm/InsightsDashboard.jsx'));

const TABS = [
  { id: 'timeline',  label: 'Timeline',  icon: Clock },
  { id: 'features',  label: 'Features',  icon: GitBranch },
  { id: 'stories',   label: 'Stories',   icon: CheckSquare },
  { id: 'insights',  label: 'Insights',  icon: BarChart3 },
];

export default function SharedALMView({ shareTokenId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [project, setProject] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const settings = loadSettings();

  useEffect(() => {
    const t = getShareToken(shareTokenId);
    if (!t) { setError('Share link not found or has been revoked.'); setLoading(false); return; }
    const p = getProject(t.projectId);
    if (!p) { setError('Project not found.'); setLoading(false); return; }
    setToken(t);
    setProject(p);
    setLoading(false);
    // If no PIN required, mark as verified automatically
    if (!settings.requirePin || !settings.sharePin) setPinVerified(true);
  }, [shareTokenId]);

  const verifyPin = () => {
    if (pin.toUpperCase() === settings.sharePin?.toUpperCase()) {
      setPinVerified(true);
      setPinError('');
    } else {
      setPinError('Incorrect PIN. Please try again.');
    }
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
        <div className="text-white font-bold text-xl">Link Not Available</div>
        <div className="text-slate-500 text-sm max-w-sm">{error}</div>
        <button onClick={onBack} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
    );
  }

  if (!pinVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-forge-purple/20 border border-forge-purple/30 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-forge-purple" />
          </div>
          <div>
            <div className="font-bold text-white text-lg mb-1">{settings.appName}</div>
            <div className="text-slate-500 text-sm">This shared view is PIN-protected. Enter the PIN to continue.</div>
          </div>
          <div>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verifyPin()}
              placeholder="Enter PIN"
              className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-4 py-3 text-white text-center text-lg font-mono outline-none focus:border-forge-purple/50 placeholder-slate-600 tracking-widest"
            />
            {pinError && <div className="text-xs text-red-400 mt-1.5">{pinError}</div>}
          </div>
          <button onClick={verifyPin} className="btn-primary w-full py-3">Access View</button>
        </motion.div>
      </div>
    );
  }

  const versions = project.versions;
  const insights = getInsights(project);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-800/50">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-forge-purple to-forge-cyan flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold tracking-tight">{settings.appName || 'FORGE'}</span>
          <span className="ml-1 text-xs font-mono text-forge-cyan bg-forge-cyan/10 border border-forge-cyan/20 px-2 py-0.5 rounded-full">ALM</span>
          <span className="text-xs flex items-center gap-1 text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/40">
            <Eye className="w-3 h-3" /> Read-only
          </span>
        </div>
        <div className="w-20" />
      </nav>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-white">{project.name}</h1>
            {versions.length > 0 && (
              <span className="text-xs font-mono font-bold text-forge-purple bg-forge-purple/10 border border-forge-purple/20 px-2 py-0.5 rounded-full">
                v{versions[versions.length - 1].semver}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500">
            {versions.length} version{versions.length !== 1 ? 's' : ''} · Shared via "{token?.label}"
            {settings.organizationName && <span> · {settings.organizationName}</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                activeTab === tab.id ? 'tab-active' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Suspense fallback={<div className="text-slate-600 text-sm p-6">Loading…</div>}>
              {activeTab === 'timeline' && (
                <VersionTimeline versions={versions} selectedVersionId={versions[versions.length - 1]?.id} onSelectVersion={() => {}} onViewArtifact={() => {}} onUpdateLinks={() => {}} readOnly />
              )}
              {activeTab === 'features' && <PRDDiff versions={versions} />}
              {activeTab === 'stories' && <StoryTracker versions={versions} onStatusChange={() => {}} readOnly />}
              {activeTab === 'insights' && <InsightsDashboard insights={insights} versions={versions} />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
