import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, Clock, Trash2, Star, ChevronDown, ChevronRight,
  Filter, GitPullRequest, Tag, Zap, ChevronUp, ListChecks, AlignLeft,
  ChevronsUpDown, ChevronsDownUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STATUSES = [
  { id: 'not_developed', labelKey: 'stories.backlog',    color: '#94A3B8', bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   icon: Circle },
  { id: 'in_progress',   labelKey: 'stories.inProgress', color: '#F59E0B', bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: Clock },
  { id: 'in_review',     labelKey: 'stories.inReview',   color: '#6366F1', bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  icon: GitPullRequest },
  { id: 'completed',     labelKey: 'stories.completed',  color: '#F5A83E', bg: 'bg-[#F5A83E]/10', border: 'border-[#F5A83E]/20', icon: CheckCircle2 },
  { id: 'removed',       labelKey: 'stories.removed',    color: '#EF4444', bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: Trash2 },
];

const PRIORITY_COLORS = { high: '#EF4444', medium: '#F59E0B', low: '#F5A83E' };
const TYPE_COLORS = { feature: '#8B5CF6', bug: '#EF4444', chore: '#94A3B8', spike: '#C2B0F6', enhancement: '#F59E0B' };

// Parse Mill markdown into structured epics/stories
function parseMarkdownTasks(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];
  const epics = [];
  const epicSections = markdown.split(/^## /m).filter(s => /epic/i.test(s.split('\n')[0]));

  for (const section of epicSections) {
    const lines = section.split('\n');
    const header = lines[0];
    const epicTitle = header.replace(/^Epic\s*\d*:?\s*/i, '').trim();
    const epicDesc = lines.find(l => l.startsWith('>'))?.replace(/^>\s*/, '') || '';

    const storySections = section.split(/^### /m).filter((_, i) => i > 0);
    const stories = [];

    for (const storySection of storySections) {
      const sl = storySection.split('\n');
      const sh = sl[0]; // "[E1-S1] Title" or "E1-S1: Title"
      const idMatch = sh.match(/\[([A-Z0-9]+-S\d+)\]/) || sh.match(/\b(E\d+-S\d+)\b/);
      if (!idMatch) continue;
      const id = idMatch[1];
      const title = sh.replace(/\[[^\]]+\]\s*/, '').replace(/^[A-Z0-9]+-S\d+:?\s*/i, '').trim();

      const metaLine = sl.find(l => /\*\*Type:\*\*/.test(l)) || '';
      const type = metaLine.match(/\*\*Type:\*\*\s*([\w]+)/)?.[1]?.toLowerCase() || 'feature';
      const priority = metaLine.match(/\*\*Priority:\*\*\s*([\w]+)/)?.[1]?.toLowerCase() || 'medium';
      const sprint = parseInt(metaLine.match(/\*\*Sprint:\*\*\s*(\d+)/)?.[1] || '1');
      const story_points = parseInt(metaLine.match(/\*\*Points:\*\*\s*(\d+)/)?.[1] || '3');

      const tagsLine = sl.find(l => /\*\*Tags:\*\*/.test(l)) || '';
      const tags = tagsLine.match(/\*\*Tags:\*\*\s*(.+)/)?.[1]?.split(',').map(t => t.trim()).filter(Boolean) || [];

      const userStoryIdx = sl.findIndex(l => l.trim() === '**User Story**');
      const user_story = userStoryIdx >= 0 ? (sl[userStoryIdx + 1] || '').trim() : '';

      const workDescIdx = sl.findIndex(l => l.trim() === '**Work Description**');
      const work_description = workDescIdx >= 0
        ? sl.slice(workDescIdx + 1).filter(l => l.trim() && !l.startsWith('**')).slice(0, 3).join(' ').trim()
        : '';

      const acIdx = sl.findIndex(l => l.trim() === '**Acceptance Criteria**');
      const acceptance_criteria = acIdx >= 0
        ? sl.slice(acIdx + 1).filter(l => /^-\s*\[/.test(l)).map(l => l.replace(/^-\s*\[.\]\s*/, '').trim())
        : [];

      stories.push({ id, title, type, priority, sprint, story_points, tags, user_story, work_description, acceptance_criteria });
    }

    if (stories.length > 0) epics.push({ title: epicTitle, description: epicDesc, stories });
  }
  return epics;
}

// Also handles old JSON format
function getEpicsFromVersion(v) {
  const tasks = v.artifacts?.tasks;
  if (!tasks) return [];
  if (typeof tasks === 'string') return parseMarkdownTasks(tasks);
  return tasks?.epics || [];
}

function StatusDropdown({ status, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const cfg = STATUSES.find(s => s.id === status) || STATUSES[0];
  const Icon = cfg.icon;
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.border} transition-colors`}
        style={{ color: cfg.color }}
      >
        <Icon className="w-3 h-3" />
        {t(cfg.labelKey)}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute left-0 top-full mt-1 z-30 glass-card min-w-[148px] py-1 shadow-xl"
          >
            {STATUSES.map(s => (
              <button
                key={s.id}
                onClick={() => { onChange(s.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5 transition-colors text-left ${status === s.id ? 'font-semibold' : ''}`}
                style={{ color: s.color }}
              >
                <s.icon className="w-3 h-3" />{t(s.labelKey)}
                {status === s.id && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StoryAccordion({ story, versionId, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const priorityColor = PRIORITY_COLORS[story.priority] || '#94A3B8';
  const typeColor = TYPE_COLORS[story.type] || '#94A3B8';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden hover:border-slate-700/60 transition-colors"
    >
      {/* Story header — always visible */}
      <div
        className="flex items-start gap-3 p-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Epic color bar */}
        <div className="w-0.5 self-stretch rounded-full flex-shrink-0" style={{ background: story.epic_color || '#8B5CF6' }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-slate-600 flex-shrink-0">{story.id}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0" style={{ background: typeColor + '15', color: typeColor, border: `1px solid ${typeColor}30` }}>
              {story.type}
            </span>
            <span className="text-xs flex-shrink-0 font-medium" style={{ color: priorityColor }}>
              ↑ {story.priority}
            </span>
            <span className="text-xs text-slate-600 flex-shrink-0 ml-auto flex items-center gap-0.5">
              <Star className="w-3 h-3" />{story.story_points}
            </span>
          </div>
          <div className="text-sm text-slate-200 leading-snug font-medium mb-2">{story.title}</div>

          <div className="flex items-center gap-2 flex-wrap">
            <StatusDropdown
              status={story.status}
              onChange={(s) => onStatusChange(versionId, story.id, s)}
            />
            <span className="text-xs text-slate-600">Sprint {story.sprint}</span>
            {story.tags?.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs text-slate-600 flex items-center gap-0.5">
                <Tag className="w-2.5 h-2.5" />{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 mt-1">
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-500" />
            : <ChevronRight className="w-4 h-4 text-slate-600" />}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-slate-800/60 pt-3">
              {story.user_story && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1">
                    <AlignLeft className="w-3.5 h-3.5 text-forge-purple" />
                    {t('stories.userStory')}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-forge-purple/5 border border-forge-purple/10 rounded-lg px-3 py-2 italic">
                    {story.user_story}
                  </p>
                </div>
              )}

              {story.work_description && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1">
                    <Zap className="w-3.5 h-3.5 text-forge-whisper" />
                    {t('stories.workDescription')}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{story.work_description}</p>
                </div>
              )}

              {story.acceptance_criteria?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
                    <ListChecks className="w-3.5 h-3.5 text-forge-amber" />
                    {t('stories.acceptanceCriteria')}
                  </div>
                  <ul className="space-y-1.5">
                    {story.acceptance_criteria.map((ac, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="w-4 h-4 rounded border border-slate-700 flex-shrink-0 mt-0.5 flex items-center justify-center text-slate-600 font-mono text-[10px]">{i + 1}</span>
                        {ac}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EpicSection({ epic, versionId, onStatusChange, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const { t } = useTranslation();

  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s.id] = epic.stories.filter(st => st.status === s.id).length;
    return acc;
  }, {});
  const completedPct = epic.stories.length
    ? Math.round((statusCounts.completed / epic.stories.length) * 100)
    : 0;

  return (
    <div className="glass-card overflow-hidden">
      {/* Epic header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-1" style={{ background: epic.color || '#8B5CF6' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <span className="font-bold text-white text-sm">{epic.title}</span>
            <span className="text-xs text-slate-600 font-mono">{epic.stories.length} stories</span>
            {STATUSES.filter(s => statusCounts[s.id] > 0).map(s => (
              <span key={s.id} className="text-xs font-mono" style={{ color: s.color }}>
                {statusCounts[s.id]} {t(s.labelKey).toLowerCase()}
              </span>
            ))}
          </div>
          {epic.description && (
            <p className="text-xs text-slate-500 mb-2">{epic.description}</p>
          )}
          {/* Completion bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${completedPct}%`, background: completedPct === 100 ? '#F5A83E' : '#8B5CF6' }}
              />
            </div>
            <span className="text-xs text-slate-600">{completedPct}%</span>
          </div>
        </div>
        <div className="flex-shrink-0 mt-1">
          {open
            ? <ChevronsDownUp className="w-4 h-4 text-slate-500" />
            : <ChevronsUpDown className="w-4 h-4 text-slate-600" />}
        </div>
      </button>

      {/* Stories list */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-slate-800/60 pt-3">
              <AnimatePresence>
                {epic.stories.map(story => (
                  <StoryAccordion
                    key={story.id}
                    story={story}
                    versionId={versionId}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StoryTracker({ versions, onStatusChange }) {
  const { t } = useTranslation();
  const [filterVersion, setFilterVersion] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [allExpanded, setAllExpanded] = useState(true);
  const [expandKey, setExpandKey] = useState(0); // force re-render of EpicSection defaults

  // Build epics from all versions, merging status from story_statuses
  const { epicsWithStories, storyCount, epicSet } = useMemo(() => {
    const allEpics = [];
    let storyCount = 0;
    const epicTitles = new Set();

    for (const v of versions) {
      if (filterVersion !== 'all' && v.semver !== filterVersion) continue;
      const epics = getEpicsFromVersion(v);
      for (const epic of epics) {
        epicTitles.add(epic.title);
        const storiesWithStatus = (epic.stories || []).map(story => {
          const st = v.story_statuses?.[story.id];
          const status = st?.status || 'not_developed';
          if (filterStatus !== 'all' && status !== filterStatus) return null;
          storyCount++;
          return {
            ...story,
            status,
            epic_title: epic.title,
            epic_color: epic.color,
            version_id: v.id,
            version_semver: v.semver,
          };
        }).filter(Boolean);

        if (storiesWithStatus.length > 0) {
          allEpics.push({ ...epic, stories: storiesWithStatus });
        }
      }
    }

    return { epicsWithStories: allEpics, storyCount, epicSet: epicTitles };
  }, [versions, filterVersion, filterStatus]);

  // Aggregate status counts across all stories
  const statusCounts = useMemo(() => {
    const counts = {};
    STATUSES.forEach(s => { counts[s.id] = 0; });
    for (const v of versions) {
      const epics = getEpicsFromVersion(v);
      for (const epic of epics) {
        for (const story of (epic.stories || [])) {
          const status = v.story_statuses?.[story.id]?.status || 'not_developed';
          if (counts[status] !== undefined) counts[status]++;
        }
      }
    }
    return counts;
  }, [versions]);

  if (versions.length === 0 || epicsWithStories.length === 0) {
    return (
      <div className="glass-card p-10 text-center text-slate-600 text-sm">
        {t('stories.noTasksGenerated')}
      </div>
    );
  }

  const toggleAll = () => {
    setAllExpanded(e => !e);
    setExpandKey(k => k + 1);
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUSES.filter(s => s.id !== 'removed').map(s => (
          <button
            key={s.id}
            onClick={() => setFilterStatus(filterStatus === s.id ? 'all' : s.id)}
            className={`glass-card p-3 text-center transition-all cursor-pointer hover:border-opacity-50 ${filterStatus === s.id ? 'ring-1' : ''}`}
            style={filterStatus === s.id ? { ringColor: s.color, borderColor: s.color + '50' } : {}}
          >
            <s.icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
            <div className="text-xl font-black" style={{ color: s.color }}>{statusCounts[s.id] || 0}</div>
            <div className="text-xs text-slate-600">{t(s.labelKey)}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <select
          value={filterVersion}
          onChange={e => setFilterVersion(e.target.value)}
          className="bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-300 outline-none"
        >
          <option value="all">{t('stories.allVersions')}</option>
          {versions.map(v => <option key={v.id} value={v.semver}>v{v.semver}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-300 outline-none"
        >
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s.id} value={s.id}>{t(s.labelKey)}</option>)}
        </select>
        <span className="text-xs text-slate-600 ml-auto">{storyCount} {t('stories.stories')}</span>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors btn-secondary py-1.5 px-3"
        >
          {allExpanded ? <ChevronsDownUp className="w-3.5 h-3.5" /> : <ChevronsUpDown className="w-3.5 h-3.5" />}
          {allExpanded ? t('stories.collapseAll') : t('stories.expandAll')}
        </button>
      </div>

      {/* Epic accordion sections */}
      <div className="space-y-3">
        <AnimatePresence>
          {epicsWithStories.map((epic, i) => (
            <motion.div key={`${epic.title}-${expandKey}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <EpicSection
                epic={epic}
                versionId={epic.stories[0]?.version_id}
                onStatusChange={onStatusChange}
                defaultOpen={allExpanded}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
