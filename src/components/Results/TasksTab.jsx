import { useMemo, useState } from 'react';
import { marked } from 'marked';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

marked.setOptions({ breaks: true, gfm: true });

const TYPE_FILTERS = [
  { id: 'all',        label: 'All Issues',   icon: '◈' },
  { id: 'epic',       label: 'Epics',        icon: '⬡' },
  { id: 'user_story', label: 'User Stories', icon: '◻' },
  { id: 'task',       label: 'Tasks',        icon: '◇' },
];

const USER_STORY_TYPES = ['feature', 'user_story'];

function parseStats(raw) {
  const match = raw.match(/Total Story Points.*?(\d+).*?Sprints.*?(\d+).*?Stories.*?(\d+)/i);
  if (!match) return null;
  return { points: match[1], sprints: match[2], stories: match[3] };
}

function parseEpics(raw) {
  const sections = raw.split(/^## /m).filter(Boolean);
  return sections
    .map((section) => {
      const lines = section.split('\n');
      const title = lines[0].trim();
      if (!title) return null;
      const body = lines.slice(1).join('\n').trim();

      const descMatch = body.match(/^>\s*(.+)/m);
      const description = descMatch ? descMatch[1] : '';

      // Parse individual story sections (### headings)
      const storySections = body.split(/^### /m).filter((_, i) => i > 0);
      const stories = storySections.map((s) => {
        const typeMeta  = s.match(/\*\*Type:\*\*\s*(\w+)/i);
        const ptsMeta   = s.match(/\*\*Points:\*\*\s*(\d+)/i);
        const type      = typeMeta ? typeMeta[1].toLowerCase() : 'feature';
        const points    = ptsMeta  ? parseInt(ptsMeta[1], 10) : 0;
        return { type, points, markdown: '### ' + s };
      });

      const allPoints = stories.reduce((sum, s) => sum + s.points, 0);

      return {
        title,
        description,
        storyCount: stories.length,
        points: allPoints || [...body.matchAll(/\*\*Points:\*\*\s*(\d+)/gi)].reduce((s, m) => s + parseInt(m[1], 10), 0),
        stories,                           // structured per-story objects
        fullMarkdown: '## ' + section,    // original full markdown for "all" render
      };
    })
    .filter(Boolean)
    .filter((e) => e.title.toLowerCase().startsWith('epic') || e.storyCount > 0);
}

function renderEpicHtml(epic, filterType) {
  if (filterType === 'all' || !epic.stories.length) {
    return marked.parse(epic.fullMarkdown);
  }
  // Epic-only: just the title + description, no stories
  if (filterType === 'epic') {
    const descLine = epic.description ? `\n> ${epic.description}` : '';
    return marked.parse(`## ${epic.title}${descLine}`);
  }
  // Filter stories by type
  const filtered = epic.stories.filter((s) =>
    filterType === 'user_story'
      ? USER_STORY_TYPES.includes(s.type)
      : !USER_STORY_TYPES.includes(s.type)
  );
  if (!filtered.length) return null;
  const descLine = epic.description ? `\n> ${epic.description}\n` : '\n';
  return marked.parse(`## ${epic.title}${descLine}\n` + filtered.map((s) => s.markdown).join('\n'));
}

function EpicAccordion({ epic, index, isOpen, onToggle, filterType }) {
  const html = useMemo(() => renderEpicHtml(epic, filterType), [epic, filterType]);
  if (!html) return null;

  const isEpicOnly = filterType === 'epic';

  // Recount for filtered display
  const displayCount = filterType === 'all' || filterType === 'epic'
    ? epic.storyCount
    : epic.stories.filter((s) =>
        filterType === 'user_story' ? USER_STORY_TYPES.includes(s.type) : !USER_STORY_TYPES.includes(s.type)
      ).length;

  const displayPoints = filterType === 'all' || filterType === 'epic'
    ? epic.points
    : epic.stories
        .filter((s) => filterType === 'user_story' ? USER_STORY_TYPES.includes(s.type) : !USER_STORY_TYPES.includes(s.type))
        .reduce((sum, s) => sum + s.points, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`glass-card overflow-hidden transition-all duration-200 ${
        isOpen && !isEpicOnly ? 'border-forge-purple/30' : 'border-[var(--border-default)]'
      }`}
    >
      {/* Header */}
      <button
        onClick={isEpicOnly ? undefined : onToggle}
        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
          isEpicOnly ? 'cursor-default' : 'hover:bg-[var(--bg-hover)]'
        }`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
          isOpen && !isEpicOnly
            ? 'bg-forge-purple/20 border border-forge-purple/30'
            : 'bg-slate-800/60 border border-slate-700/40'
        }`}>
          <Layers className={`w-4 h-4 ${isOpen && !isEpicOnly ? 'text-forge-whisper' : 'text-slate-500'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm truncate ${isOpen && !isEpicOnly ? 'text-white' : 'text-slate-300'}`}>
            {epic.title}
          </div>
          {epic.description && (
            <div className="text-xs text-slate-600 truncate mt-0.5">{epic.description}</div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {displayCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-forge-purple/10 border border-forge-purple/20 text-forge-whisper font-medium">
              {displayCount} {displayCount === 1 ? 'story' : 'stories'}
            </span>
          )}
          {displayPoints > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-forge-amber/10 border border-forge-amber/20 text-forge-amber font-medium">
              {displayPoints} pts
            </span>
          )}
          {!isEpicOnly && (
            isOpen
              ? <ChevronUp className="w-4 h-4 text-slate-500" />
              : <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {isOpen && !isEpicOnly && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 pb-5 pt-1 border-t border-[var(--border-subtle)]">
              <div className="prose-tasks" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function TasksTab({ data }) {
  const [openIndex, setOpenIndex] = useState(0);
  const [filterType, setFilterType] = useState('all');

  const raw = typeof data === 'string' ? data : null;

  // JSON fallback
  if (!raw && data) {
    const epics = data?.epics || [];
    if (!epics.length) return <div className="glass-card p-8 text-center text-slate-600">No tasks generated.</div>;
    const markdown = epics.map((epic) => {
      const stories = (epic.stories || []).map((s) =>
        `### [${s.id}] ${s.title}\n**Type:** ${s.type || 'feature'} | **Priority:** ${s.priority || '—'} | **Sprint:** ${s.sprint || '—'} | **Points:** ${s.story_points || 0}\n\n**User Story**\n${s.user_story || '—'}\n\n**Acceptance Criteria**\n${(s.acceptance_criteria || []).map((ac) => `- [ ] ${ac}`).join('\n')}`
      ).join('\n\n---\n\n');
      return `## Epic: ${epic.title}\n> ${epic.description || ''}\n\n${stories}`;
    }).join('\n\n---\n\n');
    return <TasksTab data={markdown} />;
  }

  if (!raw) return <div className="glass-card p-8 text-center text-slate-600">No tasks generated.</div>;

  const { stats, epics } = useMemo(() => ({
    stats: parseStats(raw),
    epics: parseEpics(raw),
  }), [raw]);

  if (!epics.length) {
    return <div className="glass-card p-5 prose-tasks" dangerouslySetInnerHTML={{ __html: marked.parse(raw) }} />;
  }

  // (toggle used via onToggle prop in each EpicAccordion)

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-4">
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-black text-forge-amber">{stats.points}</div>
            <div className="text-xs text-slate-500 mt-1">Story Points</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-black text-forge-whisper">{stats.stories}</div>
            <div className="text-xs text-slate-500 mt-1">User Stories</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-black gradient-text">{stats.sprints}</div>
            <div className="text-xs text-slate-500 mt-1">Sprints</div>
          </div>
        </motion.div>
      )}

      {/* Issue type filter pills */}
      <div className="flex items-center gap-1.5 glass-card p-1.5">
        {TYPE_FILTERS.map((tf) => (
          <button
            key={tf.id}
            onClick={() => { setFilterType(tf.id); setOpenIndex(0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterType === tf.id
                ? 'bg-forge-purple/80 text-white shadow-sm shadow-forge-purple/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span className="text-[11px]">{tf.icon}</span>
            {tf.label}
          </button>
        ))}
      </div>

      {/* Epic accordions */}
      <div className="space-y-2">
        {epics.map((epic, i) => (
          <EpicAccordion
            key={`${i}-${filterType}`}
            epic={epic}
            index={i}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex((prev) => (prev === i ? null : i))}
            filterType={filterType}
          />
        ))}
      </div>
    </div>
  );
}
