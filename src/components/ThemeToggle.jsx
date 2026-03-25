import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getTheme, setTheme } from '../store/themeStore.js';

export default function ThemeToggle() {
  const [theme, setLocal] = useState(() => getTheme());

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setLocal(next);
  };

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200
        border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--accent-primary)]
        text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
    >
      {theme === 'dark'
        ? <Sun className="w-3.5 h-3.5" />
        : <Moon className="w-3.5 h-3.5" />}
    </button>
  );
}
