import { motion } from 'framer-motion';
import { Zap, ArrowRight, Code2, Layers, GitBranch, Shield } from 'lucide-react';

const features = [
  { icon: Code2, label: 'Triage', desc: 'Sorts & classifies any input into structured requirements' },
  { icon: Layers, label: 'Drafthouse', desc: 'Drafts system architecture & diagrams automatically' },
  { icon: GitBranch, label: 'Press', desc: 'Publishes production-grade PRDs from requirements' },
  { icon: Shield, label: 'Mill', desc: 'Grinds requirements into Jira-ready sprint tasks' },
];

const stats = [
  { value: '70%', label: 'Faster time to code' },
  { value: '<1hr', label: 'Requirements to PRD' },
  { value: '4', label: 'AI agents working for you' },
  { value: 'Day 0', label: 'Ship on Day Zero' },
];

export default function Hero({ onStart, onALM }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-forge-purple to-forge-cyan flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">FORGE</span>
          <span className="ml-2 text-xs font-mono text-forge-purple bg-forge-purple/10 border border-forge-purple/20 px-2 py-0.5 rounded-full">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="hidden sm:block">An Opsera Product</span>
          <button onClick={onALM} className="btn-secondary text-sm py-2 px-4">ALM</button>
          <button onClick={onStart} className="btn-primary text-sm py-2 px-5">Launch App</button>
        </div>
      </nav>

      {/* Hero content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-20 text-center relative z-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 bg-forge-purple/10 border border-forge-purple/20 text-forge-purple text-sm font-medium px-4 py-1.5 rounded-full mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-forge-purple animate-pulse" />
          AI-Powered Software Modernization
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none mb-6"
        >
          <span className="text-white">From idea to</span>
          <br />
          <span className="gradient-text">production-ready</span>
          <br />
          <span className="text-white">in hours.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed"
        >
          Forge uses 4 specialized AI agents to transform your ideas, meeting notes, or legacy code
          into a complete PRD, architecture diagrams, and sprint-ready development tasks — in minutes.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          <button onClick={onStart} className="btn-primary flex items-center justify-center gap-2 text-base py-4 px-10">
            <Zap className="w-5 h-5" />
            Start Forging
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onStart}
            className="btn-secondary flex items-center justify-center gap-2 text-base py-4 px-10"
          >
            <Code2 className="w-5 h-5" />
            Modernize Legacy App
          </button>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-800/80 mb-20 w-full max-w-3xl"
        >
          {stats.map((s) => (
            <div key={s.label} className="bg-forge-navy/60 px-6 py-5 text-center">
              <div className="text-3xl font-black gradient-text mb-1">{s.value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="glass-card-hover p-6 text-left group cursor-default"
            >
              <div className="w-10 h-10 rounded-xl bg-forge-purple/10 border border-forge-purple/20 flex items-center justify-center mb-4 group-hover:border-forge-purple/50 transition-colors">
                <f.icon className="w-5 h-5 text-forge-purple" />
              </div>
              <div className="font-semibold text-white mb-1">{f.label}</div>
              <div className="text-sm text-slate-500">{f.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-600 relative z-10">
        Forge Platform — Day 0: Develop · Day 1: Deploy · Day 2: Monitor
      </footer>
    </div>
  );
}
