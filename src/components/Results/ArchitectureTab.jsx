import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Server, Database, Cloud, Cpu, AlertCircle, Layers, RefreshCw, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';
import { getMermaid, sanitizeDiagram, nextRenderId } from '../../lib/mermaid-singleton.js';

// ── Mermaid renderer ──────────────────────────────────────────────────────────
export function MermaidDiagram({ diagram }) {
  const containerRef = useRef(null);
  const [state, setState] = useState('loading');
  const [errMsg, setErrMsg] = useState('');
  const cancelRef = useRef(false);
  // Re-render when theme changes
  const [themeKey, setThemeKey] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark'
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeKey(document.documentElement.getAttribute('data-theme') || 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

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
  }, [diagram, themeKey]);

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
    <div className="relative min-h-[80px] rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />Rendering diagram…
        </div>
      )}
      <div
        ref={containerRef}
        className="mermaid-container overflow-x-auto p-4"
        style={{ opacity: state === 'loading' ? 0 : 1, transition: 'opacity 0.3s' }}
      />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STACK_ICONS  = { frontend: Code2, backend: Server, database: Database, infrastructure: Cloud, ai_ml: Cpu };
const STACK_COLORS = { frontend: '#8B5CF6', backend: '#C2B0F6', database: '#F5A83E', infrastructure: '#F59E0B', ai_ml: '#EC4899' };

function tryParseArch(raw) {
  if (!raw || typeof raw !== 'string') return null;
  // strip ```json fences
  const stripped = raw.replace(/```(?:json)?\n?|\n?```/g, '').trim();
  try { return JSON.parse(stripped); } catch {}
  // try to find outermost JSON object anywhere in the string
  const match = stripped.match(/(\{[\s\S]*\})/);
  if (match) try { return JSON.parse(match[0]); } catch {}
  // try last resort: find the longest valid JSON substring
  const start = stripped.indexOf('{');
  if (start !== -1) {
    for (let end = stripped.lastIndexOf('}'); end > start; end--) {
      try { const r = JSON.parse(stripped.slice(start, end + 1)); return r; } catch {}
    }
  }
  return null;
}

/* ── Collapsible raw text fallback ───────────────────────────────────── */
function CollapsibleRaw({ text, label = 'Raw Data' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card overflow-hidden border border-slate-800/60">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-amber-400">{label}</span>
          <span className="text-xs text-slate-600">— could not render as diagram</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <pre className="px-4 pb-4 text-xs text-slate-500 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed border-t border-slate-800/50">
              {text}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function extractMermaid(raw) {
  const m =
    raw.match(/```mermaid\s*([\s\S]*?)```/) ||
    raw.match(/(flowchart\s+\w+[\s\S]+?)(?:\n\n|\n(?=[A-Z{"]))/);
  return m ? m[1].trim() : null;
}

const LAYER_COLORS = ['#8B5CF6', '#10B981', '#F5A83E', '#F59E0B', '#6366F1', '#EC4899'];

// ── Semantic layers ───────────────────────────────────────────────────────────
function SemanticLayers({ layers }) {
  if (!layers?.length) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6">
      <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
        <Layers className="w-4 h-4 text-forge-whisper" />Architecture Layers
      </h3>
      <div className="space-y-3">
        {layers.map((layer, i) => {
          const color = LAYER_COLORS[i % LAYER_COLORS.length];
          return (
            <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ background: color + '08', border: `1px solid ${color}20` }}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: color + '20', border: `1px solid ${color}40` }}>
                <span className="text-xs font-bold" style={{ color }}>{i + 1}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">{layer.layer}</span>
                </div>
                <p className="text-xs text-slate-400 mb-2 leading-relaxed">{layer.responsibility}</p>
                {layer.components?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {layer.components.map(c => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded-full border"
                        style={{ color, borderColor: color + '40', background: color + '10' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ArchitectureTab({ data: rawData }) {
  // If data is a string, try to parse it as JSON first
  let data = typeof rawData === 'string' ? (tryParseArch(rawData) || rawData) : rawData;

  // String fallback — extract mermaid if possible
  if (!data || typeof data === 'string') {
    const extracted = extractMermaid(data || '');
    return (
      <div className="space-y-5">
        {extracted ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-forge-whisper" />
              <span className="font-semibold text-white text-sm">System Architecture</span>
            </div>
            <MermaidDiagram diagram={extracted} />
          </motion.div>
        ) : null}
        {data && <CollapsibleRaw text={data} label="Architecture Source" />}
      </div>
    );
  }

  // Normalise field aliases (legacy mode may use `diagram` instead of `mermaid`)
  if (!data.mermaid && data.diagram) data = { ...data, mermaid: data.diagram };

  return (
    <div className="space-y-5">

      {/* Mermaid diagram */}
      {data.mermaid && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-forge-whisper" />
            <span className="font-semibold text-white text-sm">System Architecture</span>
            {data.style && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-forge-whisper/10 text-forge-whisper border border-forge-whisper/20">
                {data.style}
              </span>
            )}
          </div>
          <MermaidDiagram diagram={data.mermaid} />
        </motion.div>
      )}

      {/* Semantic layers */}
      <SemanticLayers layers={data.semantic_layers} />

      {/* Tech stack */}
      {data.tech_stack && Object.keys(data.tech_stack).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-forge-purple" />Technology Stack
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(data.tech_stack).map(([layer, techs]) => {
              const Icon  = STACK_ICONS[layer]  || Code2;
              const color = STACK_COLORS[layer] || '#8B5CF6';
              const label = layer.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
              return (
                <div key={layer} className="p-3 rounded-xl" style={{ background: color + '08', border: `1px solid ${color}20` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                    <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(techs) ? techs : [techs]).map((tech, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        {tech}
                      </span>
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
            <Server className="w-4 h-4 text-forge-amber" />Architectural Decisions
          </h3>
          <div className="space-y-3">
            {data.key_decisions.map((d, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="w-6 h-6 rounded-full bg-forge-amber/10 border border-forge-amber/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-forge-amber">{i + 1}</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-200 text-sm mb-0.5">
                    {d.title || d.decision || d.choice || 'Decision'}
                  </div>
                  {d.choice && <div className="text-xs text-forge-whisper mt-0.5 mb-0.5">{d.choice}</div>}
                  {d.rationale && <div className="text-xs text-slate-500 leading-relaxed">{d.rationale}</div>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Meta chips */}
      {(data.api_design || data.deployment || data.estimated_cost) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex gap-3">
          {data.api_design    && <div className="glass-card p-4 flex-1 text-center"><div className="text-lg font-black text-forge-purple">{data.api_design}</div><div className="text-xs text-slate-500 mt-1">API Design</div></div>}
          {data.deployment    && <div className="glass-card p-4 flex-1 text-center"><div className="text-lg font-black text-forge-whisper capitalize">{data.deployment}</div><div className="text-xs text-slate-500 mt-1">Deployment</div></div>}
          {data.estimated_cost && <div className="glass-card p-4 flex-1 text-center"><div className="text-lg font-black text-forge-amber">{data.estimated_cost}</div><div className="text-xs text-slate-500 mt-1">Est. Cost</div></div>}
        </motion.div>
      )}

      {/* If nothing meaningful rendered, show raw as collapsible */}
      {!data.mermaid && !data.semantic_layers?.length && !data.tech_stack && !data.key_decisions?.length && (
        <CollapsibleRaw text={JSON.stringify(data, null, 2)} label="Architecture Data" />
      )}
    </div>
  );
}
