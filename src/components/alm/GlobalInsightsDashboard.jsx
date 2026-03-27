import { motion } from 'framer-motion';
import {
  FolderOpen, GitBranch, RefreshCw, Zap, Clock, Star,
  TrendingUp, Code2, Target, BarChart3, Cpu, CheckCircle2,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────
function computeGlobalStats(projects) {
  const totalProjects   = projects.length;
  let totalVersions     = 0;
  let totalRefactors    = 0;
  let totalFeatures     = 0;
  let totalStories      = 0;
  let totalPoints       = 0;
  const complexityCounts = { low: 0, medium: 0, high: 0 };
  const techFreq        = {};
  const modeCount       = { new_product: 0, legacy: 0 };
  const projectActivity = []; // { name, versions, features, stories }

  for (const p of projects) {
    const vs = p.versions || [];
    totalVersions  += vs.length;
    totalRefactors += Math.max(0, vs.length - 1); // versions after the first

    const latest = vs[vs.length - 1];
    if (latest) {
      totalFeatures += latest.extracted?.features?.length || 0;
      totalStories  += latest.extracted?.story_count    || 0;
      totalPoints   += latest.extracted?.total_points   || 0;

      const cx = latest.extracted?.complexity || 'medium';
      if (cx in complexityCounts) complexityCounts[cx]++;

      for (const t of latest.extracted?.tech_stack_flat || []) {
        techFreq[t] = (techFreq[t] || 0) + 1;
      }

      if (latest.forge_mode === 'legacy') modeCount.legacy++;
      else modeCount.new_product++;
    }

    projectActivity.push({
      name: p.name,
      versions: vs.length,
      features: latest?.extracted?.features?.length || 0,
      stories:  latest?.extracted?.story_count    || 0,
    });
  }

  // Top 10 tech by frequency
  const topTech = Object.entries(techFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Time estimates
  // Forge: ~3 min per version run
  const totalForgeMinutes = totalVersions * 3;
  // Manual equivalent: 8h PRD + 6h arch + 4h techspec + 1h/story = 18h base + stories per project
  const manualHours = projects.reduce((sum, p) => {
    const latest = p.versions?.[p.versions.length - 1];
    const stories = latest?.extracted?.story_count || 0;
    return sum + 18 + stories;
  }, 0);
  const timeSavedHours = Math.max(0, manualHours - totalForgeMinutes / 60);

  return {
    totalProjects, totalVersions, totalRefactors,
    totalFeatures, totalStories, totalPoints,
    complexityCounts, topTech, modeCount,
    totalForgeMinutes, timeSavedHours,
    projectActivity: projectActivity.sort((a, b) => b.versions - a.versions).slice(0, 5),
  };
}

function StatCard({ icon: Icon, label, value, sub, color = '#8B5CF6', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '18', border: `1px solid ${color}35` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value ?? '—'}</div>
      <div className="text-xs font-semibold text-slate-300 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

function ComplexityBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400 capitalize">{label}</span>
        <span style={{ color }} className="font-semibold">{count}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}

function formatTime(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function GlobalInsightsDashboard({ projects }) {
  if (!projects?.length) {
    return (
      <div className="text-center py-16 text-slate-600 text-sm">
        No projects yet — forge a product to see insights.
      </div>
    );
  }

  const s = computeGlobalStats(projects);
  const totalComplexity = s.complexityCounts.low + s.complexityCounts.medium + s.complexityCounts.high;

  return (
    <div className="space-y-6">
      {/* Headline stats — row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={FolderOpen}   label="Projects Created"   value={s.totalProjects}   color="#8B5CF6"  delay={0}    sub={`${s.modeCount.new_product} new · ${s.modeCount.legacy} legacy`} />
        <StatCard icon={GitBranch}    label="Total Versions"     value={s.totalVersions}   color="#C2B0F6"  delay={0.05} sub="across all projects" />
        <StatCard icon={RefreshCw}    label="Refactors"          value={s.totalRefactors}  color="#6366F1"  delay={0.1}  sub="versions after v1" />
        <StatCard icon={Star}         label="Features Generated" value={s.totalFeatures}   color="#F5A83E"  delay={0.15} sub="across all projects" />
      </div>

      {/* Headline stats — row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label="Total Stories"     value={s.totalStories}         color="#F59E0B"  delay={0.2}  sub={`${s.totalPoints} story points`} />
        <StatCard icon={Zap}          label="Forge Time"        value={formatTime(s.totalForgeMinutes)} color="#EC4899"  delay={0.25} sub={`~3 min per forge`} />
        <StatCard icon={Clock}        label="Time Saved (est.)" value={`~${Math.round(s.timeSavedHours)}h`} color="#10B981" delay={0.3}  sub="vs manual spec writing" />
        <StatCard icon={TrendingUp}   label="Efficiency"        value={s.timeSavedHours > 0 ? `${Math.round(s.timeSavedHours / (s.totalForgeMinutes / 60))}×` : '—'} color="#F5A83E" delay={0.35} sub="time saved vs time spent" />
      </div>

      {/* Complexity + Mode split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-forge-whisper" />
            <span className="text-sm font-semibold text-white">Project Complexity</span>
          </div>
          <div className="space-y-3">
            <ComplexityBar label="High"   count={s.complexityCounts.high}   total={totalComplexity} color="#EF4444" />
            <ComplexityBar label="Medium" count={s.complexityCounts.medium} total={totalComplexity} color="#F5A83E" />
            <ComplexityBar label="Low"    count={s.complexityCounts.low}    total={totalComplexity} color="#10B981" />
          </div>
        </motion.div>

        {/* Most active projects */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-forge-purple" />
            <span className="text-sm font-semibold text-white">Most Active Projects</span>
          </div>
          <div className="space-y-2.5">
            {s.projectActivity.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-600 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-300 truncate">{p.name}</div>
                  <div className="text-xs text-slate-600">{p.features} features · {p.stories} stories</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-forge-purple font-semibold flex-shrink-0">
                  <GitBranch className="w-3 h-3" />{p.versions}v
                </div>
              </div>
            ))}
            {s.projectActivity.length === 0 && (
              <div className="text-xs text-slate-600">No projects yet</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Top technologies */}
      {s.topTech.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-4 h-4 text-forge-amber" />
            <span className="text-sm font-semibold text-white">Most Used Technologies</span>
            <span className="text-xs text-slate-500 ml-1">across all projects</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {s.topTech.map(({ name, count }, i) => {
              const maxCount = s.topTech[0]?.count || 1;
              const opacity  = 0.4 + (count / maxCount) * 0.6;
              return (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-full border border-forge-amber/30 text-forge-amber"
                  style={{ background: `rgba(245,168,62,${opacity * 0.12})`, opacity: 0.5 + opacity * 0.5 }}
                >
                  {name}
                  {count > 1 && <span className="ml-1 opacity-60">×{count}</span>}
                </span>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Time breakdown */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-4 h-4 text-forge-whisper" />
          <span className="text-sm font-semibold text-white">Time Analysis</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">Total Forge Time</div>
            <div className="text-xl font-black text-forge-purple">{formatTime(s.totalForgeMinutes)}</div>
            <div className="text-xs text-slate-600">{s.totalVersions} forge runs × ~3 min</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-500">Manual Equivalent</div>
            <div className="text-xl font-black text-red-400">~{Math.round(s.timeSavedHours + s.totalForgeMinutes / 60)}h</div>
            <div className="text-xs text-slate-600">PRD + Arch + Spec + Stories</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-500">Net Time Saved</div>
            <div className="text-xl font-black text-green-400">~{Math.round(s.timeSavedHours)}h</div>
            <div className="text-xs text-slate-600">returned to building</div>
          </div>
        </div>
        {/* Visual ratio bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>Forge time</span><span>Manual time</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <motion.div
              className="h-full bg-forge-purple rounded-l-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((s.totalForgeMinutes / 60) / ((s.timeSavedHours + s.totalForgeMinutes / 60) || 1) * 100, 30)}%` }}
              transition={{ duration: 0.8 }}
            />
            <motion.div
              className="h-full bg-green-500/50"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(70, (s.timeSavedHours / (s.timeSavedHours + s.totalForgeMinutes / 60 || 1)) * 100)}%` }}
              transition={{ duration: 0.8, delay: 0.1 }}
            />
          </div>
          <div className="flex gap-3 mt-1.5 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-forge-purple inline-block" />Forge</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500/50 inline-block" />Saved</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
