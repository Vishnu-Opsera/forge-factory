import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, Trash2, Star, ChevronDown, Filter, GitPullRequest } from 'lucide-react';

const STATUSES = [
  { id: 'not_developed', label: 'Backlog', color: '#94A3B8', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Circle },
  { id: 'in_progress', label: 'In Progress', color: '#F59E0B', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock },
  { id: 'in_review', label: 'In Review', color: '#6366F1', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: GitPullRequest },
  { id: 'completed', label: 'Completed', color: '#10B981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
  { id: 'removed', label: 'Removed', color: '#EF4444', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Trash2 },
];

function StoryCard({ story, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const statusCfg = STATUSES.find(s => s.id === story.status) || STATUSES[0];
  const Icon = statusCfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden hover:border-slate-700/80 transition-colors"
    >
      <div className="flex items-start gap-2 p-2.5">
        <div className="w-1 min-h-[20px] rounded-full self-stretch flex-shrink-0" style={{ background: story.epic_color || '#8B5CF6', minHeight: '100%', width: '3px' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap mb-0.5">
            <span className="text-xs font-mono text-slate-600">{story.id}</span>
            <span className="text-xs text-slate-600">v{story.version_semver}</span>
            <span className="text-xs text-slate-600 ml-auto flex items-center gap-1 flex-shrink-0">
              <Star className="w-3 h-3" />{story.story_points}
            </span>
          </div>
          <div className="text-sm text-slate-200 leading-snug mb-1.5">{story.title}</div>

          {/* Status selector */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${statusCfg.bg} ${statusCfg.border} transition-colors`}
              style={{ color: statusCfg.color }}
            >
              <Icon className="w-3 h-3" />
              {statusCfg.label}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute left-0 top-full mt-1 z-20 glass-card min-w-[140px] py-1 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {STATUSES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { onStatusChange(story.version_id, story.id, s.id); setOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5 transition-colors text-left ${story.status === s.id ? 'font-semibold' : ''}`}
                      style={{ color: s.color }}
                    >
                      <s.icon className="w-3 h-3" />
                      {s.label}
                      {story.status === s.id && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function StoryTracker({ versions, onStatusChange }) {
  const [filterVersion, setFilterVersion] = useState('all');
  const [filterEpic, setFilterEpic] = useState('all');

  // Collect all stories
  const allStories = [];
  const epicSet = new Set();
  for (const v of versions) {
    for (const epic of (v.artifacts?.tasks?.epics || [])) {
      epicSet.add(epic.title);
      for (const story of (epic.stories || [])) {
        const st = v.story_statuses?.[story.id];
        allStories.push({
          ...story,
          epic_title: epic.title,
          epic_color: epic.color,
          version_semver: v.semver,
          version_id: v.id,
          status: st?.status || 'not_developed',
        });
      }
    }
  }

  const filtered = allStories.filter(s => {
    if (filterVersion !== 'all' && s.version_semver !== filterVersion) return false;
    if (filterEpic !== 'all' && s.epic_title !== filterEpic) return false;
    return true;
  });

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s.id] = filtered.filter(story => story.status === s.id);
    return acc;
  }, {});

  const epicOptions = Array.from(epicSet);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <select value={filterVersion} onChange={e => setFilterVersion(e.target.value)} className="bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-300 outline-none">
          <option value="all">All versions</option>
          {versions.map(v => <option key={v.id} value={v.semver}>v{v.semver}</option>)}
        </select>
        {epicOptions.length > 0 && (
          <select value={filterEpic} onChange={e => setFilterEpic(e.target.value)} className="bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-300 outline-none">
            <option value="all">All epics</option>
            {epicOptions.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        )}
        <div className="ml-auto text-xs text-slate-600">{filtered.length} stories</div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {STATUSES.map(s => (
          <div key={s.id} className="glass-card p-3 text-center">
            <div className="text-2xl font-black" style={{ color: s.color }}>{byStatus[s.id]?.length || 0}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATUSES.map(statusCfg => (
          <div key={statusCfg.id} className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <statusCfg.icon className="w-3.5 h-3.5" style={{ color: statusCfg.color }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
              <span className="ml-auto text-xs text-slate-600">{byStatus[statusCfg.id]?.length || 0}</span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              <AnimatePresence>
                {(byStatus[statusCfg.id] || []).map(story => (
                  <StoryCard
                    key={`${story.version_id}-${story.id}`}
                    story={story}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </AnimatePresence>
              {(byStatus[statusCfg.id] || []).length === 0 && (
                <div className="text-xs text-slate-700 text-center py-4 border border-dashed border-slate-800/60 rounded-xl">Empty</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
