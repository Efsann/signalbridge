import React from "react";
import { normalizeText } from "../lib/normalize";

interface EvidenceHighlighterProps {
  text: string;
  evidencePhrases: string[];
}

/**
 * Safely renders text with exact evidence phrases highlighted in amber/yellow.
 * Preserves all original characters, case, and accents (ə, ı, ö, ü, ç, ş, ğ).
 */
export const EvidenceHighlighter: React.FC<EvidenceHighlighterProps> = ({
  text,
  evidencePhrases,
}) => {
  if (!text) return <span>{text}</span>;
  if (!evidencePhrases || evidencePhrases.length === 0) {
    return <span className="font-mono text-sm leading-relaxed text-slate-800">{text}</span>;
  }

  // Find occurrences of each evidence phrase in text
  const cleanEvidence = evidencePhrases.filter((p) => p && p.trim().length > 0);
  if (cleanEvidence.length === 0) {
    return <span className="font-mono text-sm leading-relaxed text-slate-800">{text}</span>;
  }

  // Build span intervals
  const intervals: Array<{ start: number; end: number; phrase: string }> = [];
  const lowerText = text.toLocaleLowerCase("az");

  for (const phrase of cleanEvidence) {
    const lowerPhrase = phrase.toLocaleLowerCase("az");
    let startIndex = 0;
    while (startIndex < text.length) {
      const idx = lowerText.indexOf(lowerPhrase, startIndex);
      if (idx === -1) break;
      intervals.push({
        start: idx,
        end: idx + phrase.length,
        phrase,
      });
      startIndex = idx + phrase.length;
    }
  }

  if (intervals.length === 0) {
    return <span className="font-mono text-sm leading-relaxed text-slate-800">{text}</span>;
  }

  // Sort and resolve overlaps
  intervals.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const curr of intervals) {
    if (merged.length === 0) {
      merged.push({ start: curr.start, end: curr.end });
    } else {
      const prev = merged[merged.length - 1];
      if (curr.start <= prev.end) {
        prev.end = Math.max(prev.end, curr.end);
      } else {
        merged.push({ start: curr.start, end: curr.end });
      }
    }
  }

  // Construct elements
  const elements: React.ReactNode[] = [];
  let cursor = 0;

  merged.forEach((m, idx) => {
    if (m.start > cursor) {
      elements.push(
        <span key={`text-${idx}`}>{text.slice(cursor, m.start)}</span>
      );
    }
    elements.push(
      <mark
        key={`mark-${idx}`}
        className="bg-amber-100 text-amber-950 font-semibold px-1 py-0.5 rounded border border-amber-300 shadow-xs"
        title="AI Grounded Evidence Phrase"
      >
        {text.slice(m.start, m.end)}
      </mark>
    );
    cursor = m.end;
  });

  if (cursor < text.length) {
    elements.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return (
    <div className="font-mono text-sm leading-relaxed text-slate-800 break-words whitespace-pre-wrap">
      {elements}
    </div>
  );
};
