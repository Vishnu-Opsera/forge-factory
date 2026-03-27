// Mermaid v11 must be initialized ONCE per theme.
// Re-detect theme on each render call.

let _mermaid = null;
let _initializedTheme = null;
let _renderCount = 0;

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

const THEME_CONFIG = {
  dark: {
    theme: 'dark',
    themeVariables: {
      darkMode: true,
      background: '#030712',
      mainBkg: '#0d1224',
      primaryColor: '#1e1b4b',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#6D28D9',
      lineColor: '#475569',
      secondaryColor: '#0f172a',
      tertiaryColor: '#0a0f1e',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px',
      nodeBorder: '#6D28D9',
      clusterBkg: '#0f172a',
      titleColor: '#a78bfa',
      edgeLabelBackground: '#0d1224',
      nodeTextColor: '#e2e8f0',
      labelTextColor: '#e2e8f0',
      fillType0: '#1e1b4b',
      fillType1: '#0f172a',
    },
  },
  light: {
    theme: 'base',
    themeVariables: {
      darkMode: false,
      background: '#FAFAFF',
      mainBkg: '#EDE8FF',
      primaryColor: '#E8E0FF',
      primaryTextColor: '#1A1025',
      primaryBorderColor: '#8B5CF6',
      lineColor: '#7C3AED',
      secondaryColor: '#F4F0FF',
      tertiaryColor: '#F9F7FF',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px',
      nodeBorder: '#8B5CF6',
      clusterBkg: '#F4F0FF',
      titleColor: '#6D28D9',
      edgeLabelBackground: '#FAFAFF',
      nodeTextColor: '#1A1025',
      labelTextColor: '#1A1025',
      fillType0: '#EDE8FF',
      fillType1: '#F4F0FF',
    },
  },
};

export async function getMermaid() {
  if (!_mermaid) {
    const mod = await import('mermaid');
    _mermaid = mod.default;
  }
  const theme = getCurrentTheme();
  if (_initializedTheme !== theme) {
    _mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis', padding: 20 },
      ...THEME_CONFIG[theme],
    });
    _initializedTheme = theme;
  }
  return _mermaid;
}

/** Strip markdown fences and normalize line endings */
export function sanitizeDiagram(raw) {
  if (!raw) return '';
  let d = raw
    .replace(/```mermaid\s*/gi, '')
    .replace(/```\s*/g, '')
    // Unescape literal \n sequences that Claude puts in JSON strings
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '  ')
    .replace(/\r\n/g, '\n')
    .trim();

  // Remove any excessive blank lines inside the diagram
  d = d.replace(/\n{3,}/g, '\n\n');

  // Ensure it starts with a valid directive
  if (!/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline|architecture|block|xychart|quadrant)/i.test(d)) {
    d = 'flowchart TD\n' + d;
  }
  return d;
}

/** Returns a globally-unique render ID that is a valid HTML element id */
export function nextRenderId() {
  return `mgr-${Date.now()}-${++_renderCount}`;
}
