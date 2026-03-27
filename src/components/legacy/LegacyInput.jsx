import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, FolderOpen, FileArchive, Loader2, AlertCircle, Zap, MessageSquare } from 'lucide-react';
import RepoAnalysis from './RepoAnalysis.jsx';

const METHODS = [
  { id: 'github', icon: Github, label: 'GitHub URL', desc: 'Public repo URL', color: '#8B5CF6' },
  { id: 'folder', icon: FolderOpen, label: 'Local Folder', desc: 'Browse & upload files', color: '#C2B0F6' },
  { id: 'zip', icon: FileArchive, label: 'ZIP File', desc: 'Upload a .zip archive', color: '#F5A83E' },
];


export default function LegacyInput({ onAnalysisComplete, onSkipToForge }) {
  const [method, setMethod] = useState('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [streamLog, setStreamLog] = useState([]);
  const [error, setError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const folderRef = useRef();
  const zipRef = useRef();
  const abortRef = useRef();

  const runMockAnalysis = async (source, repoName) => {
    setAnalyzing(true);
    setAnalysisData(null);
    setStreamLog([]);
    setError(null);

    let cancelled = false;
    abortRef.current = { abort: () => { cancelled = true; } };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const MOCK_ANALYSIS = {
      auto_intent: `Modernize ${repoName || 'this legacy application'} — migrate from the existing monolithic architecture to a modular, cloud-native design with improved scalability, maintainability, and developer experience.`,
      repo_name: repoName || 'legacy-app',
      tech_stack: {
        languages: ['JavaScript', 'HTML', 'CSS'],
        frameworks: ['Express', 'jQuery'],
      },
      code_quality: 'Fair — inconsistent patterns, minimal test coverage',
      complexity: 'High',
      issues: [
        { issue: 'No test coverage' },
        { issue: 'Tightly coupled modules' },
        { issue: 'No CI/CD pipeline' },
      ],
    };

    const steps = [
      { type: 'status', msg: 'Connecting to repository...' },
      { type: 'repo_info', owner: repoName?.split('/')[0] || 'org', repo: repoName?.split('/')[1] || 'repo', files_fetched: 24 },
      { type: 'status', msg: 'Scanning project structure...' },
      { type: 'stream', text: 'Analyzing package.json, README.md, and source files...\n' },
      { type: 'status', msg: 'Identifying tech stack...' },
      { type: 'stream', text: 'Detected: Node.js + Express backend, jQuery frontend, PostgreSQL database.\n' },
      { type: 'status', msg: 'Evaluating code quality...' },
      { type: 'stream', text: 'Found 0% test coverage, 12 TODO comments, no linting configuration.\n' },
      { type: 'status', msg: 'Generating modernization plan...' },
      { type: 'stream', text: 'Recommending: TypeScript migration, React frontend, automated testing, containerization.\n' },
    ];

    for (const step of steps) {
      if (cancelled) { setAnalyzing(false); return; }
      await sleep(350);
      setStreamLog((prev) => [...prev, step]);
    }

    if (cancelled) { setAnalyzing(false); return; }
    await sleep(500);
    setAnalysisData(MOCK_ANALYSIS);
    setAnalyzing(false);
  };

  const handleGitHub = () => {
    if (!githubUrl.trim()) return;
    runMockAnalysis('github', githubUrl.trim().replace('https://github.com/', ''));
  };

  const handleFolderUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadedFiles(files);
    runMockAnalysis('folder');
  };

  const handleZipUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFiles([file]);
    runMockAnalysis('zip', file.name.replace('.zip', ''));
  };

  const handleForgeWithAnalysis = (updatedData) => {
    const data = updatedData || analysisData;
    if (!data) return;
    onAnalysisComplete({ ...data, additional_prompt: additionalPrompt.trim() });
  };

  const handleSkip = () => {
    onSkipToForge();
  };

  return (
    <div className="space-y-3">
      {/* Modernization intent + method selector in a compact combined layout */}
      <div className="glass-card border border-forge-purple/20 overflow-hidden">
        {/* Goals row */}
        <div className="flex items-start gap-2 px-3 pt-3 pb-2 border-b border-slate-800/60">
          <MessageSquare className="w-3.5 h-3.5 text-forge-purple flex-shrink-0 mt-1.5" />
          <textarea
            value={additionalPrompt}
            onChange={(e) => setAdditionalPrompt(e.target.value)}
            rows={2}
            placeholder="Modernization goals — e.g. migrate to microservices, upgrade to React 18, improve performance..."
            className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed text-white placeholder-slate-600"
          />
        </div>

        {/* Method selector — compact inline row */}
        <div className="flex items-center gap-1 p-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMethod(m.id); setAnalysisData(null); setStreamLog([]); setError(null); }}
              className={`flex items-center gap-1.5 flex-1 justify-center py-2 px-2 rounded-lg border transition-all duration-200 text-xs ${
                method === m.id
                  ? 'border-opacity-60 text-white'
                  : 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
              }`}
              style={method === m.id ? { borderColor: m.color + '80', background: m.color + '12' } : {}}
            >
              <m.icon className="w-3.5 h-3.5" style={method === m.id ? { color: m.color } : {}} />
              <span className="font-semibold">{m.label}</span>
            </button>
          ))}
        </div>
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
              className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-forge-whisper/50 rounded-xl text-center transition-all group flex items-center justify-center gap-3"
            >
              <FolderOpen className="w-5 h-5 text-slate-600 group-hover:text-forge-whisper transition-colors flex-shrink-0" />
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-400 group-hover:text-slate-200">
                  {uploadedFiles.length > 0 ? `${uploadedFiles.length} files selected` : 'Click to browse folder'}
                </div>
                <div className="text-xs text-slate-600">Selects all files recursively</div>
              </div>
            </button>
            <input ref={folderRef} type="file" webkitdirectory="" multiple className="hidden" onChange={handleFolderUpload} />
          </motion.div>
        )}

        {method === 'zip' && (
          <motion.div key="zip" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button
              onClick={() => zipRef.current?.click()}
              disabled={analyzing}
              className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-forge-amber/50 rounded-xl text-center transition-all group flex items-center justify-center gap-3"
            >
              <FileArchive className="w-5 h-5 text-slate-600 group-hover:text-forge-amber transition-colors flex-shrink-0" />
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-400 group-hover:text-slate-200">
                  {uploadedFiles.length > 0 ? uploadedFiles[0].name : 'Click to upload ZIP file'}
                </div>
                <div className="text-xs text-slate-600">Extracts and analyzes automatically</div>
              </div>
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
              <span className="text-sm font-semibold text-forge-purple">Forge Analysis Running</span>
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
                      ✓ Connected: {log.owner}/{log.repo} · {log.files_fetched} files fetched
                    </div>
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
    </div>
  );
}
