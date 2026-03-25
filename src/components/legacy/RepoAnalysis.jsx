import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, AlertCircle, Info, Zap, Code2,
  Server, Database, Cloud, ChevronDown, ChevronUp, Edit3, Rocket,
  GitBranch, Clock, Layers, Shield, TrendingUp, Wrench,
} from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle, color: '#EF4444', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Critical' },
  high: { icon: AlertTriangle, color: '#F59E0B', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'High' },
  medium: { icon: Info, color: '#C2B0F6', bg: 'bg-forge-whisper/10', border: 'border-forge-whisper/20', label: 'Medium' },
  low: { icon: CheckCircle2, color: '#F5A83E', bg: 'bg-[#F5A83E]/10', border: 'border-[#F5A83E]/20', label: 'Low' },
};

const PRIORITY_COLORS = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#8B5CF6',
  low: '#F5A83E',
};

const CATEGORY_ICONS = {
  Architecture: Layers,
  Security: Shield,
  Performance: TrendingUp,
  'Developer Experience': Code2,
  Testing: CheckCircle2,
  Infrastructure: Cloud,
  Database: Database,
};

const QUALITY_CONFIG = {
  poor: { color: '#EF4444', label: 'Poor', bar: 15 },
  fair: { color: '#F59E0B', label: 'Fair', bar: 45 },
  good: { color: '#F5A83E', label: 'Good', bar: 75 },
  excellent: { color: '#C2B0F6', label: 'Excellent', bar: 95 },
};

const COMPLEXITY_LABELS = {
  simple: 'Simple', moderate: 'Moderate', complex: 'Complex', very_complex: 'Very Complex',
  low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very High',
};

function TechBadge({ label, color }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full border font-medium"
      style={{ color, borderColor: color + '40', background: color + '12' }}
    >
      {label}
    </span>
  );
}

function IssueCard({ issue }) {
  const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.medium;
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-xl ${cfg.bg} border ${cfg.border}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
      <div className="min-w-0">
        <span className="text-xs font-semibold mr-1.5" style={{ color: cfg.color }}>{issue.category}</span>
        <span className="text-xs text-slate-400">{issue.issue}</span>
      </div>
    </div>
  );
}

function SuggestionCard({ s }) {
  const color = PRIORITY_COLORS[s.priority] || '#8B5CF6';
  const Icon = CATEGORY_ICONS[s.category] || Wrench;
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800/60 hover:border-slate-700/60 transition-colors">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '15', border: `1px solid ${color}30` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-slate-200">{s.title}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ color, background: color + '15' }}>{s.priority}</span>
          {s.effort && <span className="text-xs text-slate-600">{s.effort}</span>}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{s.description}</p>
      </div>
    </div>
  );
}

export default function RepoAnalysis({ data, onForge, onSkip }) {
  const [editingIntent, setEditingIntent] = useState(false);
  const [intentText, setIntentText] = useState(data.auto_intent || '');
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const quality = QUALITY_CONFIG[data.code_quality] || QUALITY_CONFIG.fair;
  const issues = data.issues || [];
  const suggestions = data.modernization_suggestions || [];
  const criticalCount = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  const allLanguages = [
    ...(data.tech_stack?.languages || []),
    ...(data.tech_stack?.frameworks || []),
    ...(data.tech_stack?.databases || []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 glass-card border-[#F5A83E]/20">
        <CheckCircle2 className="w-5 h-5 text-[#F5A83E] flex-shrink-0" />
        <div className="flex-1">
          <div className="font-bold text-white">{data.repo_name || 'Repository Analyzed'}</div>
          <div className="text-sm text-slate-500">{data.description || 'Analysis complete'}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold" style={{ color: quality.color }}>{quality.label} Quality</div>
          <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: quality.color }}
              initial={{ width: 0 }}
              animate={{ width: `${quality.bar}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-black text-forge-purple">{data.tech_stack?.primary_language || '—'}</div>
          <div className="text-xs text-slate-500">Primary Language</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-black" style={{ color: criticalCount > 3 ? '#EF4444' : '#F59E0B' }}>
            {criticalCount}
          </div>
          <div className="text-xs text-slate-500">Critical Issues</div>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="text-lg font-black text-slate-300">
            {COMPLEXITY_LABELS[data.complexity] || '—'}
          </div>
          <div className="text-xs text-slate-500">Complexity</div>
        </div>
      </div>

      {/* Tech stack */}
      {allLanguages.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-3.5 h-3.5 text-forge-purple" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tech Stack</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(data.tech_stack?.languages || []).map((l) => <TechBadge key={l} label={l} color="#8B5CF6" />)}
            {(data.tech_stack?.frameworks || []).map((f) => <TechBadge key={f} label={f} color="#C2B0F6" />)}
            {(data.tech_stack?.databases || []).map((d) => <TechBadge key={d} label={d} color="#F5A83E" />)}
            {(data.tech_stack?.infrastructure || []).map((i) => <TechBadge key={i} label={i} color="#F59E0B" />)}
            {(data.tech_stack?.build_tools || []).map((b) => <TechBadge key={b} label={b} color="#94A3B8" />)}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="flex gap-3">
        {data.age_estimate && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-900/50 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Clock className="w-3 h-3" />
            ~{data.age_estimate} old
          </div>
        )}
        {data.migration_strategy && (
          <div className="flex items-center gap-1.5 text-xs text-forge-whisper bg-forge-whisper/5 border border-forge-whisper/20 px-3 py-1.5 rounded-xl">
            <GitBranch className="w-3 h-3" />
            {data.migration_strategy.replace('-', ' ')}
          </div>
        )}
        {data.estimated_effort && (
          <div className="flex items-center gap-1.5 text-xs text-forge-amber bg-forge-amber/5 border border-forge-amber/20 px-3 py-1.5 rounded-xl">
            <Clock className="w-3 h-3" />
            {data.estimated_effort}
          </div>
        )}
      </div>

      {/* Quick wins */}
      {data.quick_wins?.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-forge-amber" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Wins</span>
          </div>
          <div className="space-y-1.5">
            {data.quick_wins.map((win, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-forge-amber flex-shrink-0 mt-0.5" />
                {win}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-forge-amber" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Detected Issues ({issues.length})
              </span>
            </div>
            {issues.length > 3 && (
              <button
                onClick={() => setShowAllIssues(!showAllIssues)}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
              >
                {showAllIssues ? 'Show less' : `+${issues.length - 3} more`}
                {showAllIssues ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(showAllIssues ? issues : issues.slice(0, 3)).map((issue, i) => (
              <IssueCard key={i} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Modernization suggestions */}
      {suggestions.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Rocket className="w-3.5 h-3.5 text-forge-purple" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Modernization Suggestions ({suggestions.length})
              </span>
            </div>
            {suggestions.length > 3 && (
              <button
                onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
              >
                {showAllSuggestions ? 'Show less' : `+${suggestions.length - 3} more`}
                {showAllSuggestions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(showAllSuggestions ? suggestions : suggestions.slice(0, 3)).map((s, i) => (
              <SuggestionCard key={i} s={s} />
            ))}
          </div>
        </div>
      )}

      {/* Auto-generated intent (editable) */}
      <div className="glass-card p-4 border-forge-purple/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-forge-purple" />
            <span className="text-xs font-semibold text-forge-purple uppercase tracking-wider">
              Auto-Generated Intent
            </span>
            <span className="text-xs text-slate-600">— will be sent to all agents</span>
          </div>
          <button
            onClick={() => setEditingIntent(!editingIntent)}
            className="text-xs text-slate-500 hover:text-forge-purple flex items-center gap-1 transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            {editingIntent ? 'Done' : 'Edit'}
          </button>
        </div>
        {editingIntent ? (
          <textarea
            value={intentText}
            onChange={(e) => setIntentText(e.target.value)}
            className="w-full bg-slate-900/80 border border-forge-purple/30 rounded-xl p-3 text-sm text-slate-300 outline-none resize-none min-h-[100px] focus:border-forge-purple/60 leading-relaxed"
            autoFocus
          />
        ) : (
          <p className="text-sm text-slate-400 leading-relaxed">{intentText}</p>
        )}
      </div>

      {/* CTA buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            const updated = { ...data, auto_intent: intentText };
            onForge(updated);
          }}
          className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
        >
          <Zap className="w-4 h-4" />
          Forge Modernization Plan
        </button>
        <button
          onClick={onSkip}
          className="btn-secondary py-3 px-4 text-sm"
        >
          Manual Input
        </button>
      </div>
    </motion.div>
  );
}
