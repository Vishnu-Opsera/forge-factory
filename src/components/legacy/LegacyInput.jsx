import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, FolderOpen, FileArchive, Loader2, AlertCircle, ArrowRight, Zap, History, X } from 'lucide-react';
import RepoAnalysis from './RepoAnalysis.jsx';
import { saveDraft, updateDraft, loadDrafts, deleteDraft } from '../../store/legacyDraftStore.js';

const METHODS = [
  { id: 'github', icon: Github, label: 'GitHub URL', desc: 'Public repo URL', color: '#8B5CF6' },
  { id: 'folder', icon: FolderOpen, label: 'Local Folder', desc: 'Browse & upload files', color: '#C2B0F6' },
  { id: 'zip', icon: FileArchive, label: 'ZIP File', desc: 'Upload a .zip archive', color: '#F5A83E' },
];

const RELEVANT_EXTENSIONS = new Set([
  'json', 'xml', 'gradle', 'toml', 'txt', 'md', 'rst',
  'yml', 'yaml', 'properties', 'env', 'cfg', 'ini', 'conf',
  'dockerfile', 'makefile',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'py', 'java', 'go', 'rs', 'rb', 'php', 'cs', 'cpp', 'c', 'h',
  'sql', 'graphql', 'gql', 'proto',
  'sh', 'bash', 'zsh',
  'tf', 'tfvars', 'bicep', 'hcl',
]);

const PRIORITY_FILES = new Set([
  'package.json', 'pom.xml', 'build.gradle', 'requirements.txt', 'go.mod', 'cargo.toml',
  'dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'readme.md', '.env.example',
  'tsconfig.json', 'angular.json', 'next.config.js', 'vite.config.js', 'webpack.config.js',
  'application.yml', 'application.properties', 'makefile',
]);

function isRelevantFile(path) {
  const name = path.split('/').pop().toLowerCase();
  const ext = name.split('.').pop();
  if (PRIORITY_FILES.has(name)) return true;
  if (RELEVANT_EXTENSIONS.has(ext)) return true;
  return false;
}

async function extractFilesFromFolder(fileList) {
  const files = [];
  const sorted = Array.from(fileList).sort((a, b) => {
    const aPriority = PRIORITY_FILES.has(a.name.toLowerCase()) ? 0 : 1;
    const bPriority = PRIORITY_FILES.has(b.name.toLowerCase()) ? 0 : 1;
    return aPriority - bPriority;
  });

  for (const file of sorted.slice(0, 50)) {
    if (!isRelevantFile(file.name) && !isRelevantFile(file.webkitRelativePath || file.name)) continue;
    if (file.size > 200000) continue; // skip files > 200KB
    try {
      const content = await file.text();
      files.push({ path: file.webkitRelativePath || file.name, content: content.slice(0, 3000) });
    } catch {}
  }
  return files;
}

async function extractFilesFromZip(file) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const files = [];

  const entries = Object.entries(zip.files)
    .filter(([path, entry]) => !entry.dir && isRelevantFile(path))
    .sort(([a], [b]) => {
      const ap = PRIORITY_FILES.has(a.split('/').pop().toLowerCase()) ? 0 : 1;
      const bp = PRIORITY_FILES.has(b.split('/').pop().toLowerCase()) ? 0 : 1;
      return ap - bp;
    })
    .slice(0, 50);

  for (const [path, entry] of entries) {
    try {
      const content = await entry.async('text');
      files.push({ path, content: content.slice(0, 3000) });
    } catch {}
  }
  return files;
}

export default function LegacyInput({ onAnalysisComplete, onSkipToForge }) {
  const [method, setMethod] = useState('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [streamLog, setStreamLog] = useState([]);
  const [error, setError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const folderRef = useRef();
  const zipRef = useRef();
  const abortRef = useRef();
  const draftIdRef = useRef(null);

  const [recentDrafts, setRecentDrafts] = useState(() =>
    loadDrafts().filter(d => d.status === 'complete').slice(0, 3)
  );

  const refreshDrafts = () =>
    setRecentDrafts(loadDrafts().filter(d => d.status === 'complete').slice(0, 3));

  const startSSEAnalysis = async (endpoint, body) => {
    setAnalyzing(true);
    setAnalysisData(null);
    setStreamLog([]);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Analysis failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let rawText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'status') {
              setStreamLog((prev) => [...prev, { type: 'status', msg: event.message }]);
            } else if (event.type === 'repo_info') {
              setStreamLog((prev) => [...prev, { type: 'repo_info', data: event }]);
            } else if (event.type === 'text') {
              rawText += event.text;
              setStreamLog((prev) => {
                const last = prev[prev.length - 1];
                if (last?.type === 'stream') {
                  return [...prev.slice(0, -1), { type: 'stream', text: last.text + event.text }];
                }
                return [...prev, { type: 'stream', text: event.text }];
              });
            } else if (event.type === 'analysis_complete') {
              setAnalysisData(event.data);
              // Persist analysis result to localStorage
              if (draftIdRef.current) {
                updateDraft(draftIdRef.current, { status: 'complete', analysisData: event.data });
                refreshDrafts();
              }
            } else if (event.type === 'error') {
              setError(event.message);
              if (draftIdRef.current) {
                updateDraft(draftIdRef.current, { status: 'failed' });
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGitHub = () => {
    if (!githubUrl.trim()) return;
    draftIdRef.current = saveDraft({
      method: 'github',
      source: githubUrl.trim(),
      fileNames: [],
      fileCount: 0,
    });
    startSSEAnalysis('/api/analyze-github', { url: githubUrl.trim() });
  };

  const handleFolderUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadedFiles(files);

    // Save metadata immediately — no file contents stored
    const fileNames = files.map(f => f.webkitRelativePath || f.name);
    draftIdRef.current = saveDraft({
      method: 'folder',
      source: files[0]?.webkitRelativePath?.split('/')[0] || 'folder',
      fileNames,
      fileCount: files.length,
    });

    const extracted = await extractFilesFromFolder(files);
    startSSEAnalysis('/api/analyze-code', { files: extracted, source: 'folder' });
  };

  const handleZipUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFiles([file]);

    draftIdRef.current = saveDraft({
      method: 'zip',
      source: file.name,
      fileNames: [file.name],
      fileCount: 1,
    });

    setStreamLog([{ type: 'status', msg: `Extracting ${file.name}...` }]);
    setAnalyzing(true);
    try {
      const extracted = await extractFilesFromZip(file);
      startSSEAnalysis('/api/analyze-code', { files: extracted, source: `zip: ${file.name}` });
    } catch (err) {
      setError('Failed to extract ZIP: ' + err.message);
      setAnalyzing(false);
    }
  };

  const handleForgeWithAnalysis = () => {
    if (analysisData?.auto_intent) {
      onAnalysisComplete(analysisData);
    }
  };

  const handleSkip = () => {
    onSkipToForge();
  };

  const handleResumeFromDraft = (draft) => {
    setAnalysisData(draft.analysisData);
    draftIdRef.current = draft.id;
  };

  const handleDeleteDraft = (id) => {
    deleteDraft(id);
    setRecentDrafts(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Method selector */}
      <div className="grid grid-cols-3 gap-3">
        {METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMethod(m.id); setAnalysisData(null); setStreamLog([]); setError(null); }}
            className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border transition-all duration-200 text-center ${
              method === m.id
                ? 'border-opacity-60 text-white'
                : 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
            }`}
            style={method === m.id ? { borderColor: m.color + '80', background: m.color + '12' } : {}}
          >
            <m.icon className="w-5 h-5" style={method === m.id ? { color: m.color } : {}} />
            <span className="text-xs font-semibold">{m.label}</span>
            <span className="text-xs opacity-60">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Input area */}
      <AnimatePresence mode="wait">
        {method === 'github' && (
          <motion.div key="github" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 glass-card px-4 py-3 border border-slate-700/50 focus-within:border-forge-purple/50">
                <Github className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGitHub()}
                  placeholder="https://github.com/owner/repository"
                  className="flex-1 bg-transparent text-slate-200 placeholder-slate-600 outline-none text-sm"
                  autoFocus
                />
              </div>
              <button
                onClick={handleGitHub}
                disabled={!githubUrl.trim() || analyzing}
                className="btn-primary flex items-center gap-2 py-3 px-5 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {analyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2 pl-1">
              Works with any public GitHub repository. Fetches key files automatically.
            </p>
          </motion.div>
        )}

        {method === 'folder' && (
          <motion.div key="folder" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button
              onClick={() => folderRef.current?.click()}
              disabled={analyzing}
              className="w-full py-8 border-2 border-dashed border-slate-700 hover:border-forge-whisper/50 rounded-xl text-center transition-all group"
            >
              <FolderOpen className="w-8 h-8 text-slate-600 group-hover:text-forge-whisper mx-auto mb-2 transition-colors" />
              <div className="text-sm font-semibold text-slate-400 group-hover:text-slate-200">
                {uploadedFiles.length > 0 ? `${uploadedFiles.length} files selected` : 'Click to browse folder'}
              </div>
              <div className="text-xs text-slate-600 mt-1">Selects all files in the folder recursively</div>
            </button>
            <input ref={folderRef} type="file" webkitdirectory="" multiple className="hidden" onChange={handleFolderUpload} />
          </motion.div>
        )}

        {method === 'zip' && (
          <motion.div key="zip" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button
              onClick={() => zipRef.current?.click()}
              disabled={analyzing}
              className="w-full py-8 border-2 border-dashed border-slate-700 hover:border-forge-amber/50 rounded-xl text-center transition-all group"
            >
              <FileArchive className="w-8 h-8 text-slate-600 group-hover:text-forge-amber mx-auto mb-2 transition-colors" />
              <div className="text-sm font-semibold text-slate-400 group-hover:text-slate-200">
                {uploadedFiles.length > 0 ? uploadedFiles[0].name : 'Click to upload ZIP file'}
              </div>
              <div className="text-xs text-slate-600 mt-1">Automatically extracts and analyzes your codebase</div>
            </button>
            <input ref={zipRef} type="file" accept=".zip" className="hidden" onChange={handleZipUpload} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-300">{error}</div>
        </motion.div>
      )}

      {/* Analysis stream / results */}
      <AnimatePresence>
        {(analyzing || streamLog.length > 0) && !analysisData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 border border-forge-purple/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-4 h-4 text-forge-purple animate-spin" />
              <span className="text-sm font-semibold text-forge-purple">AI Analysis Running</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {streamLog.map((log, i) => (
                <div key={i}>
                  {log.type === 'status' && (
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-forge-purple" />
                      {log.msg}
                    </div>
                  )}
                  {log.type === 'repo_info' && (
                    <div className="text-xs text-forge-whisper">
                      ✓ Connected: {log.data.owner}/{log.data.repo} · {log.data.files_fetched} files fetched
                    </div>
                  )}
                  {log.type === 'stream' && (
                    <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap line-clamp-3">{log.text.slice(-400)}</pre>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {analysisData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <RepoAnalysis data={analysisData} onForge={handleForgeWithAnalysis} onSkip={handleSkip} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Analyses — shown when idle and no active result */}
      {recentDrafts.length > 0 && !analysisData && !analyzing && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <History className="w-3.5 h-3.5" />
            Recent Analyses
          </div>
          {recentDrafts.map(draft => (
            <div
              key={draft.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/80 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-300 truncate">{draft.source}</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {draft.method} · {draft.fileCount > 0 ? `${draft.fileCount} files · ` : ''}{new Date(draft.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleResumeFromDraft(draft)}
                className="text-xs px-3 py-1.5 rounded-lg bg-forge-purple/15 border border-forge-purple/30 text-forge-purple hover:bg-forge-purple/25 transition-colors flex-shrink-0"
              >
                Resume →
              </button>
              <button
                onClick={() => handleDeleteDraft(draft.id)}
                className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
