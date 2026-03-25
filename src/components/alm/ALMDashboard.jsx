import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Zap, ArrowLeft, GitBranch, BarChart3, CheckSquare,
  Clock, Plus, Package, Layers, Settings, Send, Share2, Terminal,
} from 'lucide-react';
import { useALM } from '../../hooks/useALM.js';
import { getInsights } from '../../store/almStore.js';
import VersionTimeline from './VersionTimeline.jsx';
import PRDDiff from './PRDDiff.jsx';
import StoryTracker from './StoryTracker.jsx';
import InsightsDashboard from './InsightsDashboard.jsx';
import BaselinePanel from './BaselinePanel.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import ApprovalsPanel from './ApprovalsPanel.jsx';
import ShareModal from '../ShareModal.jsx';
import ConnectIDEPanel from './ConnectIDEPanel.jsx';
import ThemeToggle from '../ThemeToggle.jsx';
import LanguageSwitcher from '../LanguageSwitcher.jsx';
import ProfileMenu from '../ProfileMenu.jsx';

// Artifact viewer — shows PRD/architecture/tasks from a stored version
import { lazy, Suspense } from 'react';
const PRDTab = lazy(() => import('../Results/PRDTab.jsx'));
const ArchitectureTab = lazy(() => import('../Results/ArchitectureTab.jsx'));
const TasksTab = lazy(() => import('../Results/TasksTab.jsx'));

// Project-level tabs (labelKey resolved inside component)
const PROJECT_TAB_DEFS = [
  { id: 'timeline',  labelKey: 'alm.timeline',   icon: Clock },
  { id: 'features',  labelKey: 'alm.features',   icon: GitBranch },
  { id: 'stories',   labelKey: 'alm.stories',    icon: CheckSquare },
  { id: 'insights',  labelKey: 'alm.insights',   icon: BarChart3 },
  { id: 'baseline',  labelKey: 'alm.baseline',   icon: Layers },
  { id: 'approvals', labelKey: 'alm.approvals',  icon: Send },
  { id: 'connect',   labelKey: 'alm.connectIDE', icon: Terminal },
];

// Global (sidebar-level) sections
const GLOBAL_SECTION_DEFS = [
  { id: 'alm',      labelKey: 'alm.alm',      icon: Package },
  { id: 'insights', labelKey: 'alm.insights', icon: BarChart3 },
  { id: 'settings', labelKey: 'alm.settings', icon: Settings },
];

function ArtifactViewer({ version, artifact, onClose, t }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-forge-bg/95 overflow-y-auto"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors btn-secondary py-2 px-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> {t('alm.backToALM')}
          </button>
          <span className="text-slate-600">→</span>
          <span className="text-white font-semibold capitalize">{artifact} — v{version.semver}</span>
        </div>
        <Suspense fallback={<div className="text-slate-600 text-sm">{t('alm.loadingArtifact')}</div>}>
          {artifact === 'prd' && <PRDTab prd={version.artifacts?.prd} />}
          {artifact === 'architecture' && <ArchitectureTab data={version.artifacts?.architecture} />}
          {artifact === 'tasks' && <TasksTab data={version.artifacts?.tasks} />}
        </Suspense>
      </div>
    </motion.div>
  );
}

function projectCompletion(project) {
  const insights = getInsights(project);
  if (!insights || insights.totalStories === 0) return null;
  const pct = Math.round((insights.completedStories / insights.totalStories) * 100);
  return { pct, completed: insights.completedStories, total: insights.totalStories };
}

function ProjectSelector({ projects, activeId, onChange, t }) {
  if (projects.length === 0) return (
    <div className="text-xs text-slate-600 py-2">{t('alm.noProjects')}</div>
  );
  return (
    <div className="space-y-1">
      {projects.map(p => {
        const comp = projectCompletion(p);
        const isComplete = comp?.pct === 100;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
              p.id === activeId
                ? 'bg-forge-purple/15 border border-forge-purple/30 text-white'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5 mb-0.5">
              <div className="font-semibold truncate flex-1">{p.name}</div>
              {isComplete && (
                <span className="text-xs font-mono text-[#F5A83E] flex-shrink-0">✓ Done</span>
              )}
            </div>
            <div className="text-xs opacity-60">{new Date(p.updated_at).toLocaleDateString()}</div>
            {comp && (
              <div className="mt-1.5">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="opacity-50">{comp.completed}/{comp.total} {t('alm.stories').toLowerCase()}</span>
                  <span className={isComplete ? 'text-[#F5A83E]' : 'opacity-50'}>{comp.pct}%</span>
                </div>
                <div className="h-0.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${comp.pct}%`, background: isComplete ? '#F5A83E' : '#8B5CF6' }}
                  />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function ALMDashboard({ onBack, onNewForge, onStartFromBaseline }) {
  const { t } = useTranslation();
  const PROJECT_TABS = PROJECT_TAB_DEFS.map(tab => ({ ...tab, label: t(tab.labelKey) }));
  const GLOBAL_SECTIONS = GLOBAL_SECTION_DEFS.map(s => ({ ...s, label: t(s.labelKey) }));
  const { projects, activeProject, activeProjectId, setActiveProjectId, versions, insights, updateStory, updateLinks, removeProject } = useALM();
  const [section, setSection] = useState('alm'); // alm | insights | settings
  const [activeTab, setActiveTab] = useState('timeline');
  const [selectedVersionId, setSelectedVersionId] = useState(versions[versions.length - 1]?.id || null);
  const [artifactView, setArtifactView] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleViewArtifact = (version, artifact) => setArtifactView({ version, artifact });
  const handleUpdateLinks = (versionId, links) => updateLinks(versionId, links);

  return (
    <>
      <AnimatePresence>
        {artifactView && (
          <ArtifactViewer
            version={artifactView.version}
            artifact={artifactView.artifact}
            onClose={() => setArtifactView(null)}
            t={t}
          />
        )}
        {shareModalOpen && activeProject && (
          <ShareModal
            projectId={activeProjectId}
            projectName={activeProject.name}
            onClose={() => setShareModalOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen flex flex-col">
        {/* Top nav */}
        <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-800/50 flex-shrink-0">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />{t('nav.back')}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-opsera-plum to-forge-purple flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold tracking-tight">FORGE</span>
            <span className="ml-1 text-xs font-mono text-forge-whisper bg-forge-whisper/10 border border-forge-whisper/20 px-2 py-0.5 rounded-full">ALM</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <ProfileMenu />
            {activeProject && (
              <button
                onClick={() => setShareModalOpen(true)}
                className="btn-secondary text-sm py-2 px-3 flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" /> {t('common.share')}
              </button>
            )}
            <button onClick={onNewForge} className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />{t('nav.newForge')}
            </button>
          </div>
        </nav>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <aside className="w-56 flex-shrink-0 border-r border-slate-800/50 flex flex-col overflow-y-auto">
            {/* Global section nav */}
            <div className="p-3 border-b border-slate-800/50">
              {GLOBAL_SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    section === s.id
                      ? 'bg-forge-purple/15 text-white border border-forge-purple/30'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                  {s.label}
                </button>
              ))}
            </div>

            {/* Project list — shown in ALM section */}
            {section === 'alm' && (
              <div className="p-3 flex-1">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-3 h-3" />{t('alm.projects')}
                </div>
                <ProjectSelector
                  projects={projects}
                  activeId={activeProjectId}
                  onChange={(id) => { setActiveProjectId(id); setActiveTab('timeline'); }}
                  t={t}
                />
                {activeProject && insights && (
                  <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-1 text-xs">
                    <div className="text-slate-600">{t('alm.created')} {new Date(activeProject.created_at).toLocaleDateString()}</div>
                    <div className="text-slate-600">{versions.length} {versions.length !== 1 ? t('alm.versions') : t('alm.version')}</div>
                    <div className="text-forge-purple">{insights.totalFeatures} {t('alm.features_count')}</div>
                    <div className="text-forge-amber">{insights.completedStories}/{insights.totalStories} {t('alm.storiesDone')}</div>
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* ── Settings section ── */}
              {section === 'settings' && (
                <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6">
                  <div className="mb-6">
                    <h1 className="text-2xl font-black text-white mb-1">{t('alm.settings')}</h1>
                    <div className="text-sm text-slate-500">{t('alm.settingsSubtitle')}</div>
                  </div>
                  <SettingsPanel />
                </motion.div>
              )}

              {/* ── Insights section ── */}
              {section === 'insights' && (
                <motion.div key="insights-global" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6">
                  <div className="mb-6">
                    <h1 className="text-2xl font-black text-white mb-1">{t('alm.insights')}</h1>
                    <div className="text-sm text-slate-500">{t('alm.insightsSubtitle')}</div>
                  </div>
                  {!activeProject ? (
                    <div className="text-center py-16 text-slate-600 text-sm">{t('alm.noProjectSelected')}</div>
                  ) : (
                    <InsightsDashboard insights={insights} versions={versions} />
                  )}
                </motion.div>
              )}

              {/* ── ALM section ── */}
              {section === 'alm' && (
                <motion.div key="alm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {!activeProject ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center p-8">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-opsera-plum to-forge-purple flex items-center justify-center mb-4 mx-auto">
                        <Zap className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-xl font-bold text-white mb-2">{t('alm.noAppsYet')}</div>
                      <p className="text-slate-500 mb-6 max-w-sm">{t('alm.noAppsDescription')}</p>
                      <button onClick={onNewForge} className="btn-primary py-3 px-8 flex items-center gap-2">
                        <Zap className="w-4 h-4" />{t('alm.startForging')}
                      </button>
                    </div>
                  ) : (
                    <div className="p-6">
                      {/* Project header */}
                      <div className="mb-6 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-black text-white">{activeProject.name}</h1>
                            {versions.length > 0 && (
                              <span className="text-xs font-mono font-bold text-forge-purple bg-forge-purple/10 border border-forge-purple/20 px-2 py-0.5 rounded-full">
                                v{versions[versions.length - 1].semver}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500">
                            {versions.length} {versions.length !== 1 ? t('alm.versions') : t('alm.version')} · {t('alm.updated')} {new Date(activeProject.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Tabs */}
                      <div className="flex flex-wrap gap-1 mb-6">
                        {PROJECT_TABS.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                              activeTab === tab.id ? 'tab-active' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                            }`}
                          >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Tab content */}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeTab}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          {activeTab === 'timeline' && (
                            <VersionTimeline
                              versions={versions}
                              selectedVersionId={selectedVersionId}
                              onSelectVersion={setSelectedVersionId}
                              onViewArtifact={handleViewArtifact}
                              onUpdateLinks={handleUpdateLinks}
                            />
                          )}
                          {activeTab === 'features' && <PRDDiff versions={versions} />}
                          {activeTab === 'stories' && (
                            <StoryTracker
                              versions={versions}
                              onStatusChange={(versionId, storyId, status) => updateStory(versionId, storyId, status)}
                            />
                          )}
                          {activeTab === 'insights' && <InsightsDashboard insights={insights} versions={versions} />}
                          {activeTab === 'baseline' && <BaselinePanel onStartFromBaseline={onStartFromBaseline} />}
                          {activeTab === 'approvals' && (
                            <ApprovalsPanel
                              versions={versions}
                              projectId={activeProjectId}
                              projectName={activeProject.name}
                            />
                          )}
                          {activeTab === 'connect' && (
                            <ConnectIDEPanel project={activeProject} versions={versions} />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </>
  );
}
