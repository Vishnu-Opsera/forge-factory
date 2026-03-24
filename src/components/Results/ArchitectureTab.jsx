import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Server, Database, Cloud, Cpu, AlertCircle, Layers, RefreshCw } from 'lucide-react';
import { getMermaid, sanitizeDiagram, nextRenderId } from '../../lib/mermaid-singleton.js';

// ── Fixed MermaidDiagram ──────────────────────────────────────────────────────
// Initialize mermaid exactly once (module singleton) — calling initialize()
// on every render breaks Mermaid v11 theme state.
export function MermaidDiagram({ diagram }) {
  const containerRef = useRef(null);
  const [state, setState] = useState('loading'); // 'loading' | 'ok' | 'error'
  const [errMsg, setErrMsg] = useState('');
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!diagram) { setState('error'); setErrMsg('No diagram data'); return; }

    cancelRef.current = false;
    setState('loading');
    setErrMsg('');
    if (containerRef.current) containerRef.current.innerHTML = '';

    const id = nextRenderId();

    getMermaid()
      .then(async (mermaid) => {
        if (cancelRef.current) return;
        const clean = sanitizeDiagram(diagram);
        const { svg } = await mermaid.render(id, clean);
        if (cancelRef.current || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        // Make SVG fully responsive
        const svgEl = containerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.removeAttribute('height');
          svgEl.style.cssText = 'max-width:100%;height:auto;display:block;';
        }
        setState('ok');
      })
      .catch((err) => {
        if (cancelRef.current) return;
        console.warn('[Mermaid]', err.message);
        setErrMsg(err.message);
        setState('error');
      });

    return () => { cancelRef.current = true; };
  }, [diagram]);

  if (state === 'error') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-amber-400">
          <AlertCircle className="w-3.5 h-3.5" />
          Diagram could not be rendered — showing source
        </div>
        <pre className="text-xs text-slate-500 bg-slate-900/60 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap max-h-60">
          {sanitizeDiagram(diagram)}
        </pre>
      </div>
    );
  }

  return (
    <div className="relative min-h-[80px]">
      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Rendering diagram…
        </div>
      )}
      <div
        ref={containerRef}
        className="mermaid-container overflow-x-auto"
        style={{ opacity: state === 'loading' ? 0 : 1, transition: 'opacity 0.3s' }}
      />
    </div>
  );
}

// ── Tech stack icons ──────────────────────────────────────────────────────────
const STACK_ICONS = { frontend: Code2, backend: Server, database: Database, infrastructure: Cloud, ai_ml: Cpu };
const STACK_COLORS = { frontend: '#8B5CF6', backend: '#06B6D4', database: '#10B981', infrastructure: '#F59E0B', ai_ml: '#EC4899' };

// ── Main component ────────────────────────────────────────────────────────────
export default function ArchitectureTab({ data }) {
  if (!data || typeof data === 'string') {
    return <div className="glass-card p-6"><pre className="stream-text whitespace-pre-wrap">{typeof data === 'string' ? data : 'No architecture data'}</pre></div>;
  }

  return (
    <div className="space-y-5">
      {/* Diagram */}
      {data.mermaid && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-forge-cyan" />
            <span className="font-semibold text-white text-sm">System Architecture</span>
            {data.style && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-forge-cyan/10 text-forge-cyan border border-forge-cyan/20">{data.style}</span>
            )}
          </div>
          <MermaidDiagram diagram={data.mermaid} />
        </motion.div>
      )}

      {/* Tech stack */}
      {data.tech_stack && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-forge-purple" />Technology Stack
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data.tech_stack).map(([layer, techs]) => {
              const Icon = STACK_ICONS[layer] || Code2;
              const color = STACK_COLORS[layer] || '#8B5CF6';
              const label = layer.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <div key={layer} className="p-3 rounded-xl" style={{ background: color + '08', border: `1px solid ${color}20` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                    <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(techs) ? techs : [techs]).map((tech, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60">{tech}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Key decisions */}
      {data.key_decisions?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-forge-emerald" />Architectural Decisions
          </h3>
          <div className="space-y-3">
            {data.key_decisions.map((d, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-forge-emerald/10 border border-forge-emerald/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-forge-emerald">{i + 1}</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-200 text-sm">{d.title || d.decision || d.choice || 'Decision'}</div>
                  {d.choice && <div className="text-xs text-forge-cyan mt-0.5">{d.choice}</div>}
                  {d.rationale && <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{d.rationale}</div>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Meta */}
      {(data.api_design || data.deployment || data.estimated_cost) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex gap-4">
          {data.api_design && <div className="glass-card p-4 flex-1 text-center"><div className="text-lg font-black text-forge-purple">{data.api_design}</div><div className="text-xs text-slate-500 mt-1">API Design</div></div>}
          {data.deployment && <div className="glass-card p-4 flex-1 text-center"><div className="text-lg font-black text-forge-cyan capitalize">{data.deployment}</div><div className="text-xs text-slate-500 mt-1">Deployment</div></div>}
          {data.estimated_cost && <div className="glass-card p-4 flex-1 text-center"><div className="text-lg font-black text-forge-emerald">{data.estimated_cost}</div><div className="text-xs text-slate-500 mt-1">Est. Cost</div></div>}
        </motion.div>
      )}
    </div>
  );
}
