import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Hero from './components/Hero.jsx';
import InputPanel from './components/InputPanel.jsx';
import AgentPipeline from './components/AgentPipeline.jsx';
import Results from './components/Results/index.jsx';
import ALMDashboard from './components/alm/ALMDashboard.jsx';
import ApprovalReview from './components/ApprovalReview.jsx';
import SharedALMView from './components/SharedALMView.jsx';
import AuthModal from './components/AuthModal.jsx';
import { createProject, saveNewVersion, loadProjects } from './store/almStore.js';
import { getShareToken, incrementShareViews } from './store/shareStore.js';
import { getSession } from './store/authStore.js';

export const PAGES = { HERO: 'hero', INPUT: 'input', PIPELINE: 'pipeline', RESULTS: 'results', ALM: 'alm', APPROVAL: 'approval', SHARED: 'shared' };

function getUrlParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

export default function App() {
  const [page, setPage] = useState(() => {
    if (getUrlParam('approve')) return PAGES.APPROVAL;
    if (getUrlParam('share')) return PAGES.SHARED;
    return PAGES.HERO;
  });
  const [mode, setMode] = useState('new_product');
  const [forgeData, setForgeData] = useState(null);
  const [pipelineInput, setPipelineInput] = useState('');
  const [pipelineFiles, setPipelineFiles] = useState([]);
  const [baseline, setBaseline] = useState(null);
  const [approvalId] = useState(() => getUrlParam('approve'));
  const [shareTokenId] = useState(() => getUrlParam('share'));
  const [session, setSession] = useState(() => getSession());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingForgeData, setPendingForgeData] = useState(null);

  useEffect(() => {
    if (shareTokenId) incrementShareViews(shareTokenId);
  }, [shareTokenId]);

  useEffect(() => {
    const handleLogout = () => setSession(null);
    const handleShowAuth = () => setShowAuthModal(true);
    window.addEventListener('forge:logout', handleLogout);
    window.addEventListener('forge:show-auth', handleShowAuth);
    return () => {
      window.removeEventListener('forge:logout', handleLogout);
      window.removeEventListener('forge:show-auth', handleShowAuth);
    };
  }, []);

  const startForge = useCallback((input, selectedMode, files = []) => {
    setPipelineInput(input);
    setPipelineFiles(files);
    setMode(selectedMode);
    setForgeData(null);
    setPage(PAGES.PIPELINE);
  }, []);

  const onComplete = useCallback((data) => {
    // Auto-save to ALM
    try {
      const p = createProject(null, data);
      saveNewVersion(p.id, { ...data, mode }, 'minor', {}, '');
    } catch (e) {
      console.warn('ALM auto-save failed:', e.message);
    }

    const currentSession = getSession();
    if (currentSession) {
      // Already logged in — go straight to results
      setForgeData(data);
      setPage(PAGES.RESULTS);
    } else {
      // Gate results behind auth
      setPendingForgeData(data);
      setShowAuthModal(true);
    }
  }, [mode]);

  const handleAuth = useCallback((newSession) => {
    setSession(newSession);
    setShowAuthModal(false);
    window.dispatchEvent(new CustomEvent('forge:login'));
    if (pendingForgeData) {
      setForgeData(pendingForgeData);
      setPendingForgeData(null);
      setPage(PAGES.RESULTS);
    }
  }, [pendingForgeData]);

  const reset = useCallback(() => {
    setPage(PAGES.HERO);
    setForgeData(null);
    setPipelineInput('');
    setPipelineFiles([]);
    setBaseline(null);
    setPendingForgeData(null);
  }, []);

  const startFromBaseline = useCallback((baselineData) => {
    setBaseline(baselineData);
    setPage(PAGES.INPUT);
  }, []);

  const goBack = () => {
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
            <Hero onForge={startForge} onALM={() => setPage(PAGES.ALM)} />
          </motion.div>
        )}
        {page === PAGES.INPUT && (
          <motion.div key="input" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <InputPanel onForge={startForge} onBack={() => setPage(PAGES.HERO)} baseline={baseline} onClearBaseline={() => setBaseline(null)} />
          </motion.div>
        )}
        {page === PAGES.PIPELINE && (
          <motion.div key="pipeline" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <AgentPipeline input={pipelineInput} files={pipelineFiles} mode={mode} onComplete={onComplete} onReset={reset} onBack={() => setPage(PAGES.HERO)} />
          </motion.div>
        )}
        {page === PAGES.RESULTS && forgeData && (
          <motion.div key="results" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <Results data={forgeData} forgeMode={mode} onReset={reset} onEdit={() => setPage(PAGES.INPUT)} onViewALM={() => setPage(PAGES.ALM)} session={session} />
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

      {/* Auth modal — shown after pipeline if not logged in */}
      <AnimatePresence>
        {showAuthModal && <AuthModal onAuth={handleAuth} onDismiss={() => setShowAuthModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
