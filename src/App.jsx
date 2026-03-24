import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Hero from './components/Hero.jsx';
import InputPanel from './components/InputPanel.jsx';
import AgentPipeline from './components/AgentPipeline.jsx';
import Results from './components/Results/index.jsx';
import ALMDashboard from './components/alm/ALMDashboard.jsx';
import ApprovalReview from './components/ApprovalReview.jsx';
import SharedALMView from './components/SharedALMView.jsx';
import { createProject, saveNewVersion, loadProjects, getProject } from './store/almStore.js';
import { getShareToken, incrementShareViews } from './store/shareStore.js';

export const PAGES = { HERO: 'hero', INPUT: 'input', PIPELINE: 'pipeline', RESULTS: 'results', ALM: 'alm', APPROVAL: 'approval', SHARED: 'shared' };

function getUrlParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

export default function App() {
  const [page, setPage] = useState(() => {
    // Check URL params on initial load
    if (getUrlParam('approve')) return PAGES.APPROVAL;
    if (getUrlParam('share')) return PAGES.SHARED;
    return PAGES.HERO;
  });
  const [mode, setMode] = useState('new_product');
  const [forgeData, setForgeData] = useState(null);
  const [pipelineInput, setPipelineInput] = useState('');
  const [baseline, setBaseline] = useState(null);
  const [approvalId] = useState(() => getUrlParam('approve'));
  const [shareTokenId] = useState(() => getUrlParam('share'));

  // Track share view
  useEffect(() => {
    if (shareTokenId) incrementShareViews(shareTokenId);
  }, [shareTokenId]);

  const startForge = useCallback((input, selectedMode) => {
    setPipelineInput(input);
    setMode(selectedMode);
    setForgeData(null);
    setPage(PAGES.PIPELINE);
  }, []);

  const onComplete = useCallback((data) => {
    setForgeData(data);
    setPage(PAGES.RESULTS);

    // ── Auto-save to ALM ─────────────────────────────────────────────────
    try {
      const projects = loadProjects();
      let projectId;
      if (projects.length > 0) {
        projectId = projects[0].id;
      } else {
        const p = createProject(null, data);
        projectId = p.id;
      }
      saveNewVersion(projectId, { ...data, mode }, 'minor', {}, '');
    } catch (e) {
      console.warn('ALM auto-save failed:', e.message);
    }
  }, [mode]);

  const reset = useCallback(() => {
    setPage(PAGES.HERO);
    setForgeData(null);
    setPipelineInput('');
    setBaseline(null);
  }, []);

  const startFromBaseline = useCallback((baselineData) => {
    setBaseline(baselineData);
    setPage(PAGES.INPUT);
  }, []);

  const goBack = () => {
    // Clean up URL params when leaving special pages
    if (page === PAGES.APPROVAL || page === PAGES.SHARED) {
      window.history.pushState({}, '', window.location.pathname);
    }
    setPage(PAGES.HERO);
  };

  return (
    <div className="min-h-screen bg-forge-bg noise-bg relative overflow-hidden">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <AnimatePresence mode="wait">
        {page === PAGES.APPROVAL && (
          <motion.div key="approval" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <ApprovalReview approvalId={approvalId} onBack={goBack} />
          </motion.div>
        )}
        {page === PAGES.SHARED && (
          <motion.div key="shared" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <SharedALMView shareTokenId={shareTokenId} onBack={goBack} />
          </motion.div>
        )}
        {page === PAGES.HERO && (
          <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <Hero onStart={() => setPage(PAGES.INPUT)} onALM={() => setPage(PAGES.ALM)} />
          </motion.div>
        )}
        {page === PAGES.INPUT && (
          <motion.div key="input" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <InputPanel onForge={startForge} onBack={() => setPage(PAGES.HERO)} baseline={baseline} onClearBaseline={() => setBaseline(null)} />
          </motion.div>
        )}
        {page === PAGES.PIPELINE && (
          <motion.div key="pipeline" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <AgentPipeline input={pipelineInput} mode={mode} onComplete={onComplete} onReset={reset} onBack={() => setPage(PAGES.INPUT)} />
          </motion.div>
        )}
        {page === PAGES.RESULTS && forgeData && (
          <motion.div key="results" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <Results data={forgeData} forgeMode={mode} onReset={reset} onEdit={() => setPage(PAGES.INPUT)} onViewALM={() => setPage(PAGES.ALM)} />
          </motion.div>
        )}
        {page === PAGES.ALM && (
          <motion.div key="alm" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <ALMDashboard
              onBack={() => setPage(forgeData ? PAGES.RESULTS : PAGES.HERO)}
              onNewForge={reset}
              onStartFromBaseline={startFromBaseline}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
