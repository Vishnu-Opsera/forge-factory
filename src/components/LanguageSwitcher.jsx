import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { LANGUAGES } from '../i18n/index.js';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const current = LANGUAGES.find(l => l.code === i18n.language) ||
    LANGUAGES.find(l => i18n.language?.startsWith(l.code)) ||
    LANGUAGES[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors btn-secondary py-1.5 px-2.5"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{current.flag} {current.code.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 glass-card min-w-[140px] py-1 shadow-xl">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left hover:bg-white/5 ${
                current.code === lang.code ? 'text-forge-whisper font-semibold' : 'text-slate-400'
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              {lang.label}
              {current.code === lang.code && <span className="ml-auto text-forge-whisper">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
