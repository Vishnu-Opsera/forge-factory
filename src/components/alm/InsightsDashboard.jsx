import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus as MinusIcon,
  Clock, CheckCircle2, Layers, Star, Zap, Target, BarChart3, AlertTriangle,
} from 'lucide-react';

// ── Tiny inline SVG bar chart ─────────────────────────────────────────────────
function BarChart({ data, valueKey, labelKey, color = '#8B5CF6', secondaryKey, secondaryColor = '#EF4444' }) {
  const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full relative flex items-end" style={{ height: '60px' }}>
            <div className="w-full rounded-t-sm" style={{ height: `${Math.max(4, (d[valueKey] / maxVal) * 60)}px`, background: color, opacity: 0.9 }} />
            {secondaryKey && d[secondaryKey] > 0 && (
              <div className="absolute bottom-0 left-0 right-0 rounded-t-sm" style={{ height: `${(d[secondaryKey] / maxVal) * 60}px`, background: secondaryColor, opacity: 0.6 }} />
            )}
          </div>
          <div className="text-xs text-slate-600 font-mono truncate w-full text-center" title={d[labelKey]}>
            {d[labelKey]?.replace(/^v/, '')}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────
function Sparkline({ data, valueKey, color = '#F5A83E' }) {
  if (data.length < 2) return <div className="text-xs text-slate-700">Need 2+ versions for trend</div>;
  const vals = data.map(d => d[valueKey] || 0);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals);
  const W = 120, H = 30;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / (max - min || 1)) * H}`).join(' ');
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {vals.map((v, i) => (
        <circle key={i} cx={(i / (vals.length - 1)) * W} cy={H - ((v - min) / (max - min || 1)) * H} r="3" fill={color} />
      ))}
    </svg>
  );
}

// ── Donut ─────────────────────────────────────────────────────────────────────
function Donut({ value, max, color, label }) {
  const pct = max > 0 ? value / max : 0;
  const r = 28, C = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#1e2a4a" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${pct * C} ${C}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-lg font-black" style={{ color }}>
          {Math.round(pct * 100)}%
        </div>
      </div>
      <div className="text-xs text-slate-500 text-center leading-tight">{label}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, trend, color = '#8B5CF6' }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : MinusIcon;
  const trendColor = trend === 'up' ? '#F5A83E' : trend === 'down' ? '#EF4444' : '#94A3B8';
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '15', border: `1px solid ${color}30` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {trend && <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />}
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value ?? '—'}</div>
      <div className="text-xs font-semibold text-slate-300 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function InsightsDashboard({ insights, versions }) {
  if (!insights) return <div className="text-center py-10 text-slate-600">No data yet. Forge a product to see insights.</div>;

  const {
    featureVelocity, storyCompletion, timeToPR, avgTimeToPR,
    archEvolution, totalFeatures, totalStories, completedStories, inProgressStories,
    notDevelopedStories, removedStories, latestPoints,
  } = insights;

  const completionRate = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0;
  const latestCompletion = storyCompletion[storyCompletion.length - 1];
  const prevCompletion = storyCompletion[storyCompletion.length - 2];
  const completionTrend = prevCompletion ? (latestCompletion?.rate > prevCompletion?.rate ? 'up' : 'down') : null;

  const latestVelocity = featureVelocity[featureVelocity.length - 1];
  const prevVelocity = featureVelocity[featureVelocity.length - 2];
  const velocityTrend = prevVelocity ? (latestVelocity?.added >= prevVelocity?.added ? 'up' : 'down') : null;

  return (
    <div className="space-y-6">
      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Star} label="Total Features" value={totalFeatures} color="#8B5CF6" />
        <StatCard icon={CheckCircle2} label="Stories Done" value={completedStories} sub={`of ${totalStories} total`} trend={completionTrend} color="#F5A83E" />
        <StatCard icon={Clock} label="Avg Time to PR" value={avgTimeToPR ? `${avgTimeToPR}h` : '—'} sub={timeToPR.length ? `${timeToPR.length} PRs tracked` : 'No PRs linked'} color="#C2B0F6" />
        <StatCard icon={Target} label="Story Points" value={latestPoints} color="#F59E0B" />
      </div>

      {/* Feature velocity + Story completion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Feature velocity */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-forge-purple" />
              <span className="text-sm font-semibold text-white">Feature Velocity</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-sm bg-forge-purple" />Added
              <span className="w-2 h-2 rounded-sm bg-red-500/60" />Removed
            </div>
          </div>
          {featureVelocity.length > 0 ? (
            <BarChart data={featureVelocity} valueKey="added" labelKey="semver" color="#8B5CF6" secondaryKey="removed" secondaryColor="#EF4444" />
          ) : (
            <div className="text-xs text-slate-700 py-4 text-center">No data</div>
          )}
        </div>

        {/* Story completion rate */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-forge-amber" />
            <span className="text-sm font-semibold text-white">Story Completion</span>
          </div>
          <div className="flex items-center gap-6">
            <Donut value={completedStories} max={totalStories} color="#F5A83E" label="Completed" />
            <Donut value={inProgressStories} max={totalStories} color="#F59E0B" label="In Progress" />
            <Donut value={notDevelopedStories.length} max={totalStories} color="#475569" label="Backlog" />
          </div>
          {storyCompletion.length > 1 && (
            <div className="mt-4">
              <div className="text-xs text-slate-500 mb-1">Completion rate over time</div>
              <Sparkline data={storyCompletion} valueKey="rate" color="#F5A83E" />
            </div>
          )}
        </div>
      </div>

      {/* Architecture evolution */}
      {archEvolution.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-forge-whisper" />
            <span className="text-sm font-semibold text-white">Architecture Evolution</span>
          </div>
          <div className="space-y-3">
            {archEvolution.map((ev, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="text-xs font-mono font-bold text-forge-whisper bg-forge-whisper/10 border border-forge-whisper/20 px-2 py-0.5 rounded flex-shrink-0">
                  v{ev.semver}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ev.tech_added.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full text-[#F5A83E] border border-[#F5A83E]/30 bg-[#F5A83E]/10">+ {t}</span>
                  ))}
                  {ev.tech_removed.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full text-red-400 border border-red-400/30 bg-red-400/10">− {t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time to PR per version */}
      {timeToPR.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-forge-amber" />
            <span className="text-sm font-semibold text-white">Time to PR by Version</span>
          </div>
          <div className="space-y-2">
            {timeToPR.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500 w-12">v{t.semver}</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((t.hours / 48) * 100, 100)}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                  />
                </div>
                <span className="text-xs text-forge-amber font-semibold w-14 text-right">{t.hours}h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not-developed stories warning */}
      {notDevelopedStories.length > 0 && (
        <div className="glass-card p-5 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-forge-amber" />
            <span className="text-sm font-semibold text-white">{notDevelopedStories.length} Stories Not Yet Developed</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notDevelopedStories.map((s, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b border-slate-800/60 last:border-0">
                <div className="w-1 h-full rounded-full flex-shrink-0 mt-1" style={{ background: s.epic_color || '#8B5CF6', width: '3px', minHeight: '16px' }} />
                <div>
                  <span className="text-xs font-mono text-slate-600 mr-2">{s.id}</span>
                  <span className="text-sm text-slate-300">{s.title}</span>
                  <span className="text-xs text-slate-600 ml-2">v{s.version_semver}</span>
                </div>
                <span className="ml-auto text-xs text-slate-600 flex-shrink-0 flex items-center gap-0.5">
                  <Star className="w-3 h-3" />{s.story_points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed stories */}
      {removedStories.length > 0 && (
        <div className="glass-card p-5 border border-red-500/10">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-white">{removedStories.length} Removed Stories</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {removedStories.map((s, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full border border-red-500/20 text-red-400/70 bg-red-500/5 line-through">
                {s.title.slice(0, 40)}{s.title.length > 40 ? '…' : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
