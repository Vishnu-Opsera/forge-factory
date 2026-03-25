import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Terminal, RefreshCw, Zap, Circle, Clock, GitPullRequest, CheckCircle2 } from 'lucide-react';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-forge-whisper transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-[#F5A83E]" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ code, label }) {
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
        <span className="text-xs font-mono text-slate-500">{label}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-xs font-mono text-slate-300 bg-slate-950/60 overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

const STATUS_META = {
  not_developed: { label: 'Backlog', color: '#94A3B8', icon: Circle },
  in_progress:   { label: 'In Progress', color: '#F59E0B', icon: Clock },
  in_review:     { label: 'In Review', color: '#6366F1', icon: GitPullRequest },
  completed:     { label: 'Completed', color: '#F5A83E', icon: CheckCircle2 },
};

export default function ConnectIDEPanel({ project, versions }) {
  const [apiKey, setApiKey] = useState(null);
  const [serverPath, setServerPath] = useState('');
  const [synced, setSynced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cursor');

  const latestVersion = versions[versions.length - 1];

  // Count story statuses
  const storyCounts = { not_developed: 0, in_progress: 0, in_review: 0, completed: 0 };
  for (const v of versions) {
    for (const st of Object.values(v.story_statuses || {})) {
      if (storyCounts[st.status] !== undefined) storyCounts[st.status]++;
    }
  }

  const fetchKey = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/mcp/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, projectName: project.name }),
      });
      const data = await res.json();
      setApiKey(data.key);
    } catch {}
    setLoading(false);
  }, [project]);

  useEffect(() => {
    fetchKey();
    fetch('/api/alm/server-path').then(r => r.json()).then(d => setServerPath(d.path)).catch(() => {});
    fetch('/api/alm/projects').then(r => r.ok ? setSynced(true) : setSynced(false)).catch(() => setSynced(false));
  }, [fetchKey]);

  const regenerateKey = async () => {
    if (!project?.id) return;
    await fetch(`/api/mcp/keys/${project.id}`, { method: 'DELETE' });
    fetchKey();
  };

  const MCP_SERVER_URL = 'http://localhost:3001/mcp';

  const cursorConfig = JSON.stringify({
    mcpServers: {
      'forge-factory': {
        url: MCP_SERVER_URL,
        headers: { Authorization: `Bearer ${apiKey || '<your-api-key>'}` },
      },
    },
  }, null, 2);

  const claudeCodeCmd = `claude mcp add forge-factory --transport http ${MCP_SERVER_URL} --header "Authorization: Bearer ${apiKey || '<your-api-key>'}"`;

  const stdioConfig = JSON.stringify({
    mcpServers: {
      'forge-factory': {
        command: 'node',
        args: [serverPath || './mcp-server.js'],
        env: { FORGE_API_KEY: apiKey || '<your-api-key>', FORGE_SERVER_URL: 'http://localhost:3001' },
      },
    },
  }, null, 2);

  if (!project) return (
    <div className="text-center py-16 text-slate-600 text-sm">Select a project to connect your IDE.</div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-forge-whisper" />
          Connect Your IDE
        </h2>
        <p className="text-sm text-slate-500">
          Connect Cursor or Claude Code to pull work orders and update statuses directly from your editor.
        </p>
      </div>

      {/* Sync status */}
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm ${synced ? 'border-[#F5A83E]/20 bg-[#F5A83E]/5 text-[#F5A83E]' : 'border-amber-500/20 bg-amber-500/5 text-amber-400'}`}>
        <div className={`w-2 h-2 rounded-full ${synced ? 'bg-forge-amber animate-pulse' : 'bg-amber-400'}`} />
        {synced ? 'Server sync active — MCP can read your project data' : 'Server offline — start the dev server to enable MCP'}
      </div>

      {/* Story status overview */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(storyCounts).map(([status, count]) => {
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          return (
            <div key={status} className="glass-card p-3 text-center">
              <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: meta.color }} />
              <div className="text-xl font-black" style={{ color: meta.color }}>{count}</div>
              <div className="text-xs text-slate-600 mt-0.5">{meta.label}</div>
            </div>
          );
        })}
      </div>

      {/* API Key */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-white mb-0.5">Project API Key</div>
            <div className="text-xs text-slate-500">Scoped to: <span className="text-forge-purple">{project.name}</span></div>
          </div>
          <button onClick={regenerateKey} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors btn-secondary py-1.5 px-3">
            <RefreshCw className="w-3 h-3" />Regenerate
          </button>
        </div>
        {loading ? (
          <div className="h-9 bg-slate-800/50 rounded-lg animate-pulse" />
        ) : (
          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
            <code className="flex-1 text-xs font-mono text-forge-whisper truncate">{apiKey}</code>
            <CopyButton text={apiKey || ''} />
          </div>
        )}
      </div>

      {/* IDE Config tabs */}
      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-slate-800/60">
          {[
            { id: 'cursor', label: 'Cursor' },
            { id: 'claude', label: 'Claude Code' },
            { id: 'stdio', label: 'stdio (universal)' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${activeTab === t.id ? 'text-white border-b-2 border-forge-whisper' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {activeTab === 'cursor' && (
            <>
              <p className="text-xs text-slate-500">Add to <code className="text-forge-whisper">.cursor/mcp.json</code> in your project root, or paste into Cursor → Settings → MCP:</p>
              <CodeBlock label="Cursor MCP Config" code={cursorConfig} />
              <div className="text-xs text-slate-600 space-y-1">
                <div>1. Open Cursor Settings → Features → MCP</div>
                <div>2. Click "Add Server" and paste the config above</div>
                <div>3. Tell Cursor: <span className="text-slate-400 italic">"Get my next work order from forge-factory"</span></div>
              </div>
            </>
          )}

          {activeTab === 'claude' && (
            <>
              <p className="text-xs text-slate-500">Run this command in your terminal to add the MCP server to Claude Code:</p>
              <CodeBlock label="Terminal" code={claudeCodeCmd} />
              <div className="text-xs text-slate-600 space-y-1">
                <div>1. Run the command above in your terminal</div>
                <div>2. Restart Claude Code</div>
                <div>3. Tell Claude: <span className="text-slate-400 italic">"Get my next work order from forge-factory"</span></div>
              </div>
            </>
          )}

          {activeTab === 'stdio' && (
            <>
              <p className="text-xs text-slate-500">For any MCP-compatible client. Uses stdio transport via <code className="text-forge-whisper">mcp-server.js</code>:</p>
              <CodeBlock label="MCP Config (stdio)" code={stdioConfig} />
            </>
          )}
        </div>
      </div>

      {/* Workflow */}
      <div className="glass-card p-5">
        <div className="text-sm font-semibold text-white mb-4">How it works</div>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Tell your coding agent to get the next work order from forge-factory', color: '#8B5CF6' },
            { step: '2', text: 'The agent pulls full work order details: user story, acceptance criteria, tech context', color: '#C2B0F6' },
            { step: '3', text: 'Monitor as the agent implements the work order in your codebase', color: '#F5A83E' },
            { step: '4', text: 'When done, the agent marks the work order as "In Review" — visible here in Planner', color: '#6366F1' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: s.color + '20', color: s.color, border: `1px solid ${s.color}40` }}>
                {s.step}
              </div>
              <p className="text-sm text-slate-400">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
