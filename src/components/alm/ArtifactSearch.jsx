import { useState } from 'react';
import { Search, Loader, FileText, Layers, Box } from 'lucide-react';
import { textSearch, semanticSearch } from '../../lib/versioningApi.js';

const TYPE_ICONS = {
  requirement: FileText,
  architecture: Layers,
  diagram: Box,
  other: Box,
};

export default function ArtifactSearch({ activeBackendProjectId }) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('text');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const opts = activeBackendProjectId ? { projectId: activeBackendProjectId } : {};
      const data = mode === 'semantic'
        ? await semanticSearch(query, opts)
        : await textSearch(query, opts);
      setResults(data.data ?? []);
    } catch {
      setError('Search failed. Is the versioning backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!activeBackendProjectId && (
        <div className="text-xs text-slate-600 px-1">
          Save a version to the backend first to scope search to this project. Currently searching all projects.
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={mode === 'semantic' ? 'Describe what you\'re looking for…' : 'Search artifact names…'}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 outline-none focus:border-forge-purple/50 transition-colors"
          />
        </div>
        <select
          value={mode}
          onChange={e => setMode(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3 text-sm text-slate-300 outline-none focus:border-forge-purple/50"
        >
          <option value="text">Text</option>
          <option value="semantic">Semantic (AI)</option>
        </select>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-forge-purple/20 border border-forge-purple/30 text-forge-whisper text-sm hover:bg-forge-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </form>

      {error && (
        <div className="text-sm text-red-400 px-1">{error}</div>
      )}

      {results !== null && results.length === 0 && (
        <div className="text-center py-8 text-slate-600 text-sm">No results found.</div>
      )}

      {results !== null && results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => {
            const artifact = r.artifact ?? r;
            const version = r.version ?? null;
            const Icon = TYPE_ICONS[artifact.type] ?? Box;
            return (
              <div key={i} className="glass-card p-3 flex items-start gap-3">
                <Icon className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{artifact.name}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-500 capitalize">{artifact.type}</span>
                    {version && (
                      <span className="text-xs text-slate-600">
                        v{version.version}
                        {version.changeSummary && ` — ${version.changeSummary.slice(0, 60)}${version.changeSummary.length > 60 ? '…' : ''}`}
                      </span>
                    )}
                    {r.similarityScore != null && (
                      <span className="text-xs text-forge-purple font-medium">
                        {(r.similarityScore * 100).toFixed(0)}% match
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
