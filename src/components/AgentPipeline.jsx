import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, CheckCircle2, Loader2, StopCircle, Send,
  Target, ChevronDown, ChevronUp, ArrowLeft,
  AlertCircle, FileCheck2,
} from 'lucide-react';

const AGENTS = [
  {
    key: 'intent',
    name: 'Triage',
    icon: '🔮',
    desc: 'Sorting & classifying your idea into requirements',
    color: '#8B5CF6',
    expectedChars: 6000,
  },
  {
    key: 'architecture',
    name: 'Drafthouse',
    icon: '⚙️',
    desc: 'Drafting the system blueprint & tech stack',
    color: '#06B6D4',
    expectedChars: 7000,
  },
  {
    key: 'prd',
    name: 'Press',
    icon: '📜',
    desc: 'Publishing production-grade requirement docs',
    color: '#10B981',
    expectedChars: 14000,
  },
  {
    key: 'techspec',
    name: 'Blueprint',
    icon: '🔧',
    desc: 'Writing engineering-level technical specification',
    color: '#6366F1',
    expectedChars: 14000,
  },
  {
    key: 'tasks',
    name: 'Mill',
    icon: '⚡',
    desc: 'Grinding requirements into sprint-ready tasks',
    color: '#F59E0B',
    expectedChars: 12000,
  },
];

function AgentCard({ agent, status, streamText, elapsed, isExpanded, onToggle }) {
  const isRunning = status === 'running';
  const isDone = status === 'done';
  const isPending = status === 'pending';

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
        {/* Status icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 ${
            isRunning ? 'agent-pulse' : ''
          }`}
          style={{
            background: isPending
              ? 'rgba(148,163,184,0.05)'
              : `${agent.color}20`,
            border: `1px solid ${isPending ? 'rgba(148,163,184,0.1)' : agent.color + '40'}`,
          }}
        >
          {isRunning ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: agent.color }} />
          ) : isDone ? (
            <CheckCircle2 className="w-5 h-5" style={{ color: agent.color }} />
          ) : (
            <span className={isPending ? 'opacity-30' : ''}>{agent.icon}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm ${isPending ? 'text-slate-600' : 'text-white'}`}>
              {agent.name}
            </span>
            {isRunning && (
              <span className="text-xs font-mono text-forge-purple animate-pulse">● Running</span>
            )}
            {isDone && (
              <span className="text-xs font-mono text-emerald-400">{elapsed}s</span>
            )}
          </div>
          <div className={`text-xs mt-0.5 ${isPending ? 'text-slate-700' : 'text-slate-500'}`}>
            {agent.desc}
          </div>
          {/* Per-agent progress bar */}
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
              <span className="text-xs font-mono flex-shrink-0" style={{ color: isDone ? '#10b981' : agent.color }}>
                {progress}%
              </span>
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <div className="flex items-center flex-shrink-0">
          {isDone && streamText && (
            isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      {/* Streaming output */}
      <AnimatePresence>
        {(isRunning || isExpanded) && streamText && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mx-4 mb-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <pre
                className={`stream-text max-h-48 overflow-y-auto ${isRunning ? 'cursor-blink' : ''}`}
              >
                {streamText.slice(-2000)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom shimmer bar when running */}
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

export default function AgentPipeline({ input, files = [], mode, onComplete, onReset, onBack }) {
  const [agentStates, setAgentStates] = useState({
    intent: { status: 'pending', text: '', elapsed: null },
    architecture: { status: 'pending', text: '', elapsed: null },
    prd: { status: 'pending', text: '', elapsed: null },
    techspec: { status: 'pending', text: '', elapsed: null },
    tasks: { status: 'pending', text: '', elapsed: null },
  });
  const [isStopped, setIsStopped] = useState(false);
  const [error, setError] = useState(null);
  const [correction, setCorrection] = useState('');
  const [showCorrectionPanel, setShowCorrectionPanel] = useState(false);
  const [corrections, setCorrections] = useState([]);
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [isDone, setIsDone] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const abortRef = useRef(null);
  const resultsRef = useRef(null);

  const updateAgent = useCallback((key, updates) => {
    setAgentStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const correctionNote = corrections.length > 0
      ? `\n\n[USER CORRECTIONS/NOTES]: ${corrections.join(' | ')}`
      : '';

    fetch('/api/forge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: input + correctionNote, mode, files }),
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'API error');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
              updateAgent(event.agent, { status: 'running', text: '' });
            } else if (event.type === 'agent_text') {
              setAgentStates((prev) => ({
                ...prev,
                [event.agent]: {
                  ...prev[event.agent],
                  text: prev[event.agent].text + event.text,
                },
              }));
            } else if (event.type === 'agent_done') {
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
  }, []);

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStopped(true);
  };

  const handleSendCorrection = () => {
    if (!correction.trim()) return;
    setCorrections((prev) => [...prev, correction.trim()]);
    setCorrection('');
    setShowCorrectionPanel(false);
  };

  const completedCount = Object.values(agentStates).filter((s) => s.status === 'done').length;
  const currentAgent = AGENTS.find((a) => agentStates[a.key].status === 'running');
  const overallProgress = (completedCount / AGENTS.length) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-800/50">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Edit Input
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-forge-purple to-forge-cyan flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold tracking-tight">FORGE</span>
        </div>
        <div className="flex items-center gap-2">
          {!isDone && !isStopped && (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-xl transition-all border border-red-400/20 hover:border-red-400/40"
            >
              <StopCircle className="w-4 h-4" />
              Stop
            </button>
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
            <span className="font-semibold text-white text-sm">Processing</span>
            <div className="flex items-center gap-2 text-sm">
              {currentAgent && (
                <span className="text-forge-purple font-mono text-xs animate-pulse">
                  {currentAgent.icon} {currentAgent.name}
                </span>
              )}
              {isDone && (
                <span className="text-emerald-400 font-semibold flex items-center gap-1 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete
                </span>
              )}
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #8B5CF6, #06B6D4, #10B981, #F59E0B)' }}
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
                status={state.status}
                streamText={state.text}
                elapsed={state.elapsed}
                isExpanded={expandedAgent === agent.key}
                onToggle={() => setExpandedAgent((prev) => prev === agent.key ? null : agent.key)}
              />
            );
          })}
        </div>

        {/* Correction panel */}
        {!isDone && !isStopped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <AnimatePresence>
              {showCorrectionPanel ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card p-4 border border-forge-cyan/20"
                >
                  <div className="text-xs font-semibold text-forge-cyan uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    Add Correction or Context
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Steer the remaining agents. Your note will be included in subsequent agent prompts.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={correction}
                      onChange={(e) => setCorrection(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendCorrection()}
                      placeholder="e.g. 'Use GraphQL not REST' or 'Focus on mobile-first...'"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-forge-cyan/50"
                      autoFocus
                    />
                    <button
                      onClick={handleSendCorrection}
                      disabled={!correction.trim()}
                      className="px-4 py-2 rounded-xl bg-forge-cyan/20 border border-forge-cyan/30 text-forge-cyan text-sm font-semibold hover:bg-forge-cyan/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Apply
                    </button>
                    <button
                      onClick={() => setShowCorrectionPanel(false)}
                      className="px-3 py-2 rounded-xl text-slate-500 hover:text-white text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {corrections.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {corrections.map((c, i) => (
                        <span key={i} className="text-xs bg-forge-cyan/10 border border-forge-cyan/20 text-forge-cyan px-2 py-0.5 rounded-full">
                          {c.slice(0, 50)}{c.length > 50 ? '...' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <button
                  onClick={() => setShowCorrectionPanel(true)}
                  className="w-full py-2.5 text-sm text-slate-500 hover:text-forge-cyan border border-dashed border-slate-800 hover:border-forge-cyan/30 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Add correction or context for remaining agents
                </button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-4 border border-red-500/30 flex items-start gap-3 mt-4"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-400 text-sm mb-1">Agent Error</div>
              <div className="text-xs text-slate-400">{error}</div>
              {error.includes('ANTHROPIC_API_KEY') && (
                <div className="text-xs text-slate-500 mt-2">
                  Set your API key: <code className="text-forge-cyan">ANTHROPIC_API_KEY=sk-ant-... npm run dev</code>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Stopped state */}
        {isStopped && !isDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-4 border border-amber-500/20 text-center mt-4"
          >
            <div className="text-amber-400 font-semibold mb-1">Stopped</div>
            <div className="text-sm text-slate-500 mb-3">
              {completedCount} of {AGENTS.length} steps completed.
            </div>
            <button onClick={onReset} className="btn-secondary text-sm py-2 px-5">
              Start Over
            </button>
          </motion.div>
        )}

        {/* Completion card */}
        <AnimatePresence>
          {isDone && resultsData && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mt-4 glass-card p-6 border border-emerald-500/30 glow-emerald text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-forge-purple to-forge-cyan flex items-center justify-center">
                  <Zap className="w-7 h-7 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                {mode === 'legacy' ? 'Modernization plan ready.' : 'Ready for development.'}
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                {mode === 'legacy'
                  ? 'Your refactor roadmap, architecture, and work orders are complete.'
                  : 'Your product spec, architecture, and sprint backlog are ready to build from.'}
              </p>
              <button
                onClick={() => onComplete(resultsData)}
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              >
                <FileCheck2 className="w-5 h-5" />
                View Results
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
