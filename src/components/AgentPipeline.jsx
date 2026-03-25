import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, CheckCircle2, Loader2, StopCircle, Send,
  ChevronDown, ChevronUp, ArrowLeft,
  AlertCircle, FileCheck2, PauseCircle, PlayCircle,
  RotateCcw, MessageSquarePlus, X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle.jsx';
import ProfileMenu from './ProfileMenu.jsx';

const AGENT_DEFS = [
  { key: 'intent',       nameKey: 'agents.triage',      descKey: 'agents.triageDesc',      icon: '🔮', color: '#8B5CF6',  expectedChars: 6000 },
  { key: 'architecture', nameKey: 'agents.drafthouse',  descKey: 'agents.drafthouseDesc',  icon: '⚙️', color: '#C2B0F6',  expectedChars: 7000 },
  { key: 'prd',          nameKey: 'agents.press',       descKey: 'agents.pressDesc',       icon: '📜', color: '#F5A83E',  expectedChars: 14000 },
  { key: 'techspec',     nameKey: 'agents.blueprint',   descKey: 'agents.blueprintDesc',   icon: '🔧', color: '#6366F1',  expectedChars: 14000 },
  { key: 'tasks',        nameKey: 'agents.mill',        descKey: 'agents.millDesc',        icon: '⚡', color: '#F59E0B',  expectedChars: 12000 },
];

function AgentCard({ agent, agentName, agentDesc, status, streamText, elapsed, isExpanded, onToggle }) {
  const isRunning = status === 'running';
  const isDone = status === 'done';
  const isPending = status === 'pending';
  const isPaused = status === 'paused';

  const progress = isDone
    ? 100
    : isRunning
    ? Math.min(Math.round((streamText.length / agent.expectedChars) * 100), 95)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 }}
      className={`glass-card transition-all duration-300 overflow-hidden ${
        isRunning ? 'agent-running' : isDone ? 'agent-done' : ''
      }`}
    >
      <div
        className={`flex items-center gap-4 p-4 ${isDone && streamText ? 'cursor-pointer' : ''}`}
        onClick={() => isDone && streamText && onToggle()}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 ${isRunning ? 'agent-pulse' : ''}`}
          style={{
            background: (isPending || isPaused) ? 'rgba(148,163,184,0.05)' : `${agent.color}20`,
            border: `1px solid ${(isPending || isPaused) ? 'rgba(148,163,184,0.1)' : agent.color + '40'}`,
          }}
        >
          {isRunning ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: agent.color }} />
          ) : isDone ? (
            <CheckCircle2 className="w-5 h-5" style={{ color: agent.color }} />
          ) : isPaused ? (
            <PauseCircle className="w-4 h-4 text-amber-400 opacity-70" />
          ) : (
            <span className="opacity-30">{agent.icon}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm ${(isPending || isPaused) ? 'text-slate-600' : 'text-white'}`}>
              {agentName}
            </span>
            {isRunning && (
              <span className="text-xs font-mono text-forge-purple animate-pulse">● Running</span>
            )}
            {isDone && (
              <span className="text-xs font-mono text-[#F5A83E]">{elapsed}s</span>
            )}
            {isPaused && (
              <span className="text-xs font-mono text-amber-400 opacity-70">paused</span>
            )}
          </div>
          <div className={`text-xs mt-0.5 ${(isPending || isPaused) ? 'text-slate-700' : 'text-slate-500'}`}>
            {agentDesc}
          </div>
          {(isRunning || isDone) && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: agent.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs font-mono flex-shrink-0" style={{ color: isDone ? '#F5A83E' : agent.color }}>
                {progress}%
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center flex-shrink-0">
          {isDone && streamText && (
            isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {(isRunning || isExpanded) && streamText && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mx-4 mb-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <pre className={`stream-text max-h-48 overflow-y-auto ${isRunning ? 'cursor-blink' : ''}`}>
                {streamText.slice(-2000)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isRunning && (
        <div className="h-0.5 w-full relative overflow-hidden" style={{ background: `${agent.color}20` }}>
          <motion.div
            className="h-full absolute left-0"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '40%', background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)` }}
          />
        </div>
      )}
    </motion.div>
  );
}

/* ─── Feedback / Pause Modal ───────────────────────────────────────── */
function FeedbackPanel({ completedCount, totalCount, onResume, onRestart, onContinue, t }) {
  const [text, setText] = useState('');
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="glass-card border border-amber-500/30 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
          <PauseCircle className="w-4.5 h-4.5 text-amber-400" />
        </div>
        <div>
          <div className="font-semibold text-white text-sm">{t('pipeline.pipelinePaused')}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {t('pipeline.stepsCompleted', { completed: completedCount, total: totalCount })}
          </div>
        </div>
      </div>

      <div className="px-5 pb-2">
        <div className="h-px bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent" />
      </div>

      {/* Textarea */}
      <div className="px-5 pb-4">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <MessageSquarePlus className="w-3.5 h-3.5" />
          {t('pipeline.feedbackLabel')}
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={t('pipeline.feedbackPlaceholder')}
          className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-3.5 py-3 text-sm
            text-[var(--text-primary)] placeholder-[var(--text-subtle)]
            outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20
            resize-none transition-all"
          autoFocus
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 px-5 pb-5">
        <button
          onClick={() => onResume(text)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
            bg-gradient-to-r from-forge-purple/80 to-forge-purple/60 border border-forge-purple/40
            text-white text-sm font-semibold hover:from-forge-purple hover:to-forge-purple/80
            transition-all shadow-lg shadow-forge-purple/20"
        >
          <PlayCircle className="w-4 h-4" />
          {text.trim() ? t('pipeline.resumeWithFeedback') : t('pipeline.resumePipeline')}
        </button>
        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
            border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500
            text-sm transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('pipeline.startOver')}
        </button>
        {onContinue && (
          <button
            onClick={onContinue}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl
              text-slate-600 hover:text-slate-400 text-xs transition-colors"
          >
            <X className="w-3 h-3" />
            {t('common.cancel')}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */
export default function AgentPipeline({ input, files = [], mode, onComplete, onReset, onBack }) {
  const { t } = useTranslation();
  const AGENTS = AGENT_DEFS.map(a => ({ ...a, name: t(a.nameKey), desc: t(a.descKey) }));
  const initState = () => ({
    intent:       { status: 'pending', text: '', elapsed: null },
    architecture: { status: 'pending', text: '', elapsed: null },
    prd:          { status: 'pending', text: '', elapsed: null },
    techspec:     { status: 'pending', text: '', elapsed: null },
    tasks:        { status: 'pending', text: '', elapsed: null },
  });

  const [agentStates, setAgentStates] = useState(initState);
  const [isStopped, setIsStopped]     = useState(false);
  const [isPaused, setIsPaused]       = useState(false);
  const [error, setError]             = useState(null);
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [isDone, setIsDone]           = useState(false);
  const [resultsData, setResultsData] = useState(null);

  // Run parameters — updated on resume
  const runParamsRef = useRef({ resumeFrom: null, previousResults: {}, feedback: '' });
  const [runCount, setRunCount]       = useState(0); // increment triggers re-run

  // Per-agent raw text captured as streaming completes
  const agentTextRef  = useRef({ intent: '', architecture: '', prd: '', techspec: '', tasks: '' });
  const agentOutputRef = useRef({});

  const abortRef   = useRef(null);
  const resultsRef = useRef(null);

  const updateAgent = useCallback((key, updates) => {
    setAgentStates((prev) => ({ ...prev, [key]: { ...prev[key], ...updates } }));
  }, []);

  /* ── SSE runner ── */
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const { resumeFrom, previousResults, feedback } = runParamsRef.current;

    fetch('/api/forge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, mode, files, resumeFrom, previousResults, feedback }),
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'API error');
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw);

            if (event.type === 'agent_start') {
              agentTextRef.current[event.agent] = '';
              updateAgent(event.agent, { status: 'running', text: '' });
            } else if (event.type === 'agent_text') {
              agentTextRef.current[event.agent] += event.text;
              setAgentStates((prev) => ({
                ...prev,
                [event.agent]: { ...prev[event.agent], text: prev[event.agent].text + event.text },
              }));
            } else if (event.type === 'agent_done') {
              agentOutputRef.current[event.agent] = agentTextRef.current[event.agent];
              updateAgent(event.agent, { status: 'done', elapsed: event.elapsed });
            } else if (event.type === 'results') {
              resultsRef.current = event.data;
              setResultsData(event.data);
            } else if (event.type === 'done') {
              setIsDone(true);
            } else if (event.type === 'error') {
              setError(event.message);
            }
          } catch {}
        }
      }
    }).catch((err) => {
      if (err.name !== 'AbortError') setError(err.message);
    });

    return () => controller.abort();
  }, [runCount]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Handlers ── */
  const handleStop = () => {
    abortRef.current?.abort();
    setIsStopped(true);
  };

  const handlePause = () => {
    abortRef.current?.abort();
    // Reset any currently-running agent back to paused (its output was partial)
    setAgentStates((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (updated[key].status === 'running') {
          updated[key] = { status: 'paused', text: '', elapsed: null };
          agentTextRef.current[key] = '';
        } else if (updated[key].status === 'pending') {
          updated[key] = { ...updated[key], status: 'paused' };
        }
      });
      return updated;
    });
    setIsPaused(true);
  };

  const handleResume = (feedbackText) => {
    // Find the first agent that hasn't successfully completed
    const nextAgent = AGENTS.find((a) => agentStates[a.key].status !== 'done');

    // Reset paused/non-done agents to pending for the new run
    setAgentStates((prev) => {
      const updated = { ...prev };
      AGENTS.forEach((a) => {
        if (updated[a.key].status !== 'done') {
          updated[a.key] = { status: 'pending', text: '', elapsed: null };
        }
      });
      return updated;
    });

    runParamsRef.current = {
      resumeFrom:      nextAgent?.key || null,
      previousResults: { ...agentOutputRef.current },
      feedback:        feedbackText,
    };

    setIsPaused(false);
    setIsDone(false);
    setError(null);
    setRunCount((c) => c + 1);
  };

  const handleRestart = () => {
    abortRef.current?.abort();
    agentTextRef.current  = { intent: '', architecture: '', prd: '', techspec: '', tasks: '' };
    agentOutputRef.current = {};
    runParamsRef.current   = { resumeFrom: null, previousResults: {}, feedback: '' };
    setAgentStates(initState());
    setIsPaused(false);
    setIsStopped(false);
    setIsDone(false);
    setError(null);
    setResultsData(null);
    setRunCount((c) => c + 1);
  };

  const completedCount = AGENTS.filter((a) => agentStates[a.key].status === 'done').length;
  const currentAgent   = AGENTS.find((a) => agentStates[a.key].status === 'running');
  const overallProgress = (completedCount / AGENTS.length) * 100;
  const isRunning = !isDone && !isStopped && !isPaused && !error;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-[var(--border-subtle)]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('pipeline.editInput')}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-opsera-plum to-forge-purple flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold tracking-tight">FORGE</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ProfileMenu />
          {isRunning && (
            <>
              <button
                onClick={handlePause}
                className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300
                  hover:bg-amber-400/10 px-3 py-1.5 rounded-xl transition-all
                  border border-amber-400/20 hover:border-amber-400/40"
              >
                <PauseCircle className="w-4 h-4" />
                {t('pipeline.pause')}
              </button>
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300
                  hover:bg-red-400/10 px-3 py-1.5 rounded-xl transition-all
                  border border-red-400/20 hover:border-red-400/40"
              >
                <StopCircle className="w-4 h-4" />
                {t('pipeline.stopAll')}
              </button>
            </>
          )}
        </div>
      </nav>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {/* Progress Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-white text-sm">
              {isPaused ? t('pipeline.paused') : isDone ? t('pipeline.done') : t('pipeline.processing')}
            </span>
            <div className="flex items-center gap-2 text-sm">
              {currentAgent && (
                <span className="text-forge-purple font-mono text-xs animate-pulse">
                  {currentAgent.icon} {currentAgent.name}
                </span>
              )}
              {isDone && (
                <span className="text-[#F5A83E] font-semibold flex items-center gap-1 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('pipeline.done')}
                </span>
              )}
              {isPaused && (
                <span className="text-amber-400 flex items-center gap-1 text-xs">
                  <PauseCircle className="w-3.5 h-3.5" />
                  {completedCount}/{AGENTS.length} done
                </span>
              )}
            </div>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: isPaused
                ? 'linear-gradient(90deg, #F59E0B, #F59E0B80)'
                : 'linear-gradient(90deg, #8B5CF6, #C2B0F6, #F5A83E, #F59E0B)' }}
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Agent cards */}
        <div className="space-y-3 mb-6">
          {AGENTS.map((agent) => {
            const state = agentStates[agent.key];
            return (
              <AgentCard
                key={agent.key}
                agent={agent}
                agentName={agent.name}
                agentDesc={agent.desc}
                status={state.status}
                streamText={state.text}
                elapsed={state.elapsed}
                isExpanded={expandedAgent === agent.key}
                onToggle={() => setExpandedAgent((prev) => prev === agent.key ? null : agent.key)}
              />
            );
          })}
        </div>

        {/* ── Feedback / Pause Panel ── */}
        <AnimatePresence>
          {isPaused && (
            <FeedbackPanel
              completedCount={completedCount}
              totalCount={AGENTS.length}
              onResume={handleResume}
              onRestart={handleRestart}
              t={t}
              onContinue={() => {
                // Just dismiss — pipeline stays paused, user can hit Resume later
                // or we treat cancel as "continue without feedback"
                handleResume('');
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Inline feedback during run ── */}
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-2"
          >
            <InlineFeedback onPauseWithFeedback={() => handlePause()} />
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-4 border border-red-500/30 flex items-start gap-3 mt-4"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-400 text-sm mb-1">{t('pipeline.agentError')}</div>
              <div className="text-xs text-slate-400">{error}</div>
            </div>
            <button
              onClick={handleRestart}
              className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> {t('pipeline.retry')}
            </button>
          </motion.div>
        )}

        {/* Stopped */}
        {isStopped && !isDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-5 border border-red-500/20 text-center mt-4"
          >
            <div className="text-red-400 font-semibold mb-1">{t('pipeline.stopped')}</div>
            <div className="text-sm text-slate-500 mb-4">
              {t('pipeline.stoppedSteps', { completed: completedCount, total: AGENTS.length })}
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={handleRestart} className="btn-secondary text-sm py-2 px-5 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> {t('pipeline.startOver')}
              </button>
              {completedCount > 0 && (
                <button
                  onClick={() => { setIsStopped(false); setIsPaused(true); }}
                  className="btn-primary text-sm py-2 px-5 flex items-center gap-1.5"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" /> {t('pipeline.addFeedbackResume')}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Completion */}
        <AnimatePresence>
          {isDone && resultsData && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mt-4 glass-card p-6 border border-[#F5A83E]/30 glow-amber text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-opsera-plum to-forge-purple flex items-center justify-center">
                  <Zap className="w-7 h-7 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                {mode === 'legacy' ? t('pipeline.modernizeComplete') : t('pipeline.complete')}
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                {mode === 'legacy' ? t('pipeline.modernizeDescription') : t('pipeline.readyDescription')}
              </p>
              <button
                onClick={() => onComplete(resultsData)}
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              >
                <FileCheck2 className="w-5 h-5" />
                {t('pipeline.viewResults')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Inline "pause & add feedback" hint during run ── */
function InlineFeedback({ onPauseWithFeedback }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="w-full py-2 text-xs text-[var(--text-subtle)] hover:text-[var(--accent-primary)]
          border border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/30
          rounded-xl transition-all flex items-center justify-center gap-1.5"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        {t('pipeline.steerOutput')}
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="glass-card p-4 border border-[var(--border-accent)]/20"
    >
      <p className="text-xs text-slate-500 mb-3">
        Click <strong className="text-amber-400">{t('pipeline.pause')}</strong> in the nav bar to stop the pipeline at the current
        step boundary and add corrections or new context before resuming.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onPauseWithFeedback}
          className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300
            hover:bg-amber-400/10 px-3 py-1.5 rounded-xl transition-all
            border border-amber-400/20 hover:border-amber-400/40"
        >
          <PauseCircle className="w-3.5 h-3.5" />
          {t('pipeline.pauseNow')}
        </button>
        <button onClick={() => setVisible(false)} className="text-xs text-slate-600 hover:text-slate-400 px-2 transition-colors">
          {t('pipeline.dismiss')}
        </button>
      </div>
    </motion.div>
  );
}
