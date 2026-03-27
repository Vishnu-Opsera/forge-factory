import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, SkipForward, CheckCircle2, Lock } from 'lucide-react';

/* ── Brand SVG icons ─────────────────────────────────────────────────── */
function AwsIcon({ size = 40 }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 80 50" fill="none">
      {/* AWS wordmark */}
      <text x="2" y="34" fontFamily="'Amazon Ember', Arial Black, sans-serif" fontWeight="900" fontSize="30" fill="#FF9900" letterSpacing="-1">aws</text>
      {/* Arrow/smile arc */}
      <path d="M4 42 Q40 52 76 42" stroke="#FF9900" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <polygon points="72,38 78,42 72,46" fill="#FF9900"/>
    </svg>
  );
}

function AzureIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Azure triangle logo */}
      <path d="M33 8 L56 8 L80 78 L4 78 Z" fill="#0089D6"/>
      <path d="M56 8 L80 78 L56 62 Z" fill="#0065A9"/>
      <path d="M33 8 L56 62 L4 78 Z" fill="#50E6FF" opacity="0.5"/>
      <path d="M33 8 L80 78 L4 78 Z" fill="url(#azgrad)"/>
      <defs>
        <linearGradient id="azgrad" x1="33" y1="8" x2="80" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0078D4" stopOpacity="0"/>
          <stop offset="100%" stopColor="#0078D4" stopOpacity="0.3"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function GcpIcon({ size = 40 }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 100 82" fill="none">
      {/* Cloud shape */}
      <path d="M70 26 C68 16 60 10 50 10 C42 10 35 14 31 21 C26 21 18 26 18 34 C18 42 25 48 33 48 L70 48 C78 48 84 42 84 34 C84 28 78 23 70 26 Z" fill="#4285F4"/>
      {/* Colored bottom bar */}
      <rect x="18" y="54" width="15" height="8" rx="4" fill="#DB4437"/>
      <rect x="36" y="54" width="15" height="8" rx="4" fill="#F4B400"/>
      <rect x="54" y="54" width="15" height="8" rx="4" fill="#0F9D58"/>
      <rect x="72" y="54" width="12" height="8" rx="4" fill="#4285F4"/>
    </svg>
  );
}

const CLOUD_PROVIDERS = [
  {
    id: 'AWS',
    label: 'AWS',
    color: '#FF9900',
    desc: 'Market leader, broadest services',
    Icon: AwsIcon,
  },
  {
    id: 'Azure',
    label: 'Azure',
    color: '#0078D4',
    desc: 'Best for Microsoft / enterprise',
    Icon: AzureIcon,
  },
  {
    id: 'GCP',
    label: 'Google Cloud',
    color: '#4285F4',
    desc: 'Strong in data & AI workloads',
    Icon: GcpIcon,
  },
];

export default function StackDecision({ architectureData, onConfirm }) {
  const [selectedCloud, setSelectedCloud] = useState(null);
  const [toolingPref,   setToolingPref]   = useState(null);
  const [notes,         setNotes]         = useState('');

  const handleConfirm = () => {
    const services = architectureData?.cloud_options?.find(c => c.provider === selectedCloud)?.services || [];
    onConfirm({
      cloud:              selectedCloud,
      deployment_model:   'Cloud-native',
      tooling_preference: toolingPref === 'oss' ? 'OSS-first' : toolingPref === 'managed' ? 'Managed Services' : 'Forge recommendation',
      selected_services:  services,
      notes:              notes.trim() || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card border border-forge-purple/30 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-slate-800/60">
        <div className="w-8 h-8 rounded-xl bg-forge-purple/15 border border-forge-purple/25 flex items-center justify-center flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-forge-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm">Stack Decision</h3>
          <p className="text-xs text-slate-500 mt-0.5">Architecture done — pick preferences or skip to use Forge defaults.</p>
        </div>
        <button
          onClick={() => onConfirm(null)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 border border-slate-700/50 hover:border-slate-600 px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
        >
          <SkipForward className="w-3 h-3" />
          Skip all
        </button>
      </div>

      <div className="p-5 space-y-5">

        {/* Cloud Provider */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cloud Provider</p>
          <div className="grid grid-cols-3 gap-3">
            {CLOUD_PROVIDERS.map(p => {
              const active = selectedCloud === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedCloud(active ? null : p.id)}
                  className="relative flex flex-col items-center gap-2.5 py-5 px-3 rounded-2xl border-2 transition-all duration-200 text-center"
                  style={{
                    borderColor: active ? p.color : 'transparent',
                    background: active
                      ? `linear-gradient(135deg, ${p.color}18, ${p.color}06)`
                      : 'var(--bg-elevated, rgba(244,240,255,0.6))',
                    boxShadow: active ? `0 0 0 1px ${p.color}25, 0 4px 16px ${p.color}12` : 'none',
                  }}
                >
                  {/* Brand icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      background: active ? `${p.color}15` : `${p.color}0a`,
                      border: `1px solid ${active ? p.color + '40' : p.color + '20'}`,
                    }}
                  >
                    <p.Icon size={36} />
                  </div>

                  <div>
                    <div className="text-sm font-bold text-white">{p.label}</div>
                    <div className="text-xs text-slate-500 leading-tight mt-0.5">{p.desc}</div>
                  </div>

                  {active && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: p.color }}
                    >
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tooling preference */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tooling Preference</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'oss',     label: 'Open Source First', desc: 'Prefer community OSS tools', color: '#10B981' },
              { id: 'managed', label: 'Managed Services',  desc: 'Prefer cloud-native managed',  color: '#6366F1' },
            ].map(opt => {
              const active = toolingPref === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setToolingPref(active ? null : opt.id)}
                  className="relative flex flex-col items-start gap-1 py-3.5 px-4 rounded-2xl border-2 transition-all duration-200"
                  style={{
                    borderColor: active ? opt.color : 'transparent',
                    background: active
                      ? `linear-gradient(135deg, ${opt.color}18, ${opt.color}08)`
                      : 'var(--bg-elevated, rgba(244,240,255,0.6))',
                  }}
                >
                  <span className="text-sm font-semibold text-white">{opt.label}</span>
                  <span className="text-xs text-slate-500">{opt.desc}</span>
                  {active && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: opt.color }}>
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional notes */}
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Any additional constraints or notes (optional)…"
          className="w-full bg-slate-900/40 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-forge-purple/50 resize-none transition-colors"
        />

        {/* CTA */}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-forge-purple to-opsera-plum text-white shadow-lg shadow-forge-purple/20 hover:shadow-forge-purple/35 transition-all"
          >
            <Zap className="w-4 h-4" />
            {selectedCloud ? `Generate with ${selectedCloud}` : 'Generate Documents'}
          </button>
          <button
            onClick={() => onConfirm(null)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs text-slate-500 hover:text-slate-300 border border-slate-700/50 hover:border-slate-600 transition-all"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip
          </button>
        </div>
      </div>
    </motion.div>
  );
}
