/**
 * Converts text content (markdown or plain/JSON) to a PDF Buffer using pdfkit.
 * markdown       → parsed headings, paragraphs, lists, code blocks
 * text/plain     → formatted as-is (monospace body for JSON) — or structured if architecture shape detected
 * architecture   → structured layout matching the UI (diagram source, tech stack, decisions, meta)
 */
import PDFDocument from 'pdfkit';
import { marked, type Token, type Tokens } from 'marked';

// ─── Palette (light — PDF has white background) ───────────────────────────────
const C = {
  // Text
  title:    '#1e1b4b',  // deep indigo — strong on white
  heading:  '#312e81',  // indigo-800
  body:     '#1e293b',  // slate-800
  muted:    '#64748b',  // slate-500
  faint:    '#94a3b8',  // slate-400
  // Card
  cardBg:   '#f8fafc',  // slate-50
  cardBord: '#e2e8f0',  // slate-200
  // Accent
  purple:   '#7c3aed',  // violet-600
  purpleL:  '#6d28d9',  // violet-700
  amber:    '#d97706',  // amber-600
  // Category colours (dark enough on white)
  frontend:    '#7c3aed',
  backend:     '#0284c7',
  database:    '#d97706',
  infra:       '#ea580c',
  ai_ml:       '#db2777',
  payments:    '#e11d48',
  third_party: '#4338ca',
};

const FONTS = {
  regular: 'Helvetica',
  bold:    'Helvetica-Bold',
  mono:    'Courier',
};

// ─── Markdown renderer helpers ────────────────────────────────────────────────
const LIGHT_C = {
  h1: '#1a1a2e', h2: '#16213e', h3: '#0f3460',
  body: '#2c2c2c', code: '#374151', codeBg: '#f3f4f6', muted: '#6b7280',
};

function renderTokens(doc: InstanceType<typeof PDFDocument>, tokens: Token[], indent = 0): void {
  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const t = token as Tokens.Heading;
        const sizes: Record<number, number> = { 1: 20, 2: 16, 3: 13, 4: 12, 5: 11, 6: 11 };
        const size = sizes[t.depth] ?? 12;
        doc.moveDown(t.depth === 1 ? 0.8 : 0.5);
        doc.font(FONTS.bold).fontSize(size)
          .fillColor(t.depth === 1 ? LIGHT_C.h1 : t.depth === 2 ? LIGHT_C.h2 : LIGHT_C.h3);
        doc.text(t.text.replace(/\*\*/g, '').replace(/\*/g, ''), { continued: false });
        doc.moveDown(0.2);
        break;
      }
      case 'paragraph': {
        const t = token as Tokens.Paragraph;
        const clean = t.text
          .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
          .replace(/`(.+?)`/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1');
        doc.font(FONTS.regular).fontSize(10).fillColor(LIGHT_C.body);
        doc.text(clean, { align: 'left', lineGap: 2 });
        doc.moveDown(0.4);
        break;
      }
      case 'list': {
        const t = token as Tokens.List;
        for (let i = 0; i < t.items.length; i++) {
          const item = t.items[i];
          const bullet = t.ordered ? `${i + 1}.` : '•';
          const itemText = item.text
            .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
            .replace(/`(.+?)`/g, '$1');
          doc.font(FONTS.regular).fontSize(10).fillColor(LIGHT_C.body);
          doc.text(`${bullet}  ${itemText}`, { indent: indent + 16, lineGap: 2 });
          if (item.tokens?.length) {
            const nested = item.tokens.filter((t: Token) => t.type !== 'text' && t.type !== 'paragraph');
            if (nested.length) renderTokens(doc, nested, indent + 16);
          }
        }
        doc.moveDown(0.4);
        break;
      }
      case 'code': {
        const t = token as Tokens.Code;
        const lines = t.text.split('\n').slice(0, 60);
        doc.moveDown(0.3);
        const startY = doc.y;
        const textH = lines.length * 11 + 12;
        doc.rect(doc.page.margins.left, startY - 4,
          doc.page.width - doc.page.margins.left - doc.page.margins.right, textH)
          .fill(LIGHT_C.codeBg);
        doc.font(FONTS.mono).fontSize(8).fillColor(LIGHT_C.code).text(lines.join('\n'), { lineGap: 1 });
        doc.moveDown(0.4);
        break;
      }
      case 'blockquote': {
        const t = token as Tokens.Blockquote;
        doc.moveDown(0.2);
        doc.font(FONTS.regular).fontSize(10).fillColor(LIGHT_C.muted)
          .text(t.text.replace(/\*\*(.+?)\*\*/g, '$1'), { indent: 24, lineGap: 2 });
        doc.moveDown(0.3);
        break;
      }
      case 'hr':
        doc.moveDown(0.4);
        doc.moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .strokeColor('#d1d5db').lineWidth(0.5).stroke();
        doc.moveDown(0.4);
        break;
      case 'space':
        doc.moveDown(0.3);
        break;
      default:
        break;
    }
  }
}

// ─── Architecture PDF ─────────────────────────────────────────────────────────
interface ArchitectureData {
  style?: string;
  mermaid?: string;
  tech_stack?: Record<string, string[]>;
  key_decisions?: Array<{ title?: string; choice?: string; rationale?: string }>;
  api_design?: string;
  deployment?: string;
  estimated_cost?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  frontend: C.frontend, backend: C.backend, database: C.database,
  infrastructure: C.infra, ai_ml: C.ai_ml, payments: C.payments,
  third_party: C.third_party,
};

function categoryColor(key: string): string {
  return CATEGORY_COLORS[key] ?? C.purple;
}

function categoryLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Draw a filled rounded rect background (no built-in borderRadius in pdfkit, use rect). */
function cardRect(doc: InstanceType<typeof PDFDocument>, x: number, y: number, w: number, h: number, fill: string, stroke?: string) {
  doc.rect(x, y, w, h).fill(fill);
  if (stroke) {
    doc.rect(x, y, w, h).strokeColor(stroke).lineWidth(0.5).stroke();
  }
}

export function architectureToPdfBuffer(arch: ArchitectureData, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4', autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = doc.page.margins.left;
    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ── Cover header ──────────────────────────────────────────────────────────
    doc.font(FONTS.bold).fontSize(24).fillColor(C.title).text(title, L, 48, { width: W });
    doc.moveDown(0.4);
    if (arch.style) {
      const badgeY = doc.y;
      const badgeW = doc.font(FONTS.regular).fontSize(9).widthOfString(arch.style) + 20;
      doc.rect(L, badgeY, badgeW, 18).fill('#ede9fe'); // violet-100
      doc.font(FONTS.regular).fontSize(9).fillColor(C.purple)
        .text(arch.style, L + 10, badgeY + 5, { continued: false });
      doc.y = badgeY + 24;
    }
    doc.moveDown(0.3);
    doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor(C.purple).lineWidth(2).stroke();
    doc.moveDown(0.8);

    // ── System Architecture Diagram ───────────────────────────────────────────
    if (arch.mermaid) {
      doc.font(FONTS.bold).fontSize(12).fillColor(C.heading).text('System Architecture', L);
      doc.moveDown(0.4);

      // Mermaid.live link hint
      doc.font(FONTS.regular).fontSize(8.5).fillColor(C.muted)
        .text('View interactive diagram at: https://mermaid.live', L, doc.y, { link: 'https://mermaid.live', underline: true });
      doc.moveDown(0.4);

      // Code block — dark background so code is readable
      const codeLines = arch.mermaid.split('\n').slice(0, 45);
      const lineH = 9.5;
      const codeH = codeLines.length * lineH + 20;
      const codeY = doc.y;
      doc.rect(L, codeY, W, codeH).fill('#1e293b'); // slate-800
      doc.font(FONTS.mono).fontSize(7.5).fillColor('#93c5fd') // blue-300
        .text(codeLines.join('\n'), L + 12, codeY + 10, { width: W - 24, lineGap: 2, continued: false });
      doc.y = codeY + codeH + 14;

      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor(C.cardBord).lineWidth(0.5).stroke();
      doc.moveDown(0.8);
    }

    // ── Technology Stack ──────────────────────────────────────────────────────
    if (arch.tech_stack && Object.keys(arch.tech_stack).length > 0) {
      doc.font(FONTS.bold).fontSize(12).fillColor(C.heading).text('Technology Stack', L);
      doc.moveDown(0.5);

      const entries = Object.entries(arch.tech_stack).filter(([, v]) => Array.isArray(v) && v.length > 0);
      const colW = (W - 12) / 2;
      let leftY = doc.y;
      let rightY = doc.y;

      for (let i = 0; i < entries.length; i++) {
        const [key, techs] = entries[i];
        const color = categoryColor(key);
        const label = categoryLabel(key);
        const col = i % 2;
        const x = col === 0 ? L : L + colW + 12;
        const cY = col === 0 ? leftY : rightY;

        // Estimate card height
        const estBadgeRows = Math.ceil(techs.length / 3);
        const cardH = 28 + estBadgeRows * 20 + 12;

        if (cY + cardH > doc.page.height - doc.page.margins.bottom - 40) {
          doc.addPage();
          leftY = doc.page.margins.top;
          rightY = doc.page.margins.top;
        }

        const drawY = col === 0 ? leftY : rightY;
        // Card bg with colored left border effect
        doc.rect(x, drawY, colW, cardH).fill(C.cardBg);
        doc.rect(x, drawY, colW, cardH).strokeColor(color + '55').lineWidth(1).stroke();
        doc.rect(x, drawY, 3, cardH).fill(color); // colored left accent bar

        // Category label
        doc.font(FONTS.bold).fontSize(9).fillColor(color)
          .text(label, x + 12, drawY + 10, { continued: false });

        // Tech badges
        let bx = x + 12;
        let by = drawY + 24;
        for (const tech of techs) {
          const bw = doc.font(FONTS.regular).fontSize(8).widthOfString(tech) + 14;
          if (bx + bw > x + colW - 8) { bx = x + 12; by += 18; }
          doc.rect(bx, by, bw, 14).fill('#f1f5f9'); // slate-100
          doc.rect(bx, by, bw, 14).strokeColor('#cbd5e1').lineWidth(0.5).stroke(); // slate-300
          doc.font(FONTS.regular).fontSize(7.5).fillColor(C.muted)
            .text(tech, bx + 7, by + 3.5, { continued: false });
          bx += bw + 5;
        }

        if (col === 0) leftY = drawY + cardH + 8;
        else rightY = drawY + cardH + 8;

        if (col === 1 || i === entries.length - 1) {
          const newY = Math.max(leftY, rightY);
          leftY = newY;
          rightY = newY;
        }
      }

      doc.y = Math.max(leftY, rightY) + 4;
      doc.moveDown(0.4);
      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor(C.cardBord).lineWidth(0.5).stroke();
      doc.moveDown(0.8);
    }

    // ── Architectural Decisions ───────────────────────────────────────────────
    if (arch.key_decisions && arch.key_decisions.length > 0) {
      doc.font(FONTS.bold).fontSize(12).fillColor(C.heading).text('Architectural Decisions', L);
      doc.moveDown(0.5);

      for (let i = 0; i < arch.key_decisions.length; i++) {
        const d = arch.key_decisions[i];
        const decTitle = d.title ?? `Decision ${i + 1}`;
        const choice = d.choice ?? '';
        const rationale = d.rationale ?? '';

        const estH = 22 + (choice ? 14 : 0) + (rationale ? Math.ceil(rationale.length / 95) * 12 : 0) + 12;
        if (doc.y + estH > doc.page.height - doc.page.margins.bottom - 20) doc.addPage();

        const rowY = doc.y;
        // Number circle — filled amber-100, number in amber-700
        doc.circle(L + 11, rowY + 10, 11).fill('#fef3c7'); // amber-100
        doc.font(FONTS.bold).fontSize(8).fillColor(C.amber)
          .text(`${i + 1}`, L + (i + 1 >= 10 ? 5 : 8), rowY + 6, { continued: false });

        const textX = L + 28;
        const textW = W - 28;

        doc.font(FONTS.bold).fontSize(10.5).fillColor(C.body)
          .text(decTitle, textX, rowY, { width: textW });
        if (choice) {
          doc.font(FONTS.regular).fontSize(9).fillColor(C.purple)
            .text(choice, textX, doc.y + 1, { width: textW });
        }
        if (rationale) {
          doc.font(FONTS.regular).fontSize(9).fillColor(C.muted)
            .text(rationale, textX, doc.y + 2, { width: textW, lineGap: 1.5 });
        }
        doc.moveDown(0.7);
      }

      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor(C.cardBord).lineWidth(0.5).stroke();
      doc.moveDown(0.8);
    }

    // ── Meta row (API / Deployment / Cost) ────────────────────────────────────
    const metaItems = [
      arch.api_design     ? { label: 'API Design',  value: arch.api_design,     color: C.purple } : null,
      arch.deployment     ? { label: 'Deployment',  value: arch.deployment,     color: C.purpleL } : null,
      arch.estimated_cost ? { label: 'Est. Cost',   value: arch.estimated_cost, color: C.amber } : null,
    ].filter(Boolean) as Array<{ label: string; value: string; color: string }>;

    if (metaItems.length > 0) {
      if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) doc.addPage();
      const colW2 = (W - (metaItems.length - 1) * 12) / metaItems.length;
      const metaY = doc.y;
      for (let i = 0; i < metaItems.length; i++) {
        const m = metaItems[i];
        const cx = L + i * (colW2 + 12);
        doc.rect(cx, metaY, colW2, 54).fill(C.cardBg);
        doc.rect(cx, metaY, colW2, 54).strokeColor(C.cardBord).lineWidth(0.5).stroke();
        doc.font(FONTS.bold).fontSize(18).fillColor(m.color)
          .text(m.value, cx, metaY + 12, { width: colW2, align: 'center' });
        doc.font(FONTS.regular).fontSize(8).fillColor(C.faint)
          .text(m.label, cx, metaY + 36, { width: colW2, align: 'center' });
      }
    }

    doc.end();
  });
}

// ─── Markdown PDF ─────────────────────────────────────────────────────────────
export function markdownToPdfBuffer(markdown: string, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font(FONTS.bold).fontSize(22).fillColor(LIGHT_C.h1).text(title, { align: 'left' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
      .strokeColor('#6366f1').lineWidth(2).stroke();
    doc.moveDown(0.6);

    try {
      const tokens = marked.lexer(markdown);
      renderTokens(doc, tokens);
    } catch {
      doc.font(FONTS.regular).fontSize(10).fillColor(LIGHT_C.body).text(markdown);
    }

    doc.end();
  });
}

// ─── Plain / JSON PDF ─────────────────────────────────────────────────────────
export function plainTextToPdfBuffer(text: string, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font(FONTS.bold).fontSize(22).fillColor(LIGHT_C.h1).text(title, { align: 'left' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
      .strokeColor('#6366f1').lineWidth(2).stroke();
    doc.moveDown(0.6);

    let content = text;
    try {
      const parsed = JSON.parse(text);
      content = JSON.stringify(parsed, null, 2);
    } catch { /* not JSON — use as-is */ }

    doc.font(FONTS.mono).fontSize(8).fillColor(LIGHT_C.code).text(content, { lineGap: 1 });
    doc.end();
  });
}
