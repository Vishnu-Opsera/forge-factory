import { motion } from 'framer-motion';
import { Code2, Cpu } from 'lucide-react';
import DocAccordion from './DocAccordion.jsx';

export default function TechSpecTab({ data }) {
  if (!data) {
    return <div className="glass-card p-8 text-center text-slate-600">No tech spec generated.</div>;
  }

  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="glass-card px-5 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <Code2 className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-white text-sm">Technical Specification</div>
          <div className="text-xs text-slate-500">Implementation-ready technical blueprint</div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
          <Cpu className="w-3 h-3" />
          Engineering Spec
        </div>
      </div>

      <DocAccordion content={content} accentColor="#6366F1" />
    </motion.div>
  );
}
