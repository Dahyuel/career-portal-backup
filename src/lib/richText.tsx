import React from 'react';

/**
 * Renders editable landing page text. `[[words]]` get the accent class, `**words**` are bold.
 * Output is React text, so nothing typed by an admin is ever treated as HTML.
 */
export const renderRich = (text: string, accentClass = 'text-red-500'): React.ReactNode[] =>
  (text || '')
    .split(/(\[\[[^\]]+\]\]|\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        return <span key={i} className={accentClass}>{part.slice(2, -2)}</span>;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });

/** Non-empty lines only. */
export const cleanLines = (lines: string[] | undefined): string[] => (lines ?? []).map((l) => l.trim()).filter(Boolean);
