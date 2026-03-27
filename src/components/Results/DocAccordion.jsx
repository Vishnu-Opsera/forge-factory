import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

/** Split markdown into sections by ## headings */
function parseSections(raw) {
  const sections = [];
  let title = '';
  let current = null;

  for (const line of raw.split('\n')) {
    if (line.startsWith('# ') && !title) {
      title = line.replace(/^# /, '').trim();
    } else if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^## /, '').trim(), lines: [] };
    } else {
      if (current) current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  return { title, sections };
}

/** Pull a short preview sentence from section body */
function preview(lines) {
  const text = lines.join(' ').replace(/[#*`>|_[\]()]/g, '').trim();
  const sentence = text.split(/[.\n]/)[0].trim();
  return sentence.length > 90 ? sentence.slice(0, 90) + '…' : sentence;
}

function Section({ section, index, isOpen, onToggle, accentColor }) {
  const html = useMemo(() => marked.parse(section.lines.join('\n')), [section.lines]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="glass-card overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: accentColor + '20', border: `1px solid ${accentColor}40`, color: accentColor }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm">{section.heading}</div>
          {!isOpen && (
            <div className="text-xs text-slate-500 truncate mt-0.5">{preview(section.lines)}</div>
          )}
        </div>
        {isOpen
          ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
        }
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 pb-5 pt-1 border-t border-slate-800/50">
              <div className="doc-section" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DocAccordion({ content, accentColor = '#F5A83E' }) {
  const { title, sections } = useMemo(() => parseSections(content || ''), [content]);
  const [openIndex, setOpenIndex] = useState(0);

  if (!content) return null;

  if (!sections.length) {
    return (
      <div className="glass-card p-6">
        <div className="doc-section" dangerouslySetInnerHTML={{ __html: marked.parse(content) }} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {title && (
        <div className="px-1 pb-1">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{sections.length} sections</p>
        </div>
      )}
      {sections.map((section, i) => (
        <Section
          key={i}
          section={section}
          index={i}
          isOpen={openIndex === i}
          onToggle={() => setOpenIndex(prev => prev === i ? null : i)}
          accentColor={accentColor}
        />
      ))}
    </div>
  );
}
