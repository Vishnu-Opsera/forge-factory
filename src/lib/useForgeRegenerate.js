import { useState, useRef, useEffect } from 'react';

/**
 * Streams a cascading regeneration via /api/forge.
 * Omits stopAfter so all downstream agents run after the target.
 *
 * @param {object} opts
 * @param {object} opts.forgeData  - current full forge results
 * @param {string} opts.input      - original user input
 */
export function useForgeRegenerate({ forgeData, input }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [streamText, setStreamText]   = useState('');
  const [result, setResult]           = useState(null); // full forge data on completion
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  /**
   * @param {string|null} target  - null = full forge, or 'architecture'|'techspec'|'tasks'
   * @param {string}      feedback
   */
  const regenerate = async (target, feedback) => {
    if (!feedback?.trim()) return;
    abortRef.current?.abort();

    setIsStreaming(true);
    setActiveAgent(null);
    setStreamText('');
    setResult(null);

    const intentRaw = forgeData?.intent;
    const archRaw   = forgeData?.architecture;

    const previousResults = {
      intent: typeof intentRaw === 'string'
        ? intentRaw
        : (intentRaw && Object.keys(intentRaw).length) ? JSON.stringify(intentRaw) : '',
      architecture: typeof archRaw === 'string'
        ? archRaw
        : (archRaw && Object.keys(archRaw).length) ? JSON.stringify(archRaw) : '',
      prd:      forgeData?.prd      || '',
      techspec: forgeData?.techspec || '',
    };

    const resolvedInput = input
      || (typeof intentRaw === 'object' ? intentRaw?.concept : null)
      || forgeData?.prd?.slice(0, 200)
      || '';

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          input:      resolvedInput,
          mode:       forgeData?.mode || 'new_product',
          resumeFrom: target || undefined, // undefined = full forge
          previousResults,
          feedback,
          // NO stopAfter — cascade runs all downstream agents
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === 'agent_start') setActiveAgent(ev.agent);
            if (ev.type === 'agent_text')  setStreamText(t => t + ev.text);
            if (ev.type === 'results')     setResult(ev.data);
          } catch { /* ignore malformed SSE lines */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('[useForgeRegenerate]', err.message);
    } finally {
      setIsStreaming(false);
      setActiveAgent(null);
    }
  };

  const cancel = () => abortRef.current?.abort();

  return { regenerate, cancel, isStreaming, activeAgent, streamText, result };
}
