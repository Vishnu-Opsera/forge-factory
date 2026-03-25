import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Layout, FileText, CheckSquare, Download, RefreshCw, Edit3, Database, GitBranch, CheckCircle2, Code2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../ThemeToggle.jsx';
import LanguageSwitcher from '../LanguageSwitcher.jsx';
import ProfileMenu from '../ProfileMenu.jsx';
import ArchitectureTab from './ArchitectureTab.jsx';
import PRDTab from './PRDTab.jsx';
import TasksTab from './TasksTab.jsx';
import TechSpecTab from './TechSpecTab.jsx';
import SaveToALMModal from '../alm/SaveToALMModal.jsx';
import { useALM } from '../../hooks/useALM.js';

const TAB_DEFS = [
  { id: 'architecture', labelKey: 'results.architecture', icon: Layout, color: '#C2B0F6' },
  { id: 'prd',          labelKey: 'results.prd',          icon: FileText, color: '#F5A83E' },
  { id: 'techspec',     labelKey: 'results.techSpec',     icon: Code2, color: '#6366F1' },
  { id: 'tasks',        labelKey: 'results.sprintTasks',  icon: CheckSquare, color: '#F59E0B' },
];

function timestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

export default function Results({ data, forgeMode, onReset, onEdit, onViewALM, session }) {
  const { t } = useTranslation();
  const TABS = TAB_DEFS.map(tab => ({ ...tab, label: t(tab.labelKey) }));
  const [activeTab, setActiveTab] = useState('architecture');
  const [showALMModal, setShowALMModal] = useState(false);
  const [almSaved, setAlmSaved] = useState(false);

  const { projects, saveToALM, saveToProject, versions } = useALM();
  const latestVersion = versions[versions.length - 1]?.semver;

  const handleDownloadPRD = () => {
    const blob = new Blob([data.prd || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forge-prd_${timestamp()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTasks = () => {
    const tasks = typeof data.tasks === 'string' ? data.tasks : JSON.stringify(data.tasks, null, 2);
    const ext = typeof data.tasks === 'string' ? 'md' : 'json';
    const blob = new Blob([tasks], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forge-tasks_${timestamp()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleALMSave = ({ bumpType, links, note, mode, projectId, newProjectName }) => {
    if (mode === 'existing' && projectId) {
      saveToProject(projectId, data, forgeMode, bumpType, links, note);
    } else {
      saveToALM(data, forgeMode, bumpType, links, note, newProjectName);
    }
    setAlmSaved(true);
    setShowALMModal(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-opsera-plum to-forge-purple flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold tracking-tight">FORGE</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[#F5A83E]/10 text-[#F5A83E] border border-[#F5A83E]/20 font-medium">
            {t('results.forgedBadge')}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <LanguageSwitcher />
          <ThemeToggle />
          <ProfileMenu />
          <button onClick={onEdit} className="flex items-center gap-1.5 text-sm btn-secondary py-2 px-3">
            <Edit3 className="w-3.5 h-3.5" />
            {t('results.edit')}
          </button>
          {almSaved ? (
            <button onClick={onViewALM} className="flex items-center gap-1.5 text-sm py-2 px-3 rounded-xl border border-[#F5A83E]/30 bg-[#F5A83E]/10 text-[#F5A83E] hover:bg-[#F5A83E]/20 transition-all">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('results.savedVersion', { version: latestVersion })}
              <GitBranch className="w-3.5 h-3.5 ml-1" />
              {t('results.openALM')}
            </button>
          ) : (
            <button onClick={() => setShowALMModal(true)} className="flex items-center gap-1.5 text-sm btn-secondary py-2 px-3">
              <Database className="w-3.5 h-3.5" />
              {t('results.saveToALM')}
            </button>
          )}
          {projects.length > 0 && (
            <button onClick={onViewALM} className="flex items-center gap-1.5 text-sm btn-secondary py-2 px-3">
              <GitBranch className="w-3.5 h-3.5" />
              {t('results.almDashboard')}
            </button>
          )}
          <button onClick={onReset} className="flex items-center gap-1.5 text-sm btn-secondary py-2 px-3">
            <RefreshCw className="w-3.5 h-3.5" />
            {t('results.newForge')}
          </button>
        </div>
      </nav>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {/* Intent summary */}
        {data.intent && typeof data.intent === 'object' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 mb-6 border-forge-purple/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-forge-amber font-semibold uppercase tracking-wider">{t('results.intentSummary')}</span>
                  {data.intent.complexity && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      data.intent.complexity === 'high' ? 'priority-high' :
                      data.intent.complexity === 'medium' ? 'priority-medium' : 'priority-low'
                    }`}>
                      {data.intent.complexity} {t('results.complexity')}
                    </span>
                  )}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{data.intent.concept || 'AI-powered product analysis complete.'}</p>
              </div>
              {data.intent.estimated_timeline && (
                <div className="text-xs text-slate-500 flex-shrink-0">
                  <span className="text-forge-whisper font-semibold">{data.intent.estimated_timeline}</span> {t('results.timeline')}
                </div>
              )}
            </div>
            {data.intent.core_features && Array.isArray(data.intent.core_features) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {data.intent.core_features.slice(0, 6).map((f, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">
                    {typeof f === 'object' ? f.name : f}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab bar */}
        <div className="flex gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                activeTab === tab.id ? 'tab-active text-white' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
              }`}
              style={activeTab === tab.id ? { borderColor: tab.color + '50' } : {}}
            >
              <tab.icon className="w-4 h-4" style={activeTab === tab.id ? { color: tab.color } : {}} />
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          {activeTab === 'prd' && (
            <button onClick={handleDownloadPRD} className="flex items-center gap-1.5 text-sm btn-secondary py-2 px-4">
              <Download className="w-3.5 h-3.5" />{t('results.downloadPRD')}
            </button>
          )}
          {activeTab === 'techspec' && data.techspec && (
            <button
              onClick={() => {
                const blob = new Blob([data.techspec], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `forge-techspec_${timestamp()}.md`; a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 text-sm btn-secondary py-2 px-4"
            >
              <Download className="w-3.5 h-3.5" />{t('results.downloadTechSpec')}
            </button>
          )}
          {activeTab === 'tasks' && (
            <button onClick={handleDownloadTasks} className="flex items-center gap-1.5 text-sm btn-secondary py-2 px-4">
              <Download className="w-3.5 h-3.5" />{t('results.exportTasks')}
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === 'architecture' && <ArchitectureTab data={data.architecture} />}
            {activeTab === 'prd' && <PRDTab prd={data.prd} />}
            {activeTab === 'techspec' && <TechSpecTab data={data.techspec} />}
            {activeTab === 'tasks' && <TasksTab data={data.tasks} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ALM Save Modal */}
      <AnimatePresence>
        {showALMModal && (
          <SaveToALMModal
            data={data}
            projects={projects}
            currentVersion={latestVersion || null}
            onSave={handleALMSave}
            onClose={() => setShowALMModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
