'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBr from '@/lib/remarkBr';

// Rendu markdown des réponses du chatbot. Le contenu est généré par le chatbot (Groq) et traité comme non
// fiable : aucun HTML brut n'est rendu (skipHtml), seuls les <br> deviennent des sauts de ligne.

const ACCENT = '#00f5d4';
const BORDURE = 'rgba(0,245,212,0.18)';

const composants: Components = {
  h1: ({ children }) => <h3 className="font-semibold text-base mt-3 mb-1.5" style={{ color: ACCENT }}>{children}</h3>,
  h2: ({ children }) => <h3 className="font-semibold text-base mt-3 mb-1.5" style={{ color: ACCENT }}>{children}</h3>,
  h3: ({ children }) => <h4 className="font-semibold mt-2.5 mb-1" style={{ color: ACCENT }}>{children}</h4>,
  h4: ({ children }) => <h4 className="font-semibold mt-2 mb-1" style={{ color: ACCENT }}>{children}</h4>,
  p: ({ children }) => <p className="my-1.5">{children}</p>,
  strong: ({ children }) => <strong style={{ color: ACCENT, fontWeight: 600 }}>{children}</strong>,
  ul: ({ children }) => <ul className="my-1.5 pl-5 list-disc marker:text-[#00f5d4]">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 pl-5 list-decimal marker:text-[#00f5d4]">{children}</ol>,
  li: ({ children }) => <li className="my-0.5">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="underline" style={{ color: ACCENT }}>{children}</a>
  ),
  code: ({ children }) => (
    <code className="px-1 py-0.5 rounded font-mono text-xs" style={{ background: 'rgba(255,255,255,0.08)' }}>{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 p-3 rounded-lg overflow-x-auto text-xs" style={{ background: 'rgba(0,0,0,0.3)' }}>{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 pl-3 opacity-80" style={{ borderLeft: `2px solid ${BORDURE}` }}>{children}</blockquote>
  ),
  hr: () => <hr className="my-3" style={{ borderColor: BORDURE }} />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="px-2 py-1.5 text-left font-semibold" style={{ color: ACCENT, borderBottom: `1px solid ${BORDURE}` }}>{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1.5 align-top" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{children}</td>
  ),
};

export default function ChatMarkdown({ contenu }: { contenu: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBr]} skipHtml components={composants}>
      {contenu}
    </ReactMarkdown>
  );
}
