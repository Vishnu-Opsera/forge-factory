import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, ChevronDown, ChevronUp, Star, Zap, Code, Server, TestTube, Palette, LayoutGrid } from 'lucide-react';

const TYPE_ICONS = {
  feature: Zap,
  infra: Server,
  testing: TestTube,
  design: Palette,
  infrastructure: Server,
  research: Star,
};

const PRIORITY_CLASSES = {
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

function StoryCard({ story, epicColor }) {
  const [expanded, setExpanded] = useState(false);
  const TypeIcon = TYPE_ICONS[story.type] || Code;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden hover:border-slate-700/80 transition-colors"
    >
      <div
        className="flex items-start gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="w-1 h-full rounded-full flex-shrink-0 self-stretch mt-0.5 min-h-[20px]"
          style={{ background: epicColor, minHeight: '100%', width: '3px', borderRadius: '2px' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <span className="font-mono text-xs text-slate-600">{story.id}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_CLASSES[story.priority] || 'priority-low'}`}>
              {story.priority}
            </span>
            <span className="text-xs text-slate-600 ml-auto flex items-center gap-1 flex-shrink-0">
              <Star className="w-3 h-3" />
              {story.story_points}pts
            </span>
          </div>
          <div className="text-sm text-slate-200 font-medium leading-snug">{story.title}</div>
          {story.tags && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {story.tags.map((tag, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700/60">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-600 flex-shrink-0" />
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-3"
            style={{ paddingLeft: '28px' }}
          >
            <div className="space-y-3 pt-2 border-t border-slate-800/60">
              {story.user_story && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">User Story</div>
                  <div className="text-sm text-slate-400 italic">{story.user_story}</div>
                </div>
              )}
              {story.description && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</div>
                  <div className="text-sm text-slate-400">{story.description}</div>
                </div>
              )}
              {story.acceptance_criteria && story.acceptance_criteria.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Acceptance Criteria
                  </div>
                  <ul className="space-y-1.5">
                    {story.acceptance_criteria.map((ac, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                        <CheckSquare className="w-3.5 h-3.5 text-forge-emerald flex-shrink-0 mt-0.5" />
                        {ac}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {story.sprint && (
                <div className="text-xs text-slate-600">Sprint {story.sprint}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EpicBlock({ epic }) {
  const [collapsed, setCollapsed] = useState(false);
  const totalPoints = epic.stories?.reduce((s, st) => s + (st.story_points || 0), 0) || epic.total_points || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: epic.color || '#8B5CF6' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{epic.title}</span>
            <span className="text-xs font-mono text-slate-600">{epic.id}</span>
          </div>
          {epic.description && (
            <div className="text-sm text-slate-500 mt-0.5 truncate">{epic.description}</div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm font-bold" style={{ color: epic.color || '#8B5CF6' }}>
              {totalPoints} pts
            </div>
            <div className="text-xs text-slate-600">{epic.stories?.length || 0} stories</div>
          </div>
          {collapsed ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      <AnimatePresence>
        {!collapsed && epic.stories && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-slate-800/60 pt-3">
              {epic.stories.map((story) => (
                <StoryCard key={story.id} story={story} epicColor={epic.color || '#8B5CF6'} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function TasksTab({ data }) {
  if (!data) {
    return <div className="glass-card p-8 text-center text-slate-600">No tasks generated.</div>;
  }

  // If data is a string (parse failed), show raw
  if (typeof data === 'string') {
    return (
      <div className="glass-card p-6">
        <pre className="stream-text whitespace-pre-wrap">{data}</pre>
      </div>
    );
  }

  const epics = data.epics || [];
  const totalPoints = data.total_points || epics.reduce((sum, e) => sum + (e.total_points || e.stories?.reduce((s, st) => s + (st.story_points || 0), 0) || 0), 0);
  const totalStories = epics.reduce((sum, e) => sum + (e.stories?.length || 0), 0);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-4"
      >
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-black gradient-text">{epics.length}</div>
          <div className="text-xs text-slate-500 mt-1">Epics</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-black text-forge-cyan">{totalStories}</div>
          <div className="text-xs text-slate-500 mt-1">User Stories</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl font-black text-forge-amber">{totalPoints}</div>
          <div className="text-xs text-slate-500 mt-1">Story Points</div>
        </div>
      </motion.div>

      {/* Epic overview strip */}
      {epics.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {epics.map((epic) => (
            <div
              key={epic.id}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold"
              style={{ borderColor: (epic.color || '#8B5CF6') + '40', color: epic.color || '#8B5CF6', background: (epic.color || '#8B5CF6') + '10' }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: epic.color || '#8B5CF6' }} />
              {epic.title}
            </div>
          ))}
        </div>
      )}

      {/* Epics list */}
      <div className="space-y-4">
        {epics.map((epic) => (
          <EpicBlock key={epic.id} epic={epic} />
        ))}
      </div>

      {epics.length === 0 && (
        <div className="glass-card p-8 text-center text-slate-600">
          No epics found. Check raw data above.
        </div>
      )}
    </div>
  );
}
