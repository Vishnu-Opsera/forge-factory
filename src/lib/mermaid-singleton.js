// Mermaid v11 must be initialized ONCE globally.
// Re-calling initialize() corrupts the theme state.

let _mermaid = null;
let _initialized = false;
let _renderCount = 0;

export async function getMermaid() {
  if (!_mermaid) {
    const mod = await import('mermaid');
    _mermaid = mod.default;
  }
  if (!_initialized) {
    _mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
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
      flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis', padding: 20 },
    });
    _initialized = true;
  }
  return _mermaid;
}

/** Strip markdown fences and normalize line endings */
export function sanitizeDiagram(raw) {
  if (!raw) return '';
  let d = raw
    .replace(/```mermaid\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/\r\n/g, '\n')
    .trim();

  // Some Claude outputs use 'graph' instead of 'flowchart' — both are fine, but normalize spaces
  // Remove any leading/trailing blank lines inside the diagram
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
