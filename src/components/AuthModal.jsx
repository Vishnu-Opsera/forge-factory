import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Eye, EyeOff, ArrowRight, User, Lock, Mail, CheckCircle2, Chrome, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { registerUser, loginUser, hasAnyUser } from '../store/authStore.js';

function Field({ label, type, value, onChange, placeholder, autoComplete, icon: Icon, error }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label className="block text-xs text-slate-400 font-medium mb-1.5">{label}</label>
      <div className={`flex items-center gap-2 bg-slate-900/60 border rounded-xl px-3 py-2.5 transition-colors ${error ? 'border-red-500/50' : 'border-slate-700/60 focus-within:border-forge-purple/50'}`}>
        <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] outline-none"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)} className="text-slate-600 hover:text-slate-400 transition-colors">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function LoginForm({ onSuccess, t }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    try {
      const session = loginUser(email, password);
      onSuccess(session);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('auth.email')} type="email" value={email} onChange={setEmail} placeholder={t('auth.emailPlaceholder')} autoComplete="email" icon={Mail} />
      <Field label={t('auth.password')} type="password" value={password} onChange={setPassword} placeholder={t('auth.passwordPlaceholder')} autoComplete="current-password" icon={Lock} />
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-semibold"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <><ArrowRight className="w-4 h-4" />{t('auth.loginButton')}</>
        )}
      </button>
    </form>
  );
}

function RegisterForm({ onSuccess, t }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const session = registerUser(name, email, password);
      onSuccess(session);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('auth.name')} type="text" value={name} onChange={setName} placeholder={t('auth.namePlaceholder')} autoComplete="name" icon={User} />
      <Field label={t('auth.email')} type="email" value={email} onChange={setEmail} placeholder={t('auth.emailPlaceholder')} autoComplete="email" icon={Mail} />
      <Field label={t('auth.password')} type="password" value={password} onChange={setPassword} placeholder={t('auth.passwordPlaceholder')} autoComplete="new-password" icon={Lock} />
      <Field label={t('auth.confirmPassword')} type="password" value={confirm} onChange={setConfirm} placeholder={t('auth.passwordPlaceholder')} autoComplete="new-password" icon={Lock} />
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-semibold"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <><ArrowRight className="w-4 h-4" />{t('auth.registerButton')}</>
        )}
      </button>
    </form>
  );
}

export default function AuthModal({ onAuth, onDismiss }) {
  const { t } = useTranslation();
  const alreadyHasUsers = hasAnyUser();
  const [tab, setTab] = useState(alreadyHasUsers ? 'login' : 'register');

  const perks = [
    t('auth.perk1'),
    t('auth.perk2'),
    t('auth.perk3'),
    t('auth.perk4'),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 glass-card overflow-hidden relative"
      >
        {/* Close button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center
              rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]
              text-[var(--text-muted)] hover:text-[var(--text-primary)]
              hover:border-[var(--border-strong)] transition-all duration-150"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {/* Left panel — branding & perks */}
        <div className="bg-gradient-to-br from-forge-purple/20 to-forge-whisper/10 p-8 border-r border-slate-800/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-opsera-plum to-forge-purple flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">FORGE</span>
            </div>

            <div className="mb-2">
              <div className="text-xs text-forge-whisper font-semibold uppercase tracking-wider mb-2">{t('auth.resultsReady')}</div>
              <h2 className="text-2xl font-black text-white leading-tight mb-3">
                {tab === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                {tab === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
              </p>
            </div>
          </div>

          <div className="space-y-3 mt-8">
            {perks.map((perk, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-forge-whisper flex-shrink-0 mt-0.5" />
                <span className="text-xs text-slate-300">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — auth form */}
        <div className="p-8">
          {/* Tabs */}
          <div className="flex glass-card p-1 gap-1 mb-6">
            {[
              { id: 'login', label: t('auth.login') },
              { id: 'register', label: t('auth.register') },
            ].map(tabItem => (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === tabItem.id
                    ? 'bg-forge-purple/80 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tabItem.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === 'login' ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {tab === 'login' ? (
                <LoginForm onSuccess={onAuth} t={t} />
              ) : (
                <RegisterForm onSuccess={onAuth} t={t} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Browser autofill hint */}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
            <Chrome className="w-3.5 h-3.5" />
            <span>{t('auth.autofillHint')}</span>
          </div>

          {/* Switch tab nudge */}
          <div className="mt-4 text-center text-xs text-slate-600">
            {tab === 'login' ? (
              <>{t('auth.switchToRegister')}{' '}
                <button onClick={() => setTab('register')} className="text-forge-purple hover:text-forge-whisper transition-colors">
                  {t('auth.createFree')}
                </button>
              </>
            ) : (
              <>{t('auth.switchToLogin')}{' '}
                <button onClick={() => setTab('login')} className="text-forge-purple hover:text-forge-whisper transition-colors">
                  {t('auth.loginLink')}
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
