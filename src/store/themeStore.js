const KEY = 'forge_theme';

export function getTheme() {
  return localStorage.getItem(KEY) || 'dark';
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  // Also set class for Tailwind dark: variants
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

// Call on app init
export function initTheme() {
  applyTheme(getTheme());
}
