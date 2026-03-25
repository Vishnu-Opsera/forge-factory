import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getSession, clearSession } from '../store/authStore.js';

/* ── Cute neutral face SVG — shown when not logged in ───────────────── */
function GuestFace({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="20" fill="url(#guestGrad)" />
      {/* head */}
      <circle cx="20" cy="18" r="9" fill="rgba(255,255,255,0.18)" />
      {/* left eye */}
      <circle cx="17" cy="16.5" r="1.4" fill="white" fillOpacity="0.88" />
      {/* right eye */}
      <circle cx="23" cy="16.5" r="1.4" fill="white" fillOpacity="0.88" />
      {/* neutral mouth — slight curve */}
      <path
        d="M16.5 20.5 Q20 22 23.5 20.5"
        stroke="white"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
        strokeOpacity="0.75"
      />
      {/* shoulders */}
      <ellipse cx="20" cy="32" rx="9" ry="6" fill="rgba(255,255,255,0.12)" />
      <defs>
        <linearGradient id="guestGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent-primary)" />
          <stop offset="1" stopColor="var(--accent-primary-dim)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Logged-in avatar with initials ─────────────────────────────────── */
function UserAvatar({ name, size = 32 }) {
  const initials = name
    ? name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '?';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="20" fill="url(#userGrad)" />
      {/* ring */}
      <circle cx="20" cy="20" r="18" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />
      {/* initials */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size * 0.38}
        fontFamily="'Source Sans 3', system-ui, sans-serif"
        fontWeight="600"
        fill="white"
        fillOpacity="0.95"
        letterSpacing="-0.5"
      >
        {initials}
      </text>
      <defs>
        <linearGradient id="userGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent-primary)" />
          <stop offset="1" stopColor="var(--accent-secondary)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function ProfileMenu() {
  const { t } = useTranslation();
  const [session, setSession] = useState(() => getSession());
  const [open, setOpen]       = useState(false);
  const ref                   = useRef(null);

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    const refresh = () => setSession(getSession());
    window.addEventListener('forge:login',  refresh);
    window.addEventListener('forge:logout', refresh);
    return () => {
      window.removeEventListener('forge:login',  refresh);
      window.removeEventListener('forge:logout', refresh);
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setOpen(false);
    window.dispatchEvent(new CustomEvent('forge:logout'));
  };

  /* ── Not logged in ── */
  if (!session) {
    return (
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('forge:show-auth'))}
        title={t('common.signIn')}
        className="group flex items-center gap-2 pl-1 pr-3 py-1 rounded-full
          border border-[var(--border-default)]
          bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]
          hover:border-[var(--accent-primary)]/40
          transition-all duration-200 shadow-sm"
      >
        <GuestFace size={26} />
        <span className="text-xs font-medium text-[var(--text-muted)]
          group-hover:text-[var(--accent-primary)] transition-colors hidden sm:block">
          {t('common.signIn')}
        </span>
      </button>
    );
  }

  /* ── Logged in ── */
  return (
    <div ref={ref} className="relative z-50">
      {/* Trigger pill */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full
          border border-[var(--border-default)]
          bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]
          hover:border-[var(--accent-primary)]/40
          transition-all duration-200 shadow-sm"
      >
        <UserAvatar size={26} name={session.name} />
        <span className="hidden sm:block text-xs font-medium text-[var(--text-secondary)] max-w-[88px] truncate">
          {session.name.split(' ')[0]}
        </span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          className="text-[var(--text-subtle)]"
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </motion.svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1   }}
            exit={{   opacity: 0, y: -6,  scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2.5 w-60
              rounded-2xl border border-[var(--border-default)]
              bg-[var(--bg-surface)]
              shadow-[0_12px_40px_rgba(0,0,0,0.22),0_2px_8px_rgba(0,0,0,0.12)]
              overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-[var(--border-subtle)]
              bg-gradient-to-br from-[var(--accent-primary)]/06 to-transparent">
              <UserAvatar size={42} name={session.name} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {session.name}
                </div>
                <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                  {session.email}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full
                  bg-[var(--accent-primary)]/12 border border-[var(--accent-primary)]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-forge-amber animate-pulse" />
                  <span className="text-[10px] font-medium text-[var(--accent-primary)]">{t('common.active')}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-1.5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm
                  text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/08
                  transition-all duration-150 group"
              >
                <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center
                  group-hover:bg-red-500/15 transition-colors">
                  <LogOut className="w-3 h-3 text-red-400" />
                </div>
                {t('common.signOut')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
