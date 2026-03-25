import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Upload, FileText, ArrowLeft, ChevronRight, Lightbulb, Wrench, Layers, X, Image, Sheet, File } from 'lucide-react';
import * as XLSX from 'xlsx';
import LegacyInput from './legacy/LegacyInput.jsx';

const EXAMPLES = {
  new_product: [
    'A SaaS analytics platform that helps e-commerce teams track customer journey from first touch to purchase, with AI-powered recommendations and cohort analysis.',
    'A developer productivity tool that analyzes git commits and code reviews to generate weekly engineering metrics, identify bottlenecks, and suggest process improvements.',
    'A B2B marketplace connecting enterprise procurement teams with vetted software vendors, featuring AI-driven matching and contract intelligence.',
  ],
};

const ACCEPT = '.txt,.md,.pdf,.docx,.csv,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.js,.ts,.py,.java,.go';

function fileIcon(file) {
  if (file.isImage) return Image;
  if (['xls', 'xlsx', 'csv'].includes(file.ext)) return Sheet;
  return File;
}

function FileChip({ file, onRemove }) {
  const Icon = fileIcon(file);
  return (
    <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg px-2 py-1 text-xs text-slate-300 max-w-[180px]">
      {file.isImage && file.preview ? (
        <img src={file.preview} alt={file.name} className="w-4 h-4 rounded object-cover flex-shrink-0" />
      ) : (
        <Icon className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
      )}
      <span className="truncate flex-1">{file.name}</span>
      <button onClick={() => onRemove(file.id)} className="text-slate-600 hover:text-red-400 flex-shrink-0 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

async function processFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const isImage = file.type.startsWith('image/');
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  if (isImage) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({
        id, name: file.name, ext, isImage: true,
        type: file.type, content: e.target.result, preview: e.target.result,
      });
      reader.readAsDataURL(file);
    });
  }

  if (ext === 'xlsx' || ext === 'xls') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const lines = [];
          wb.SheetNames.forEach(name => {
            const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
            lines.push(`[Sheet: ${name}]\n${csv}`);
          });
          resolve({ id, name: file.name, ext, isImage: false, type: file.type, content: lines.join('\n\n') });
        } catch {
          resolve({ id, name: file.name, ext, isImage: false, type: file.type, content: `[Could not parse ${file.name}]` });
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Text-based: txt, md, csv, pdf, code files, docx (best-effort)
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ id, name: file.name, ext, isImage: false, type: file.type, content: e.target.result });
    reader.readAsText(file);
  });
}

export default function InputPanel({ onForge, onBack, baseline, onClearBaseline }) {
  const [mode, setMode] = useState('new_product');
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (baseline?.context) setInput(baseline.context);
  }, [baseline]);

  const handleForge = (textOverride) => {
    const text = textOverride || input;
    if (!text?.trim() && attachedFiles.length === 0) return;
    onForge(text.trim(), mode, attachedFiles);
  };

  const handleAnalysisComplete = (analysisData) => {
    const contextSummary = [
      analysisData.auto_intent, '',
      `[ANALYSIS CONTEXT]`,
      `Repo: ${analysisData.repo_name || 'Unknown'}`,
      `Tech Stack: ${[...(analysisData.tech_stack?.languages || []), ...(analysisData.tech_stack?.frameworks || [])].join(', ')}`,
      `Code Quality: ${analysisData.code_quality}`,
      `Complexity: ${analysisData.complexity}`,
      `Migration Strategy: ${analysisData.migration_strategy || 'TBD'}`,
      `Effort: ${analysisData.estimated_effort || 'TBD'}`,
      analysisData.issues?.length ? `Key Issues: ${analysisData.issues.slice(0, 3).map(i => i.issue).join(' | ')}` : '',
      analysisData.quick_wins?.length ? `Quick Wins: ${analysisData.quick_wins.slice(0, 3).join(' | ')}` : '',
    ].filter(Boolean).join('\n');
    onForge(contextSummary, 'legacy', []);
  };

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).slice(0, 5); // max 5 files
    const processed = await Promise.all(files.map(processFile));
    setAttachedFiles(prev => [...prev, ...processed]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id) => setAttachedFiles(prev => prev.filter(f => f.id !== id));

  const canForge = input.trim() || attachedFiles.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-800/50">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-opsera-plum to-forge-purple flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold tracking-tight">FORGE</span>
        </div>
        <div className="w-16" />
      </nav>

      <div className="flex-1 flex flex-col items-center px-6 py-10 max-w-4xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 w-full">
          <h2 className="text-4xl font-black text-white mb-2">What are we building?</h2>
          <p className="text-slate-400 text-lg">
            {mode === 'legacy'
              ? 'Upload code, paste a GitHub URL, or drop a ZIP — AI will analyze it automatically.'
              : 'Describe your idea, paste a PRD, or upload docs, images, or spreadsheets.'}
          </p>
        </motion.div>

        {/* Baseline banner */}
        {baseline && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full mb-6 p-4 rounded-xl border border-forge-purple/40 bg-forge-purple/10 flex items-start gap-3">
            <Layers className="w-5 h-5 text-forge-purple flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono font-bold text-forge-purple text-sm">{baseline.version?.ref}</span>
                <span className="text-xs text-slate-500">v{baseline.version?.semver}</span>
                <span className="text-xs bg-forge-purple/20 text-forge-purple px-2 py-0.5 rounded-full border border-forge-purple/30">Forking from baseline</span>
              </div>
              <div className="text-xs text-slate-400">{baseline.project?.name} — artifacts loaded into prompt below. Edit to steer the AI.</div>
            </div>
            <button onClick={onClearBaseline} className="text-slate-600 hover:text-white transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Mode toggle */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex glass-card p-1 gap-1 mb-8 w-full max-w-md">
          {[
            { id: 'new_product', label: 'New Product', icon: Lightbulb },
            { id: 'legacy', label: 'Modernize Legacy', icon: Wrench },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                mode === m.id
                  ? 'bg-gradient-to-r from-forge-purple/80 to-forge-purple/60 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <m.icon className="w-4 h-4" />
              {m.label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'legacy' && (
            <motion.div key="legacy-input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
              <LegacyInput onAnalysisComplete={handleAnalysisComplete} onSkipToForge={() => setMode('legacy_manual')} />
            </motion.div>
          )}

          {(mode === 'new_product' || mode === 'legacy_manual') && (
            <motion.div key="text-input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-4">
              {mode === 'legacy_manual' && (
                <button onClick={() => setMode('legacy')} className="text-xs text-slate-500 hover:text-forge-purple transition-colors flex items-center gap-1">
                  ← Back to code upload
                </button>
              )}

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative glass-card transition-all duration-200 ${isDragging ? 'border-forge-purple/60 glow-purple' : ''}`}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleForge(); }}
                  placeholder={
                    mode === 'legacy_manual'
                      ? 'Describe your legacy application...\n\nInclude: current tech stack, age of system, pain points, target architecture, team size, timeline.'
                      : 'Describe your product idea in detail...\n\nTell us about: target users, core features, business goals, technical constraints.\nOr paste an existing PRD, meeting notes, or requirements document.'
                  }
                  className="w-full bg-transparent text-slate-200 placeholder-slate-600 resize-none outline-none p-6 text-base leading-relaxed min-h-[220px]"
                  autoFocus
                />

                {/* Attached file chips */}
                {attachedFiles.length > 0 && (
                  <div className="px-4 pb-3 flex flex-wrap gap-2">
                    {attachedFiles.map(f => (
                      <FileChip key={f.id} file={f} onRemove={removeFile} />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-forge-purple text-xs transition-colors py-1.5 px-2 rounded-lg hover:bg-forge-purple/10"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Attach files
                    </button>
                    <span className="text-slate-700 text-xs">·</span>
                    <span className="text-slate-600 text-xs">Images, XLS, CSV, PDF, Docs</span>
                  </div>
                  <span className="text-slate-700 text-xs font-mono">⌘↵ to forge</span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              <button
                onClick={() => handleForge()}
                disabled={!canForge}
                className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all duration-300 ${
                  canForge ? 'btn-primary' : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-700/50'
                }`}
              >
                <Zap className="w-5 h-5" />
                Forge It — Launch AI Agents
                {canForge && <ChevronRight className="w-5 h-5" />}
              </button>

              {mode === 'new_product' && (
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText className="w-3 h-3" />Try an example
                  </p>
                  <div className="space-y-2">
                    {EXAMPLES.new_product.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(ex)}
                        className="w-full text-left text-sm text-slate-500 hover:text-slate-300 transition-colors py-2 px-3 rounded-xl hover:bg-slate-800/50 line-clamp-2 border border-transparent hover:border-slate-700/50"
                      >
                        {ex.slice(0, 120)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
