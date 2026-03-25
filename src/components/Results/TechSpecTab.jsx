import { useMemo } from 'react';
import { marked } from 'marked';
import { motion } from 'framer-motion';

marked.setOptions({ breaks: true, gfm: true });

export default function TechSpecTab({ data }) {
  const html = useMemo(() => {
    if (!data) return null;
    return marked.parse(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  }, [data]);

  if (!data) {
    return <div className="glass-card p-8 text-center text-slate-600">No tech spec generated.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8 prose-techspec"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
