import { useMemo } from 'react';
import { marked } from 'marked';
import { CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';

// Configure marked for clean output
marked.setOptions({ breaks: true, gfm: true });

function parseStats(html) {
  const match = html.match(/Total Story Points.*?(\d+).*?Sprints.*?(\d+).*?Stories.*?(\d+)/i);
  if (!match) return null;
  return { points: match[1], sprints: match[2], stories: match[3] };
}

function WorkOrderCard({ html, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 prose-tasks"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function TasksTab({ data }) {
  if (!data) {
    return <div className="glass-card p-8 text-center text-slate-600">No tasks generated.</div>;
  }

  const raw = typeof data === 'string' ? data : null;

  const { stats, epicBlocks } = useMemo(() => {
    if (!raw) return { stats: null, epicBlocks: [] };

    const html = marked.parse(raw);
    const statsData = parseStats(raw);

    // Split by h2 (epics)
    const epicSections = raw.split(/^## /m).filter(Boolean);
    const blocks = epicSections.map((section, i) => {
      if (i === 0 && !section.startsWith('Epic')) return null; // skip header section
      return marked.parse((i === 0 ? section : '## ' + section));
    }).filter(Boolean);

    return { stats: statsData, epicBlocks: blocks.length ? blocks : [html] };
  }, [raw]);

  // Structured JSON fallback (old format)
  if (!raw) {
    const epics = data?.epics || [];
    if (!epics.length) return <div className="glass-card p-8 text-center text-slate-600">No tasks generated.</div>;

    const markdown = epics.map(epic => {
      const stories = (epic.stories || []).map(s =>
        `### [${s.id}] ${s.title}\n**Type:** ${s.type || '—'} | **Priority:** ${s.priority || '—'} | **Sprint:** ${s.sprint || '—'} | **Points:** ${s.story_points || 0}\n\n**User Story**\n${s.user_story || '—'}\n\n**Acceptance Criteria**\n${(s.acceptance_criteria || []).map(ac => `- [ ] ${ac}`).join('\n')}`
      ).join('\n\n---\n\n');
      return `## Epic: ${epic.title}\n> ${epic.description || ''}\n\n${stories}`;
    }).join('\n\n---\n\n');

    return <TasksTab data={markdown} />;
  }

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4"
        >
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

      {/* Work order blocks */}
      <div className="space-y-4">
        {epicBlocks.map((html, i) => (
          <WorkOrderCard key={i} html={html} index={i} />
        ))}
      </div>
    </div>
  );
}
